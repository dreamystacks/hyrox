// Plan tab as the history: node tests/plan.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Clock pinned to Sat Oct 10 2026 (week 2, swapped: Mon holds Tue's session, Tue holds Mon's).
// Checks inline results on day cards, expand with Edit/Delete, Add session (prefilled, returns to Plan), Settings backup rows.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const LOGS=[L('a','2026-10-05','Tue: Run + arms A',{distance:6,pace:'5:30',rpe:6}),L('b','2026-10-06','Mon: Lower + sled',{duration:55,rpe:8,notes:'Workout 55:00 · 3/3 exercises done\nLoads (kg): Back squat 100 (3/3) · RDL 90 (3/3) · Sled push 120 (20+)\nNote: Felt strong'}),L('c','2026-10-07','Rest day',{duration:0}),L('e','2026-10-10','Sat: HYROX sim')];
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async()=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(lg=>{if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))}},LOGS);
 await p.clock.install({time:new Date('2026-10-10T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);return p};
const card=(p,d)=>p.locator(`.day-card[data-day=${d}]`);
const logs=p=>p.evaluate(()=>getLogs().length);
let p=await open();
check('no History anywhere: no section, no tab, no calendar',await p.evaluate(()=>[!!document.getElementById('history'),!!document.querySelector('[data-view=history]'),!!document.getElementById('calWrap')]),[false,false,false]);
check('Mon card shows the result of the session done on Tue',(await card(p,'Mon').locator('.day-res').innerText()).replace(/\s+/g,' '),'55 min RPE 8 Sled push 120 · Back squat 100 “Felt strong”');
check('Tue card shows the run',(await card(p,'Tue').locator('.day-res').innerText()).replace(/\s+/g,' '),'60 min RPE 6 6 km @ 5:30');
check('Wed card shows Rest day logged',(await card(p,'Wed').locator('.day-res').innerText()).trim(),'Rest day logged');
check('Fri card (nothing logged) has no result line',await card(p,'Fri').locator('.day-res').count(),0);
// expand Mon
await card(p,'Mon').locator('.day-head').click();await p.clock.runFor(300);
check('expanded Mon shows details, notes, Edit and Delete',await p.evaluate(()=>{const c=document.querySelector('.day-card[data-day=Mon]'),t=c.querySelector('.did').innerText;return[/Sled push 120/.test(t),/Felt strong/.test(t),!!c.querySelector('[data-edit]'),!!c.querySelector('[data-delete]')]}),[true,true,true,true]);
// edit and cancel
await card(p,'Mon').locator('[data-edit]').click();await p.clock.runFor(300);
check('Edit opens the log form',await p.evaluate(()=>[document.querySelector('.view.active').id,document.getElementById('logTitle').textContent]),['log','Edit session']);
await p.click('#cancelEdit');await p.clock.runFor(300);check('Cancel returns to Plan',await p.evaluate(()=>document.querySelector('.view.active').id),'plan');
// add session (last opened card is Mon Oct 5)
check('Add button follows the last opened card',await p.locator('#addSession').innerText(),'+ ADD SESSION · MON, OCT 5');
await card(p,'Fri').locator('.day-head').click();await p.clock.runFor(200);
check('Add button now points at Fri',await p.locator('#addSession').innerText(),'+ ADD SESSION · FRI, OCT 9');
await p.click('#addSession');await p.clock.runFor(300);
check('log form prefilled with the date and that weekday\'s session',await p.evaluate(()=>[document.querySelector('.view.active').id,date.value,session.value]),['log','2026-10-09','Fri: Upper + erg + arms B']);
await p.click('#logForm button[type=submit]');await p.clock.runFor(500);
check('Save returns to Plan on that week and the Fri card shows the result',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.week-title').textContent.startsWith('Week 2:'),!!document.querySelector('.day-card[data-day=Fri] .day-res')]),['plan',true,true]);
check('log count 5',await logs(p),5);
// delete
await card(p,'Fri').locator('.day-head').click();await p.clock.runFor(200);
if(!(await card(p,'Fri').evaluate(c=>c.classList.contains('open'))))await card(p,'Fri').locator('.day-head').click();
await card(p,'Fri').locator('[data-delete]').click();await p.clock.runFor(400);
check('Delete removes it from the card and the count',[await logs(p),await card(p,'Fri').locator('.day-res').count()],[4,0]);
// settings rows
await p.click('#avatarBtn').catch(()=>{});await p.evaluate(()=>settingsModal.classList.add('show'));await p.clock.runFor(300);
const shown=()=>p.evaluate(()=>settingsModal.classList.contains('show'));
check('Settings has Export, Import, Clear all',await p.evaluate(()=>['exportBtn','importRow','clearBtn'].map(i=>!!document.getElementById(i))),[true,true,true]);
await p.click('#unitBtn');check('unit toggle keeps the sheet open',await shown(),true);
const dl=p.waitForEvent('download').catch(()=>null);await p.click('#exportBtn');await dl;check('Export keeps the sheet open',await shown(),true);
await p.setInputFiles('#importFile',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({logs:[L('z','2026-10-08','Thu: Hockey')]}))});await p.clock.runFor(500);
check('Import adds the log',await logs(p),5);
await p.click('#clearBtn');await p.clock.runFor(300);check('Clear all (confirmed) empties logs and keeps the sheet open',[await logs(p),await shown()],[0,true]);
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
