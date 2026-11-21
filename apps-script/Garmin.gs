/**
 * Garmin Personal API pull (v151, Fred on Nov 17).
 * Lives in the same Apps Script project as Code.gs, as a second file. It does not change the web app,
 * so no redeploy is needed: time triggers run the latest saved code.
 *
 * One time setup:
 *  1. Garmin Connect in a browser: https://connect.garmin.com/app/settings/personalApiToken > Create Key (pick 1 year). Copy it (shown once).
 *  2. Apps Script > Project Settings > Script Properties > Add: GARMIN_KEY_fred = <the key>. Never put the key in this file or in GitHub.
 *     (Will later: GARMIN_KEY_will.)
 *  3. Select garminSetup in the toolbar and Run. Approve the permission prompt (it asks to reach an external site: Garmin).
 *
 * Every day at about 6 AM and 9 PM Toronto (before the 9:40 PM nightly coach) garminSync pulls the last 3 days into:
 *  - Garmin_Daily: one row per athlete and date (resting HR, HRV, sleep, Body Battery, stress, steps)
 *  - Garmin_Activities: one row per activity (type, name, time, distance, heart rate, laps when Garmin gives them)
 *  - Garmin_Raw: the last raw answer of each endpoint, so field names can be checked and the mapping fixed.
 */
const G_BASE = 'https://personal.connectapi.garmin.com';
const G_TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const G_TZ = 'America/Toronto';
const G_DAYS = 3;
const G_TABS = {
  Garmin_Daily: ['athlete', 'date', 'resting_hr', 'hrv_last_night', 'hrv_weekly_avg', 'hrv_status', 'sleep_score', 'sleep_hours', 'deep_min', 'rem_min', 'body_battery_high', 'body_battery_low', 'stress_avg', 'steps', 'updated_at',
    // v188 (Fred, Nov 20: TDEE from Garmin's burn): appended after updated_at so older rows keep their columns
    'kcal_total', 'active_kcal', 'kcal_resting', 'intensity_mod', 'intensity_vig', 'resp_rate', 'sleep_need_min'],
  Garmin_Activities: ['athlete', 'activity_id', 'date', 'start_local', 'type', 'name', 'duration_min', 'distance_km', 'avg_hr', 'max_hr', 'calories', 'laps', 'updated_at',
    // v193 (Fred, Nov 20: heart rate per exercise): the watch heart rate stream in 5 s averages, "t0|v,v,..." (t0 = unix seconds)
    'hr5'],
  Garmin_Raw: ['athlete', 'endpoint', 'fetched_at', 'status', 'json']
};

function garminSetup() {
  // Google's granular consent lets a box be left unchecked; this reopens the permission window for Garmin when it is missing.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://www.googleapis.com/auth/script.external_request', 'https://www.googleapis.com/auth/script.scriptapp']);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  Object.keys(G_TABS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const head = G_TABS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, head.length).setNumberFormat('@');
  });
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'garminSync').forEach(t => ScriptApp.deleteTrigger(t));
  [6, 21].forEach(h => ScriptApp.newTrigger('garminSync').timeBased().atHour(h).nearMinute(5).everyDays(1).inTimezone(G_TZ).create());
  garminSync();
}

function garminSync() {
  const props = PropertiesService.getScriptProperties().getProperties();
  Object.keys(props).filter(k => /^GARMIN_KEY_/.test(k)).forEach(k => {
    const who = k.slice(11).toLowerCase();
    try { gPullAthlete(who, props[k].trim()); }
    catch (err) { gRaw(who, 'sync', 'error', String(err && err.message || err)); }
  });
}

