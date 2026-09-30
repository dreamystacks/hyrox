// Navigation check: node tests/nav.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Bar order and labels, Coach view order, the "Next report" line in two time zones, the Guides button on Today
// with its Back button, and that the info buttons open a guide and return to where they were opened.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(tz,when='2026-10-07T10:00:00')=>{const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:tz});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});await p.clock.install({time:new Date(when)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('America/Toronto');
const tabs=await p.evaluate(()=>[...document.querySelectorAll('.bottombar .tab')].map(t=>t.dataset.view+':'+(t.textContent.trim()||'(today)')));
check('bar: Plan, History, Today (raised, active), Coach; no Guides or Progress',tabs,['plan:Plan','history:History','today:(today)','bench:Coach']);
check('app opens on Today',await p.evaluate(()=>document.querySelector('.view.active').id),'today');
check('Settings has no Guides row',await p.locator('#settingsModal #guidesBtn').count(),0);
await p.click('.bottombar [data-view=bench]');await p.clock.runFor(500);
check('Coach view order',await p.evaluate(()=>[...document.querySelectorAll('#bench > *')].map(e=>e.id||e.tagName.toLowerCase()).slice(0,9)),['h2','benchSeg','coachWrap','reportWrap','nextReport','readsH','p','standWrap','curveWrap']);
check('Coach title',await p.locator('#bench h2').innerText(),'Coach');
check('one athlete switch in the Coach view',await p.locator('#bench .seg').count(),1);
check('Next report (Toronto viewer, Wed)',await p.locator('#nextReport').innerText(),'Next report: Sat 6:52 PM');
check('the line is there even with no report at all',await p.evaluate(()=>[!!document.querySelector('#coachWrap .coach.empty'),$('nextReport').offsetHeight>0]),[true,true]);
await p.evaluate(()=>{});await p.context().close();
p=await open('Australia/Brisbane');await p.click('.bottombar [data-view=bench]');await p.clock.runFor(400);
check('Next report shown in the viewer\'s own time zone (Brisbane)',await p.locator('#nextReport').innerText(),'Next report: Sun 8:52 AM');await p.context().close();
p=await open('America/Toronto','2026-10-10T20:00:00-04:00');await p.click('.bottombar [data-view=bench]');await p.clock.runFor(400);
check('Saturday after 6:52 PM rolls to next Saturday',await p.locator('#nextReport').innerText(),'Next report: Sat 6:52 PM');
check('...and it is really 6 to 7 days away (Sat 20:00 to next Sat 18:52)',await p.evaluate(()=>{const d=(nextReportAt()-Date.now())/864e5;return d>6.9&&d<7}),true);await p.context().close();
// Guides from Today (Tuesday: a training day, so the card has exercises)
p=await open('America/Toronto','2026-10-06T10:00:00');
check('Today header has the guides button',await p.locator('#today .td-book').count(),1);
await p.click('#today .td-book');await p.clock.runFor(400);
check('Guides opens; Today tab stays highlighted; no tab of its own',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.tab.active').dataset.view,document.querySelectorAll('.bottombar [data-view=guides]').length]),['guides','today',0]);
check('Guides list rendered',await p.evaluate(()=>document.querySelectorAll('#guideGrid .guide-card').length>5),true);
await p.click('#guidesBack');await p.clock.runFor(300);
check('Back returns to Today',await p.evaluate(()=>document.querySelector('.view.active').id),'today');
// info buttons open the guide modal and leave you where you were
await p.click('#today .ib >> nth=0');await p.clock.runFor(300);
check('info button opens the guide modal',await p.evaluate(()=>[document.querySelector('#modal').classList.contains('show'),document.querySelector('#modalBody .guide-title')&&document.querySelector('#modalBody .guide-title').textContent.length>0]),[true,true]);
await p.click('#closeModal');await p.clock.runFor(300);
check('closing it returns to Today',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('#modal').classList.contains('show')]),['today',false]);
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);await p.locator('.day-card').first().locator('.day-head').click();await p.click('.day-card.open .ib >> nth=0');await p.clock.runFor(300);await p.click('#closeModal');await p.clock.runFor(300);
check('info button on Plan returns to Plan',await p.evaluate(()=>document.querySelector('.view.active').id),'plan');
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
