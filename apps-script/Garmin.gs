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
  Garmin_Daily: ['athlete', 'date', 'resting_hr', 'hrv_last_night', 'hrv_weekly_avg', 'hrv_status', 'sleep_score', 'sleep_hours', 'deep_min', 'rem_min', 'body_battery_high', 'body_battery_low', 'stress_avg', 'steps', 'updated_at'],
  Garmin_Activities: ['athlete', 'activity_id', 'date', 'start_local', 'type', 'name', 'duration_min', 'distance_km', 'avg_hr', 'max_hr', 'calories', 'laps', 'updated_at'],
  Garmin_Raw: ['athlete', 'endpoint', 'fetched_at', 'status', 'json']
};

function garminSetup() {
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
  const sum = gGet(who, tok, '/usersummary-service/v2/dailysummaries', { startDate: a, endDate: b });
  const bb = gGet(who, tok, '/wellness-service/wellness/bodyBattery/reports/daily', { startDate: a, endDate: b });
  const rows = days.map(day => {
    const s = gFindDay(sum, day), bat = gFindDay(bb, day);
    const sl = gGet(who, tok, '/sleep-service/sleep/dailySleep', { date: day });
    const hrv = gGet(who, tok, '/hrv-service/hrv/' + day);
    const sleepSec = gNum(sl, ['sleepTimeSeconds']);
    return [who, day,
      gNum(s, ['restingHeartRate', 'restingHeartRateInBeatsPerMinute']),
      gNum(hrv, ['lastNightAvg']), gNum(hrv, ['weeklyAvg']), gStr(hrv, ['status']),
      gScore(sl), sleepSec ? Math.round(sleepSec / 360) / 10 : '',
      gMin(sl, 'deepSleepSeconds'), gMin(sl, 'remSleepSeconds'),
      gNum(bat || s, ['bodyBatteryHighestValue', 'charged', 'highestBodyBattery']), gNum(bat || s, ['bodyBatteryLowestValue', 'drained', 'lowestBodyBattery']),
      gNum(s, ['averageStressLevel', 'avgStressLevel', 'overallStressLevel']), gNum(s, ['totalSteps', 'steps']),
      stamp];
  });
  gUpsert('Garmin_Daily', rows, r => r[0] + '|' + r[1]);
  const acts = gGet(who, tok, '/activitylist-service/activities/search/activities', { start: 0, limit: 20, startDate: a, endDate: b });
  const list = Array.isArray(acts) ? acts : (acts && (acts.activityList || acts.activities || acts.data)) || [];
  const arows = list.map(x => {
    const id = String(x.activityId || '');
    let laps = '';
    const det = id ? gGet(who, tok, '/activity-service/activity/' + id) : null;
    const L = gLaps(det);
    if (L.length) laps = JSON.stringify(L);
    const start = String(x.startTimeLocal || '');
    return [who, id, start.slice(0, 10), start, gStr(x, ['typeKey']), String(x.activityName || ''),
      x.duration ? Math.round(x.duration / 6) / 10 : '', x.distance ? Math.round(x.distance / 10) / 100 : '',
      gNum(x, ['averageHR', 'averageHeartRate']), gNum(x, ['maxHR', 'maxHeartRate']), gNum(x, ['calories']), laps, stamp];
  }).filter(r => r[1]);
  gUpsert('Garmin_Activities', arows, r => r[0] + '|' + r[1]);
}

// Laps: look for any array of lap or split objects with a duration in the activity details.
function gLaps(det) {
  let found = [];
  (function walk(o, depth) {
    if (!o || typeof o !== 'object' || depth > 6 || found.length) return;
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (!found.length && Array.isArray(v) && /lap|split/i.test(k) && v.length && typeof v[0] === 'object' && v[0] && ('duration' in v[0] || 'elapsedDuration' in v[0])) {
        found = v.map(l => ({ s: Math.round(l.duration || l.elapsedDuration || 0), km: l.distance ? Math.round(l.distance) / 1000 : 0, hr: l.averageHR || l.averageHeartRate || 0 }));
      } else if (v && typeof v === 'object') walk(v, depth + 1);
    });
  })(det, 0);
  return found;
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

function gUpsert(tab, rows, keyOf) {
  if (!rows.length) return;
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tab), head = G_TABS[tab];
  const n = sh.getLastRow(), have = n > 1 ? sh.getRange(2, 1, n - 1, head.length).getValues() : [];
  const at = {}; have.forEach((r, i) => at[keyOf(r.map(String))] = i + 2);
  rows.forEach(r => {
    const vals = [r.map(v => v === undefined || v === null ? '' : String(v))];
    const row = at[keyOf(vals[0])];
    if (row) sh.getRange(row, 1, 1, head.length).setValues(vals);
    else { sh.appendRow(vals[0]); }
  });
}

function gRaw(who, endpoint, status, json) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Garmin_Raw');
  if (!sh) return;
  const vals = [[who, endpoint, new Date().toISOString(), status, String(json || '').slice(0, 45000)]];
  const n = sh.getLastRow(), have = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  const i = have.findIndex(r => r[0] === who && r[1] === endpoint);
  if (i >= 0) sh.getRange(i + 2, 1, 1, 5).setValues(vals); else sh.appendRow(vals[0]);
}