function gToken(who, key) {
  const cache = CacheService.getScriptCache(), ck = 'gtok_' + who;
  const hit = cache.get(ck);
  if (hit) return hit;
  const r = UrlFetchApp.fetch(G_BASE + G_TOKEN_PATH, { method: 'post', headers: { Accept: '*/*', Authorization: 'ApiKey ' + key }, muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('token ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
  const tok = r.getContentText().trim();
  cache.put(ck, tok, 6 * 3600); // tokens last up to 24 h; keep 6 h to stay well inside
  return tok;
}

function gGet(who, tok, path, params) {
  const q = params ? '?' + Object.keys(params).map(p => encodeURIComponent(p) + '=' + encodeURIComponent(params[p])).join('&') : '';
  const r = UrlFetchApp.fetch(G_BASE + path + q, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
  const code = r.getResponseCode(), txt = r.getContentText();
  gRaw(who, path.replace(/\d{4}-\d{2}-\d{2}/g, 'D').replace(/\/\d{6,}/g, '/ID'), code < 300 ? 'ok' : 'error ' + code, txt);
  if (code >= 300) return null;
  try { return txt ? JSON.parse(txt) : null; } catch (e) { return null; }
}

function gDay(d) { return Utilities.formatDate(d, G_TZ, 'yyyy-MM-dd'); }

function gPullAthlete(who, key) {
  const tok = gToken(who, key), now = new Date(), stamp = now.toISOString();
  const days = []; for (let i = G_DAYS - 1; i >= 0; i--) days.push(gDay(new Date(now.getTime() - i * 864e5)));
  const a = days[0], b = days[days.length - 1];
  gUpsert('Garmin_Daily', gDailyRows(who, tok, days, stamp), r => r[0] + '|' + r[1]);
  const acts = gGet(who, tok, '/activitylist-service/activities/search/activities', { start: 0, limit: 20, startDate: a, endDate: b });
  const list = Array.isArray(acts) ? acts : (acts && (acts.activityList || acts.activities || acts.data)) || [];
  // v193: the FIT file is read once per activity (laps and the heart rate stream); an activity that already has its stream is skipped
  const ash = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Garmin_Activities'), AH = G_TABS.Garmin_Activities;
  const have = {}; if (ash && ash.getLastRow() > 1) ash.getRange(2, 1, ash.getLastRow() - 1, AH.length).getDisplayValues().forEach(r => { if (r[0] === who && r[AH.indexOf('hr5')]) have[r[1]] = true; });
  const arows = list.map(x => {
    const id = String(x.activityId || '');
    let laps = '', hr5 = '';
    const want = id && !have[id] && (x.duration || 0) <= 3 * 3600 && ((x.lapCount || 0) > 1 || gNum(x, ['averageHR', 'averageHeartRate']));
    if (want) { try { const F = gFit(who, tok, id); if (F.laps.length > 1) laps = JSON.stringify(F.laps); hr5 = F.hr5; } catch (e) { gRaw(who, 'fit', 'error', String(e && e.message || e)); } }
    const start = String(x.startTimeLocal || '');
    return [who, id, start.slice(0, 10), start, gStr(x, ['typeKey']), String(x.activityName || ''),
      x.duration ? Math.round(x.duration / 6) / 10 : '', x.distance ? Math.round(x.distance / 10) / 100 : '',
      gNum(x, ['averageHR', 'averageHeartRate']), gNum(x, ['maxHR', 'maxHeartRate']), gNum(x, ['calories']), laps, stamp, hr5];
  }).filter(r => r[1]);
  gUpsert('Garmin_Activities', arows, r => r[0] + '|' + r[1], true);
}

// One Garmin_Daily row per day. Daily summaries come as a range, sleep and HRV per day.
function gDailyRows(who, tok, days, stamp) {
  const sum = gGet(who, tok, '/usersummary-service/v2/dailysummaries', { startDate: days[0], endDate: days[days.length - 1] });
  return days.map(day => {
    const s = gFindDay(sum, day);
    const sl = gGet(who, tok, '/sleep-service/sleep/dailySleep', { date: day });
    const hrv = gGet(who, tok, '/hrv-service/hrv/' + day);
    const sleepSec = gNum(sl, ['sleepTimeSeconds']), cal = (s && s.calories) || {}, im = (s && s.intensityMinutes) || {};
    const need = sl && (sl.dailySleepDTO || sl).sleepNeed;
    return [who, day,
      gNum(s && s.heartRate, ['restingValue']) || gNum(s, ['restingHeartRate']),
      gNum(hrv, ['lastNightAvg']), gNum(hrv, ['weeklyAvg']), gStr(hrv, ['status']),
      gScore(sl), sleepSec ? Math.round(sleepSec / 360) / 10 : '',
      gMin(sl, 'deepSleepSeconds'), gMin(sl, 'remSleepSeconds'),
      gNum(s && s.bodyBattery, ['maxValue']), gNum(s && s.bodyBattery, ['minValue']),
      gNum(s && s.stress, ['avgLevel']), s && s.movement && s.movement.steps ? gNum(s.movement.steps, ['value']) : '',
      stamp,
      gNum(cal, ['burnedTotal']), gNum(cal, ['burnedActive']), gNum(cal, ['burnedResting']),
      gNum(im, ['moderate']), gNum(im, ['vigorous']),
      gNum(s && s.respiration, ['avgValue']), need && typeof need.actual === 'number' ? need.actual : ''];
  }).filter(r => r.some((v, i) => i > 1 && i !== 14 && v !== '' && v !== null)); // days before the watch was worn come back empty
}

// v188: run once by hand (select garminBackfill, Run). Pulls the last G_BACK days for every athlete with a key,
// in 30 day blocks, and fills Garmin_Daily (calories, sleep, HRV...). Existing values are kept when Garmin sends nothing.
const G_BACK = 90;
function garminBackfill() {
  gHead('Garmin_Daily');
  const props = PropertiesService.getScriptProperties().getProperties(), now = new Date(), stamp = now.toISOString();
  G_QUIET = true;
  try {
    Object.keys(props).filter(k => /^GARMIN_KEY_/.test(k)).forEach(k => {
      const who = k.slice(11).toLowerCase(), tok = gToken(who, props[k].trim());
      for (let end = 0; end < G_BACK; end += 30) {
        const days = []; for (let i = Math.min(G_BACK, end + 30) - 1; i >= end; i--) days.push(gDay(new Date(now.getTime() - i * 864e5)));
        gUpsert('Garmin_Daily', gDailyRows(who, tok, days, stamp), r => r[0] + '|' + r[1], true);
      }
    });
  } finally { G_QUIET = false; }
}

// v188: run once by hand. Calls every other endpoint of the official client and keeps each answer in Garmin_Raw as "probe ..."
function garminProbe() {
  const props = PropertiesService.getScriptProperties().getProperties(), d = n => gDay(new Date(Date.now() - n * 864e5));
  Object.keys(props).filter(k => /^GARMIN_KEY_/.test(k)).forEach(k => {
    const who = k.slice(11).toLowerCase(), tok = gToken(who, props[k].trim());
    const list = [
      ['profile', '/userprofile-service/userprofile/settings'],
      ['vo2max', '/metrics-service/metrics/maxmet/daily/' + d(60) + '/' + d(0)],
      ['fitness age', '/fitnessage-service/fitnessage/v2/' + d(0)],
      ['hr zones', '/biometric-service/heartRateZones/v2'],
      ['food logs', '/nutrition-service/food/logs/' + d(1)],
      ['weight', '/weight-service/weight/range/' + d(90) + '/' + d(0), { includeAll: true }],
      ['weight goal', '/goal-service/goal/user/effective/weightgoal/' + d(0) + '/' + d(0)],
      ['hydration', '/usersummary-service/stats/hydration/daily/' + d(7) + '/' + d(0)],
      ['wellness activity', '/wellnessactivity-service/activity/summary/range/' + d(7) + '/' + d(0)],
      ['sleep range', '/sleep-service/sleep/dailySleepSummariesByDate', { startDate: d(3), endDate: d(0) }],
      ['hrv range', '/hrv-service/hrv/daily/' + d(7) + '/' + d(0)],
      ['daily hr', '/wellness-service/wellness/dailyHeartRate', { date: d(1) }]
    ];
    G_QUIET = true;
    list.forEach(([name, path, params]) => {
      const q = params ? '?' + Object.keys(params).map(p => p + '=' + encodeURIComponent(params[p])).join('&') : '';
      const r = UrlFetchApp.fetch(G_BASE + path + q, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
      G_QUIET = false; gRaw(who, 'probe ' + name, String(r.getResponseCode()), r.getContentText()); G_QUIET = true;
    });
    G_QUIET = false;
  });
}

// Laps: the activity details only hold summaries (checked on Fred's Nov 17 test), so read the lap messages from the original FIT file.
function gFitLaps(who, tok, id) { return gFit(who, tok, id).laps; }
function gFit(who, tok, id) {
  // Garmin answered 406 to a shorter Accept list on Nov 17, so try the official client's exact header first, then looser ones.
  let r = null;
  for (const acc of ['application/zip, application/x-zip-compressed, application/octet-stream', '*/*', 'application/octet-stream', 'application/zip']) {
    r = UrlFetchApp.fetch(G_BASE + '/download-service/files/activity/' + id, { headers: { Accept: acc, Authorization: 'Bearer ' + tok }, muteHttpExceptions: true });
    if (r.getResponseCode() < 300) { gRaw(who, 'fit', 'ok (' + acc + ')', String(r.getBlob().getBytes().length) + ' bytes'); break; }
    gRaw(who, 'fit', 'error ' + r.getResponseCode() + ' (' + acc + ')', r.getContentText().slice(0, 300));
  }
  if (!r || r.getResponseCode() >= 300) return { laps: [], hr5: '' };
  let blob = r.getBlob(), bytes = blob.getBytes();
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) { // ZIP
    const files = Utilities.unzip(blob.setContentType('application/zip'));
    const f = files.find(x => /\.fit$/i.test(x.getName())) || files[0];
    bytes = f ? f.getBytes() : [];
  }
  const P = fitParse(bytes);
  return { laps: P.laps, hr5: fitHr5(P.recs) };
}

// v193: heart rate records to 5 s averages. FIT time is seconds since 1989-12-31 UTC (unix + 631065600).
function fitHr5(recs) {
  const R = recs.filter(q => q.hr > 0 && q.hr < 255 && q.t > 0);
  if (R.length < 10) return '';
  const t0 = Math.floor((R[0].t + 631065600) / 5) * 5, b = [];
  R.forEach(q => { const i = Math.floor((q.t + 631065600 - t0) / 5); if (i < 0 || i > 3000) return; (b[i] = b[i] || []).push(q.hr); });
  let last = 0, gap = 0;
  const v = []; for (let i = 0; i < b.length; i++) { if (b[i]) { last = Math.round(b[i].reduce((x, y) => x + y, 0) / b[i].length); gap = 0; } else if (++gap > 6) last = 0; v.push(last); }
  return t0 + '|' + v.join(',');
}

// Minimal FIT reader: returns [{s: seconds, km, hr, max}] for each lap message (global 19). Tested against Garmin's FIT SDK sample files.
function fitLaps(b) { return fitParse(b).laps; }
// v193: also returns the record messages (global 20: field 253 timestamp, field 3 heart rate), compressed timestamp headers included
function fitParse(b) {
  const u8 = i => b[i] & 255;
  const hdr = u8(0), dataEnd = hdr + ((u8(4) | u8(5) << 8 | u8(6) << 16 | u8(7) << 24) >>> 0);
  let p = hdr, lastTs = 0; const defs = {}, laps = [], recs = [];
  const rd = (off, size, le) => { let v = 0; if (le) { for (let i = size - 1; i >= 0; i--) v = v * 256 + u8(off + i); } else { for (let i = 0; i < size; i++) v = v * 256 + u8(off + i); } return v; };
  function rdMsg(d, q, cts) {
    const o = {};
    d.fields.forEach(f => { if (f.s <= 4) o[f.n] = rd(q, f.s, d.le); q += f.s; });
    q += d.dev;
    if (o[253] !== undefined && o[253] !== 0xFFFFFFFF) lastTs = o[253];
    else if (cts !== undefined && lastTs) { let t = (lastTs & ~0x1F) + cts; if (cts < (lastTs & 0x1F)) t += 0x20; lastTs = t >>> 0; }
    if (d.g === 20) recs.push({ t: lastTs, hr: o[3] === undefined ? 0 : o[3] });
    if (d.g === 19) {
      const val = (n, bad) => (o[n] === undefined || o[n] === bad) ? 0 : o[n];
      const t = val(7, 0xFFFFFFFF) || val(8, 0xFFFFFFFF), dist = val(9, 0xFFFFFFFF);
      laps.push({ s: Math.round(t / 10) / 100, km: Math.round(dist / 100) / 1000, hr: val(15, 255), max: val(16, 255) });
    }
    return q;
  }
  while (p < dataEnd && p < b.length) {
    const h = u8(p++);
    if (h & 0x80) { const d = defs[(h >> 5) & 3]; if (!d) break; p = rdMsg(d, p, h & 0x1F); continue; }
    const local = h & 15;
    if (h & 0x40) {
      const arch = u8(p + 1), gnum = rd(p + 2, 2, arch === 0), nf = u8(p + 4); p += 5;
      const fields = []; for (let i = 0; i < nf; i++) { fields.push({ n: u8(p), s: u8(p + 1) }); p += 3; }
      let dev = 0; if (h & 0x20) { const nd = u8(p++); for (let i = 0; i < nd; i++) { dev += u8(p + 1); p += 3; } }
      defs[local] = { le: arch === 0, g: gnum, fields, dev };
    } else { const d = defs[local]; if (!d) break; p = rdMsg(d, p); }
  }
  return { laps, recs };
}

// Generic lookups: Garmin nests these differently per endpoint, so search by field name.
function gFind(o, names, depth) {
  if (!o || typeof o !== 'object' || (depth || 0) > 6) return undefined;
  for (const n of names) if (o[n] !== undefined && o[n] !== null && typeof o[n] !== 'object') return o[n];
  for (const k of Object.keys(o)) { const v = gFind(o[k], names, (depth || 0) + 1); if (v !== undefined) return v; }
  return undefined;
}
function gNum(o, names) { const v = gFind(o, names); return typeof v === 'number' ? Math.round(v * 10) / 10 : (v && !isNaN(+v) ? +v : ''); }
function gStr(o, names) { const v = gFind(o, names); return v === undefined ? '' : String(v); }
function gMin(o, name) { const v = gNum(o, [name]); return v === '' ? '' : Math.round(v / 60); }
function gScore(sl) { // dailySleepDTO.sleepScores.overall.value
  const sc = sl && (sl.dailySleepDTO || sl).sleepScores;
  if (sc && sc.overall && typeof sc.overall.value === 'number') return sc.overall.value;
  return gNum(sl, ['sleepScore', 'overallSleepScore']);
}
function gFindDay(o, day) {
  if (!o) return null;
  const arr = Array.isArray(o) ? o : (o.data || o.dailySummaries || o.values || []);
  if (!Array.isArray(arr)) return null;
  return arr.find(x => x && String(x.calendarDate || x.date || '').slice(0, 10) === day) || null;
}

// v181: the date cell came back as a Date object, so String(Date) never matched the 'yyyy-MM-dd' key and every
// sync appended a new row (Garmin_Daily had 9 rows for Nov 18). Keys are now normalised, rows are written as text,
// and existing duplicates are removed (the row with the latest updated_at wins).
function gCell(v) {
  if (v instanceof Date) return Utilities.formatDate(v, G_TZ, 'yyyy-MM-dd');
  return v === undefined || v === null ? '' : String(v);
}

function gUpsert(tab, rows, keyOf, merge) {
  if (!rows.length) return;
  gHead(tab);
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tab), head = G_TABS[tab], ui = head.indexOf('updated_at');
  gDedupe(sh, head, keyOf, ui);
  const n = sh.getLastRow(), have = n > 1 ? sh.getRange(2, 1, n - 1, head.length).getValues() : [];
  const at = {}; have.forEach((r, i) => at[keyOf(r.map(gCell))] = i + 2);
  rows.forEach(r => {
    const vals = [r.map(gCell)];
    const k = keyOf(vals[0]);
    let row = at[k];
    if (merge && row && have[row - 2]) { const old = have[row - 2].map(gCell); vals[0] = vals[0].map((v, i) => v === '' ? (old[i] || '') : v); }
    if (!row) { row = sh.getLastRow() + 1; at[k] = row; }
    const rg = sh.getRange(row, 1, 1, head.length);
    rg.setNumberFormat('@');
    rg.setValues(vals);
  });
}

// v188: keeps the header row in step with G_TABS (new columns are appended at the end).
function gHead(tab) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tab), head = G_TABS[tab];
  if (!sh) return;
  const cur = sh.getRange(1, 1, 1, head.length).getValues()[0].map(String);
  if (cur.join('|') !== head.join('|')) sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
}

function gDedupe(sh, head, keyOf, ui) {
  const n = sh.getLastRow();
  if (n < 3) return;
  const have = sh.getRange(2, 1, n - 1, head.length).getValues().map(r => r.map(gCell));
  const best = {}, drop = [];
  have.forEach((r, i) => {
    const k = keyOf(r), j = best[k];
    if (j === undefined) { best[k] = i; return; }
    if (String(r[ui]) >= String(have[j][ui])) { drop.push(j); best[k] = i; } else drop.push(i);
  });
  drop.sort((a, b) => b - a).forEach(i => sh.deleteRow(i + 2));
}

// Run once by hand from the editor to clean both tabs now.
function garminDedupeNow() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  [['Garmin_Daily', r => r[0] + '|' + r[1]], ['Garmin_Activities', r => r[0] + '|' + r[1]]].forEach(([tab, keyOf]) => {
    const sh = ss.getSheetByName(tab);
    if (sh) gDedupe(sh, G_TABS[tab], keyOf, G_TABS[tab].indexOf('updated_at'));
  });
}

