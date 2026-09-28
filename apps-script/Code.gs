/**
 * HYROX app database (Google Sheet backend)
 * Standalone Apps Script project that reads and writes the "HYROX Database" sheet.
 * Then: run setup once, and Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 */
const SYNC_KEY = 'PASTE_SYNC_KEY_HERE'; // must match the key in the app setup link
const SHEET_ID = '1ae-XYI80dx5aCkb38Bsh6vqWAuQEunyW44T_zU3ROoM'; // HYROX Database in Google Drive

const TABS = {
  Logs: ['id', 'athlete', 'date', 'week', 'session', 'duration_min', 'run_km', 'pace', 'rpe', 'knee', 'stations', 'notes', 'saved_at', 'updated_at', 'deleted'],
  Benchmarks: ['athlete', 'test', 'week', 'time', 'updated_at'],
  State: ['athlete', 'checks_json', 'updated_at']
};
const TEXT_COLS = { Logs: ['id', 'athlete', 'session', 'pace', 'stations', 'notes', 'saved_at', 'updated_at'], Benchmarks: ['athlete', 'test', 'time', 'updated_at'], State: ['athlete', 'checks_json', 'updated_at'] };

function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (!ss.getSheetByName('Logs')) ss.getSheets()[0].setName('Logs');
  Object.keys(TABS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const head = TABS[name];
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    TEXT_COLS[name].forEach(col => sh.getRange(2, head.indexOf(col) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'));
    if (name === 'Logs') sh.getRange(2, head.indexOf('date') + 1, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');
  });
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== SYNC_KEY) return out({ ok: false, error: 'bad_key' });
  return out(Object.assign({ ok: true }, readAll()));
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad_json' }); }
  if (body.key !== SYNC_KEY) return out({ ok: false, error: 'bad_key' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    (body.logs || []).forEach(r => upsert('Logs', ['id'], logRow(r)));
    (body.bench || []).forEach(r => upsert('Benchmarks', ['athlete', 'test', 'week'], r));
    (body.state || []).forEach(r => upsert('State', ['athlete'], r));
  } finally { lock.releaseLock(); }
  return out(Object.assign({ ok: true }, readAll()));
}

function logRow(r) {
  return { id: r.id, athlete: r.athlete, date: r.date, week: r.week || '', session: r.session || '', duration_min: r.duration || '', run_km: r.distance || '',
    pace: r.pace || '', rpe: r.rpe || '', knee: r.knee || 0, stations: r.stations || '', notes: r.notes || '', saved_at: r.savedAt || '', updated_at: r.updatedAt || '', deleted: r.deleted ? 'TRUE' : '' };
}

// Insert or replace a row, keeping whichever version was edited last.
function upsert(tab, keys, rec) {
  const sh = sheet(tab), head = TABS[tab], data = sh.getDataRange().getDisplayValues();
  const ki = keys.map(k => head.indexOf(k)), ui = head.indexOf('updated_at');
  const want = keys.map(k => String(rec[k]));
  let row = -1;
  for (let i = 1; i < data.length; i++) if (ki.every((c, j) => data[i][c] === want[j])) { row = i + 1; break; }
  if (row > 0 && String(data[row - 1][ui]) > String(rec.updated_at || '')) return; // sheet already has a newer version
  const vals = [head.map(h => rec[h] === undefined || rec[h] === null ? '' : rec[h])];
  if (row > 0) sh.getRange(row, 1, 1, head.length).setValues(vals);
  else sh.getRange(sh.getLastRow() + 1, 1, 1, head.length).setValues(vals);
}

function readAll() {
  const rows = tab => { const d = sheet(tab).getDataRange().getDisplayValues(), h = d[0]; return d.slice(1).filter(r => r[0] !== '').map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
  const logs = rows('Logs').map(r => ({ id: r.id, athlete: r.athlete, date: r.date, session: r.session, duration: +r.duration_min || 0, distance: +r.run_km || 0, pace: r.pace,
    rpe: +r.rpe || null, knee: +r.knee || 0, stations: r.stations, notes: r.notes, savedAt: r.saved_at, updatedAt: r.updated_at, deleted: r.deleted === 'TRUE' }));
  return { logs, bench: rows('Benchmarks'), state: rows('State'), serverTime: new Date().toISOString() };
}

function sheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) { setup(); sh = ss.getSheetByName(name); }
  return sh;
}

function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
