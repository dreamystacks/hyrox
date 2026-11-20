/**
 * Apple Health intake (v180). Third file in the same Apps Script project.
 * An iOS Shortcut on the athlete's iPhone POSTs {key, action:'health', athlete, <field>: text, ...}
 * to the sync web app. Each field is a newline joined list (values, ISO start dates, ISO end dates)
 * exactly as Shortcuts turns a list of Health samples into text.
 * Stage 1 (diagnostic): every field lands raw in Health_Raw so we can see what Shortcuts really exposes.
 * Stage 2 (v183): daily runs are also parsed into Health_Daily (same columns as Garmin_Daily plus
 * resp_rate, wrist_temp, active_kcal), which garminForApp returns for athletes without a Garmin key.
 * Workout runs (kind:'workout', from the HYROX Workout shortcut) stay raw; the app reads them with
 * action 'health_get' and filters the heart rate to the session window itself.
 */
const HEALTH_SKIP = { key: 1, action: 1, athlete: 1 };

function healthIn(body) {
  const who = String(body.athlete || '').toLowerCase().trim();
  if (!who) return { ok: false, error: 'no_athlete' };
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName('Health_Raw');
  if (!sh) {
    sh = ss.insertSheet('Health_Raw');
    sh.getRange(1, 1, 1, 5).setValues([['athlete', 'received_at', 'field', 'items', 'value']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, sh.getMaxRows() - 1, 5).setNumberFormat('@');
  }
  const at = new Date().toISOString(), rows = [], counts = {};
  Object.keys(body).forEach(f => {
    if (HEALTH_SKIP[f]) return;
    let v = body[f];
    if (Array.isArray(v)) v = v.join('\n');
    else if (v && typeof v === 'object') v = JSON.stringify(v);
    v = String(v == null ? '' : v);
    const n = v.trim() ? v.trim().split('\n').length : 0;
    counts[f] = n;
    rows.push([who, at, f, String(n), v.length > 49000 ? v.slice(0, 49000) + '\n[cut]' : v]);
  });
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
  healthPrune(sh);
  let days = 0;
  if (String(body.kind || '') !== 'workout' && !body._raw) {
    try { days = healthParse(who, body); } catch (err) { counts._parse_error = String(err && err.message || err).slice(0, 200); }
  }
  return { ok: true, athlete: who, received_at: at, counts: counts, days: days };
}

// v182: escape control characters (raw line breaks, tabs) that sit inside JSON strings, leave the rest alone.
function jsonCtrlFix(s) {
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) { esc = false; out += c; continue; }
      if (c === '\\') { esc = true; out += c; continue; }
      if (c === '"') { inStr = false; out += c; continue; }
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { continue; }
      if (c === '\t') { out += '\\t'; continue; }
      if (c < ' ') { continue; }
      out += c;
    } else {
      if (c === '"') inStr = true;
      out += c;
    }
  }
  return out;
}

// v182: a body that still does not parse is kept whole in Health_Raw (field _raw) so the format can be read and fixed.
function healthRawDump(raw) {
  const who = ((raw.match(/athlete"?\s*[:=]\s*"?([a-z]+)/i) || [])[1] || 'unknown').toLowerCase();
  const key = (raw.match(/"?key"?\s*[:=]\s*"?([^"&,\s]+)/) || [])[1] || '';
  const safe = key ? raw.split(key).join('[key]') : raw;
  return healthIn({ athlete: who, _raw: safe.slice(0, 49000) });
}

// ---------- v183 stage 2: parse daily runs into Health_Daily ----------
const H_HEAD = ['athlete', 'date', 'resting_hr', 'hrv_last_night', 'hrv_weekly_avg', 'hrv_status', 'sleep_score', 'sleep_hours', 'deep_min', 'rem_min', 'body_battery_high', 'body_battery_low', 'stress_avg', 'steps', 'resp_rate', 'wrist_temp', 'active_kcal', 'updated_at'];
const H_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, janv: 1, 'févr': 2, fevr: 2, mars: 3, avr: 4, mai: 5, juin: 6, juil: 7, 'août': 8, aout: 8, sept: 9, 'déc': 12 };