let G_QUIET = false; // v188: the backfill makes hundreds of calls, so it skips the Garmin_Raw log
function gRaw(who, endpoint, status, json) {
  if (G_QUIET) return;
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Garmin_Raw');
  if (!sh) return;
  const vals = [[who, endpoint, new Date().toISOString(), status, String(json || '').slice(0, 45000)]];
  const n = sh.getLastRow(), have = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  const i = have.findIndex(r => r[0] === who && r[1] === endpoint);
  if (i >= 0) sh.getRange(i + 2, 1, 1, 5).setValues(vals); else sh.appendRow(vals[0]);
}

// v152: called by Code.gs doPost (action 'garmin') when the athlete taps Import from Garmin in the app.
// Pulls fresh data for that athlete, then returns the last 7 days of activities (with laps) and today's daily row.
function garminForApp(who) {
  who = who.toLowerCase().replace(/[^a-z]/g, '');
  const key = PropertiesService.getScriptProperties().getProperty('GARMIN_KEY_' + who);
  if (!key) {
    // v183: athletes on an Apple Watch get their Health_Daily rows (filled by the HYROX Santé shortcut)
    const hd = typeof healthDaily === 'function' ? healthDaily(who, 21) : [];
    return hd.length ? { ok: true, source: 'apple', activities: [], daily: hd } : { ok: false, error: 'no_garmin_key' };
  }
  try { gPullAthlete(who, key.trim()); } catch (err) { return { ok: false, error: 'garmin', detail: String(err && err.message || err).slice(0, 300) }; }
  const ss = SpreadsheetApp.openById(SHEET_ID), since = gDay(new Date(Date.now() - 7 * 864e5)); // v155 (Fred, Nov 17): a forgotten sim can be imported up to 7 days later
  const read = tab => { const sh = ss.getSheetByName(tab); if (!sh || sh.getLastRow() < 2) return []; const head = G_TABS[tab]; return sh.getRange(2, 1, sh.getLastRow() - 1, head.length).getDisplayValues().map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))).filter(r => r.athlete === who && r.date >= since); };
  const acts = read('Garmin_Activities').map(r => ({ id: r.activity_id, date: r.date, start: r.start_local, type: r.type, name: r.name, min: +r.duration_min || 0, km: +r.distance_km || 0, hr: +r.avg_hr || 0, max: +r.max_hr || 0, cal: +r.calories || 0, laps: r.laps ? JSON.parse(r.laps) : [], hr5: r.hr5 || '' })).sort((a, b) => b.start.localeCompare(a.start));
  return { ok: true, activities: acts, daily: read('Garmin_Daily') };
}
