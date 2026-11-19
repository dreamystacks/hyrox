/**
 * Apple Health intake (v180). Third file in the same Apps Script project.
 * An iOS Shortcut on the athlete's iPhone POSTs {key, action:'health', athlete, <field>: text, ...}
 * to the sync web app. Each field is a newline joined list (values, ISO start dates, ISO end dates)
 * exactly as Shortcuts turns a list of Health samples into text.
 * Stage 1 (diagnostic): every field lands raw in Health_Raw so we can see what Shortcuts really exposes.
 * Stage 2 will parse it into Health_Daily for the app's readiness score.
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
  return { ok: true, athlete: who, received_at: at, counts: counts };
}