// Shortcuts sends dates as ISO 8601 or as "Nov 18, 2026 at 8:09 AM" (English) or "18 nov. 2026 à 08:09" (French), local time.
function healthDate(s) {
  s = String(s || '').replace(/[  ]/g, ' ').trim();
  if (!s) return null;
  if (/^\d{4}-\d\d-\d\dT/.test(s)) { const d = new Date(s); return isNaN(d) ? null : d; }
  let m = s.match(/^([A-Za-zéû]+)\.? (\d{1,2}),? (\d{4})(?:,| at| à)? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?/i), y, mo, d, h, mi, se, ap;
  if (m) { mo = H_MON[m[1].toLowerCase().slice(0, 3)]; d = +m[2]; y = +m[3]; h = +m[4]; mi = +m[5]; se = +(m[6] || 0); ap = m[7]; }
  else {
    m = s.match(/^(\d{1,2}) ([A-Za-zéû]+)\.? (\d{4})(?:,| à| at)? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?/i);
    if (!m) { const t = new Date(s); return isNaN(t) ? null : t; }
    d = +m[1]; mo = H_MON[m[2].toLowerCase()] || H_MON[m[2].toLowerCase().slice(0, 3)]; y = +m[3]; h = +m[4]; mi = +m[5]; se = +(m[6] || 0); ap = m[7];
  }
  if (!mo) return null;
  if (ap) { ap = ap.toUpperCase(); if (ap === 'PM' && h < 12) h += 12; if (ap === 'AM' && h === 12) h = 0; }
  const p2 = n => String(n).padStart(2, '0');
  return Utilities.parseDate(`${y}-${p2(mo)}-${p2(d)} ${p2(h)}:${p2(mi)}:${p2(se)}`, G_TZ, 'yyyy-MM-dd HH:mm:ss');
}

function hList(body, f) { return String(body[f] == null ? '' : body[f]).split('\n').map(x => x.trim()).filter(Boolean); }
function hPairs(body, base, withEnd) {
  const v = hList(body, base + '_v'), s = hList(body, base + '_s'), e = withEnd ? hList(body, base + '_e') : [];
  const out = [];
  v.forEach((x, i) => { const st = healthDate(s[i]); if (!st) return; out.push({ v: x, s: st, e: withEnd ? healthDate(e[i]) : null }); });
  return out;
}

// Returns the number of dates written.
function healthParse(who, body) {
  const day = d => Utilities.formatDate(d, G_TZ, 'yyyy-MM-dd'), num = x => { const n = parseFloat(String(x).replace(',', '.')); return isNaN(n) ? null : n; };
  const rows = {}, R = dt => rows[dt] || (rows[dt] = {});
  // sleep sessions: stage segments with less than 3 h between them, dated on the wake day
  const seg = hPairs(body, 'sleep', true).filter(x => x.e && x.e > x.s).sort((a, b) => a.s - b.s), ses = [];
  seg.forEach(x => { const c = ses[ses.length - 1]; if (c && x.s - c.e < 3 * 36e5) { c.seg.push(x); if (x.e > c.e) c.e = x.e; } else ses.push({ s: x.s, e: x.e, seg: [x] }); });
  const night = {};
  ses.forEach(c => {
    let asleep = 0, deep = 0, rem = 0, awake = 0;
    c.seg.forEach(x => { const m = (x.e - x.s) / 6e4, t = x.v.toLowerCase(); if (/awake|éveil|eveil/.test(t)) awake += m; else if (/bed|lit/.test(t)) {} else { asleep += m; if (/deep|profond/.test(t)) deep += m; if (/rem|paradox/.test(t)) rem += m; } });
    if (asleep < 60) return;
    const dt = day(c.e);
    if (night[dt] && night[dt].asleep >= asleep) return;
    const h = asleep / 60, score = Math.round(50 * Math.min(1, h / 8) + 20 * Math.min(1, deep / asleep / 0.15) + 20 * Math.min(1, rem / asleep / 0.2) + 10 * Math.max(0, 1 - awake / 60));
    night[dt] = { s: c.s, e: c.e, asleep: asleep };
    Object.assign(R(dt), { sleep_hours: (Math.round(h * 10) / 10).toFixed(1), deep_min: String(Math.round(deep)), rem_min: String(Math.round(rem)), sleep_score: String(score) });
  });
  const inNight = d => Object.keys(night).find(k => d >= night[k].s && d <= night[k].e);
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  // HRV and respiratory rate: averages over the night (HRV falls back to the 6 h before waking)
  ['hrv', 'rr'].forEach(base => {
    const by = {};
    hPairs(body, base).forEach(p => { const n = num(p.v); if (n == null) return; let k = inNight(p.s);
      if (!k && base === 'hrv') k = Object.keys(night).find(q => p.s <= night[q].e && night[q].e - p.s < 6 * 36e5);
      if (k) (by[k] = by[k] || []).push(n); });
    Object.keys(by).forEach(k => { const a = avg(by[k]); R(k)[base === 'hrv' ? 'hrv_last_night' : 'resp_rate'] = base === 'hrv' ? String(Math.round(a)) : (Math.round(a * 10) / 10).toFixed(1); });
  });
  hPairs(body, 'wtemp').forEach(p => { const n = num(p.v); if (n == null) return; const k = inNight(p.s) || day(new Date(p.s.getTime() + (+Utilities.formatDate(p.s, G_TZ, 'H') >= 15 ? 864e5 : 0))); R(k).wrist_temp = n.toFixed(2); });
  hPairs(body, 'rhr').forEach(p => { const n = num(p.v); if (n != null) R(day(p.s)).resting_hr = String(Math.round(n)); });
  const sum = (base, col) => { const by = {}; hPairs(body, base).forEach(p => { const n = num(p.v); if (n != null) by[day(p.s)] = (by[day(p.s)] || 0) + n; }); Object.keys(by).forEach(k => R(k)[col] = String(Math.round(by[k]))); };
  sum('steps', 'steps'); sum('kcal', 'active_kcal');
  return healthUpsert(who, rows);
}

