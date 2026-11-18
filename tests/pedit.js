// v159: the athlete edits one day of one week ("Edit this week's session"). Stored in the synced checks object as pe-<week>,
// beats coach changes, shows "Edited by you" and a You pill, Reset restores the plan, invalid text is refused, read only for other athletes.
// node tests/pedit.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const COACH={week:8,generated:'2026-11-16T23:00:00Z',athletes:{fred:{headline:'x',tweaks:[],plan:{'9':{fri:{text:'Weighted pull ups 3 x 5, DB bench 3 x 8.\nFinisher: EMOM 16 min (4 rounds): 1) 8 DB snatches',why:'coach version'}}}},will:{headline:'x',tweaks:[]}}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w=390,who='fred')=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(([a])=>{localStorage.setItem('hrx_active_athlete',a);localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_studio_v1','1');localStorage.setItem('hrx_studio_will_v1','1');localStorage.setItem(`hrx_${a}_unit_v2`,JSON.stringify('lb'))},[who]);
 await p.clock.install({time:new Date('2026-11-17T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 await p.evaluate(c=>{window.COACH=c;refreshViews()},COACH);await p.clock.runFor(300);return p};
let p=await open();
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(400);
await p.evaluate(()=>{currentWeek=9;renderPlan()});await p.clock.runFor(300);
const base=await p.evaluate(()=>PLAN[8].tue);
ok(await p.evaluate(()=>PLAN[8].fri.includes('DB snatches')),'week 9 Friday follows the coach before any edit');
await p.click('#days .day-card[data-day=Tue] .day-head');await p.clock.runFor(400);
ok(await p.locator('#days .day-card[data-day=Tue].open [data-pe]').count()===1,'Tuesday sheet has Edit this week\'s session');
await p.click('#days .day-card[data-day=Tue].open [data-pe]');await p.clock.runFor(400);
ok(await p.evaluate(()=>[document.getElementById('peModal').classList.contains('show'),document.getElementById('peText').value===PLAN[8].tue,document.getElementById('peTitle').textContent]).then(r=>r[0]&&r[1]&&r[2]==='Week 9 · Tuesday'),'editor opens prefilled with the current text');
await p.fill('#peText','');await p.click('#peSave');
ok((await p.textContent('#peErr')).length>0,'empty text refused');
await p.fill('#peText','Just vibes');await p.click('#peSave');
ok((await p.textContent('#peErr')).includes('does not read like a session')&&await p.evaluate(()=>document.getElementById('peModal').classList.contains('show')),'text that does not parse is refused');
const edited=base.replace(/\d+\s*[x×]\s*[\d.]+\s*k?m/i,m=>m.replace(/\d+/,n=>String(+n+1)));
await p.fill('#peText',edited);await p.click('#peSave');await p.clock.runFor(400);
ok(await p.evaluate(e=>PLAN[8].tue===e&&PLAN0[8].tue!==e,edited),'PLAN getter returns the edit, PLAN0 keeps the original');
ok(await p.evaluate(()=>{const o=JSON.parse(localStorage.getItem('hrx_fred_checks_v2'));return typeof o['pe-9']==='string'&&JSON.parse(o['pe-9']).tue.length>5}),'stored in checks as pe-9');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}')&&Object.keys(JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}')).some(x=>x.startsWith('state|fred'))),'queued for sync as state');
ok(await p.evaluate(()=>!!document.querySelector('#days .day-card[data-day=Tue] .adj-m')&&document.querySelector('#days .day-card[data-day=Tue] .adj-m').textContent==='You'),'row pill says You');
await p.click('#days .day-card[data-day=Tue] .day-head');await p.clock.runFor(400);
ok(await p.evaluate(()=>/Edited by you/.test(document.querySelector('#days .day-card[data-day=Tue].open .adj-b.ue')?.textContent||'')),'sheet badge Edited by you');
await p.click('#days .day-card[data-day=Tue].open [data-dclose]');await p.clock.runFor(300);
// other days untouched
ok(await p.evaluate(()=>PLAN[8].mon===PLAN0[8].mon&&PLAN[9].tue===PLAN0[9].tue),'other days and other weeks untouched');
// user edit beats the coach
await p.click('#days .day-card[data-day=Fri] .day-head');await p.clock.runFor(400);
ok(await p.evaluate(()=>/Adjusted by coach/.test(document.querySelector('#days .day-card[data-day=Fri].open .adj-b')?.textContent||'')),'coach badge still shows on an unedited coach day');
await p.click('#days .day-card[data-day=Fri].open [data-pe]');await p.clock.runFor(300);
await p.fill('#peText','Weighted pull ups 3 x 5, DB bench 3 x 8.\nFinisher: EMOM 16 min (4 rounds): 1) 10 DB snatches');await p.click('#peSave');await p.clock.runFor(300);
ok(await p.evaluate(()=>PLAN[8].fri.includes('10 DB snatches')&&!PLAN[8].fri.includes('8 DB snatches')),'user edit beats the coach override');
await p.click('#days .day-card[data-day=Fri] .day-head');await p.clock.runFor(400);
ok(await p.evaluate(()=>{const s=document.querySelector('#days .day-card[data-day=Fri].open');return !/Adjusted by coach/.test(s.textContent)&&/Edited by you/.test(s.textContent)}),'no coach badge on a user edited day');
// Today uses the edit in week 8? edit today's Tuesday (week 8)
await p.evaluate(()=>{window.__ec=PLAN0[7].tue});
await p.click('#days .day-card[data-day=Fri].open [data-pereset]');await p.clock.runFor(300);
ok(await p.evaluate(()=>PLAN[8].fri.includes('8 DB snatches')),'Reset to plan on a coach day falls back to the coach version');
// Reset on Tuesday
await p.click('#days .day-card[data-day=Tue] .day-head');await p.clock.runFor(400);
await p.click('#days .day-card[data-day=Tue].open [data-pereset]');await p.clock.runFor(300);
ok(await p.evaluate(b=>PLAN[8].tue===b&&!JSON.parse(localStorage.getItem('hrx_fred_checks_v2'))['pe-9'],base),'Reset restores the plan and clears the key');
// Today: edit this week's Tuesday (today is Tue Nov 17, week 8)
await p.evaluate(()=>{currentWeek=8;renderPlan()});await p.click('#days .day-card[data-day=Tue] .day-head');await p.clock.runFor(400);
await p.click('#days .day-card[data-day=Tue].open [data-pe]');await p.clock.runFor(300);
const t8=await p.evaluate(()=>PLAN[7].tue),e8=t8.replace(/\d+\s*[x×]\s*[\d.]+\s*k?m/i,m=>m.replace(/\d+/,n=>String(+n+1)));
await p.fill('#peText',e8);await p.click('#peSave');await p.clock.runFor(400);
await p.click('.bottombar [data-view=today]');await p.clock.runFor(400);
ok(await p.evaluate(e=>PLAN[7].tue===e&&document.querySelector('#today').textContent.includes(e.match(/\d+\s*[x×]\s*[\d.]+/)[0].replace(/\s+/g,' ').replace(/\s*[x×]\s*/,' × ').trim().split(' ')[0]),e8),'Today follows the edit');
// 360 layout of the editor
await p.close();
p=await open(360);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(300);await p.evaluate(()=>{currentWeek=9;renderPlan()});await p.click('#days .day-card[data-day=Tue] .day-head');await p.clock.runFor(300);await p.click('#days .day-card[data-day=Tue].open [data-pe]');await p.clock.runFor(400);
ok(await p.evaluate(()=>{const r=document.querySelector('#peModal .sheet').getBoundingClientRect();return r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth}),'360: editor inside the screen');
await p.close();
// another athlete: read only, no button
p=await open();await p.evaluate(()=>{localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'http://127.0.0.1:9/x',key:'k'}));viewAthlete='will';});await p.click('.bottombar [data-view=plan]');await p.clock.runFor(300);
ok(await p.evaluate(()=>viewing()==='will')&&await p.locator('[data-pe]').count()===0,'viewing another athlete shows no edit button');
await p.close();
ok(errs.length===0,'no page errors '+errs.join('|'));
await b.close();console.log(f?f+' FAILED':'ALL OK');process.exit(f?1:0)})();