// Merge into Health_Daily: new values win, except a night's sleep keeps the longer reading (a 2 day window can cut the oldest night).
function healthUpsert(who, rows) {
  const dates = Object.keys(rows);
  if (!dates.length) return 0;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName('Health_Daily');
  if (!sh) { sh = ss.insertSheet('Health_Daily'); sh.getRange(1, 1, 1, H_HEAD.length).setValues([H_HEAD]).setFontWeight('bold'); sh.setFrozenRows(1); }
  const n = sh.getLastRow(), have = n > 1 ? sh.getRange(2, 1, n - 1, H_HEAD.length).getDisplayValues() : [];
  const at = {}; have.forEach((r, i) => at[r[0] + '|' + r[1]] = i);
  const now = new Date().toISOString(), SLEEP = ['sleep_score', 'sleep_hours', 'deep_min', 'rem_min'];
  dates.forEach(dt => {
    const k = who + '|' + dt, cur = at[k] != null ? Object.fromEntries(H_HEAD.map((h, i) => [h, have[at[k]][i]])) : { athlete: who, date: dt }, nw = rows[dt];
    const keepSleep = cur.sleep_hours && nw.sleep_hours && +cur.sleep_hours > +nw.sleep_hours;
    Object.keys(nw).forEach(c => { if (keepSleep && SLEEP.indexOf(c) >= 0) return; if (nw[c] !== '' && nw[c] != null) cur[c] = nw[c]; });
    cur.updated_at = now;
    const line = H_HEAD.map(h => cur[h] == null ? '' : String(cur[h]));
    if (at[k] != null) have[at[k]] = line; else { at[k] = have.length; have.push(line); }
  });
  have.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
  const rg = sh.getRange(2, 1, have.length, H_HEAD.length);
  rg.setNumberFormat('@'); rg.setValues(have);
  return dates.length;
}

// Daily rows for the app (same shape as Garmin_Daily rows plus the Apple columns).
function healthDaily(who, days) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Health_Daily');
  if (!sh || sh.getLastRow() < 2) return [];
  const since = Utilities.formatDate(new Date(Date.now() - (days || 21) * 864e5), G_TZ, 'yyyy-MM-dd');
  return sh.getRange(2, 1, sh.getLastRow() - 1, H_HEAD.length).getDisplayValues().map(r => Object.fromEntries(H_HEAD.map((h, i) => [h, r[i]]))).filter(r => r.athlete === who && r.date >= since);
}

// action 'health_get': the newest HYROX Workout run for this log (or the newest workout run) with its heart rate lists.
function healthGet(body) {
  const who = String(body.athlete || '').toLowerCase().trim(), log = String(body.log || '').trim();
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Health_Raw');
  if (!sh || sh.getLastRow() < 2) return { ok: true, found: false };
  const n = sh.getLastRow(), from = Math.max(2, n - 400), vals = sh.getRange(from, 1, n - from + 1, 5).getValues();
  const runs = {};
  vals.forEach(r => { if (String(r[0]) !== who) return; const k = String(r[1]); (runs[k] = runs[k] || {})[String(r[2])] = String(r[4]); });
  const keys = Object.keys(runs).sort().reverse();
  const hit = keys.find(k => runs[k].kind === 'workout' && (!log || String(runs[k].log || '').trim() === log));
  if (!hit) return { ok: true, found: false };
  const r = runs[hit];
  return { ok: true, found: true, received_at: hit, log: r.log || '', hr_v: r.hr_v || '', hr_s: r.hr_s || '' };
}

// Health_Raw holds big text cells: keep it to roughly the last 2 weeks of runs.
function healthPrune(sh) {
  const n = sh.getLastRow();
  if (n > 1500) sh.deleteRows(2, n - 1001);
}

// Rebuild Health_Daily from every daily run still in Health_Raw (run by hand once after deploying v183).
function healthReparseAll() {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Health_Raw');
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues(), runs = {};
  vals.forEach(r => { const k = r[0] + '|' + r[1]; (runs[k] = runs[k] || { athlete: String(r[0]) })[String(r[2])] = String(r[4]); });
  const out = [];
  Object.keys(runs).sort().forEach(k => { const b = runs[k]; if (b.kind === 'workout' || b._raw || b.athlete === 'test' || b.athlete === '_badjson') return; out.push(b.athlete + ' ' + k.split('|')[1] + ': ' + healthParse(b.athlete, b) + ' days'); });
  Logger.log(out.join('\n'));
  return out;
}
