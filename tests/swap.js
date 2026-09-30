// Swapped week check: node tests/swap.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Week 2 (Mon Oct 5 to Sun Oct 11, 2026). Mon was used for Tue's session and Tue for Mon's session.
// Checks the Plan "Logged" tags (matched by stored session name, weekday shown when done on another day),
// and that Today's default session, Done card and Up next follow the swap. Display only, no data changes.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const SWAP_MON=L('a','2026-10-05','Tue: Run + arms A'),SWAP_TUE=L('b','2026-10-06','Mon: Lower + sled');
const WEEK=[SWAP_MON,SWAP_TUE,L('c','2026-10-07','Rest day',{duration:0}),L('d','2026-10-09','Thu: Hockey'),L('e','2026-10-10','Sat: HYROX sim')];
let fails=0;const check=(name,got,want)=>{const ok=got===want;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},logs);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
const tags=p=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.day-card')].map(c=>[c.dataset.day,((c.querySelector('.day-logged')||{}).textContent||'').replace(/\s+/g,' ').trim()])));
const next=p=>p.locator('.td-next').innerText().then(x=>x.replace(/\n+/g,' | ').replace(/ \| ›$/,''));
// Plan tags
let p=await open('2026-10-10T18:00:00',WEEK);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(600);
const t=await tags(p);
check('Mon card (its session was done on Tue)',t.Mon,'✓ Logged Tue');
check('Tue card (its own session was done on Mon)',t.Tue,'✓ Logged Mon');
check('Wed (Rest day log ignored)',t.Wed,'');
check('Thu hockey done on Fri',t.Thu,'✓ Logged Fri');
check('Fri (nothing logged)',t.Fri,'');
check('Sat done on its own date has no weekday',t.Sat,'✓ Logged');
check('yellow chip still marks today (Sat)',await p.evaluate(()=>document.querySelector('.day-head.today').closest('.day-card').dataset.day),'Sat');
await p.click('#nextWeek');await p.clock.runFor(400);check('next week has no tags',Object.values(await tags(p)).join(''),'');
await p.close();
// Today, Monday evening: only Tue's session logged on Monday
p=await open('2026-10-05T20:00:00',[SWAP_MON]);
check('Mon eve Done card names the session actually done',await p.locator('.td-done .td-label').innerText(),'DONE · TUE: RUN + ARMS');
check("Mon eve Up next is Mon's displaced session",await next(p),"Up next · Mon's session | Legs lift + EMOM | Trap bar · Hack · EMOM 16");await p.close();
// Tuesday morning: default to the open Monday session, not the Tue session already done
p=await open('2026-10-06T08:00:00',[SWAP_MON]);
check('Tue am default session',await p.locator('.tp-name').innerText(),'Legs lift + EMOM');
check('Tue am hint',await p.locator('.td-hint').innerText(),'Making up Mon. It is logged as today.');
check('Tue am Up next skips done Tue and rest Wed',await next(p),'Up next · Thursday | Hockey | Hockey');await p.close();
// Tuesday evening: both logged
p=await open('2026-10-06T20:00:00',[SWAP_MON,SWAP_TUE]);
check('Tue eve Done card',await p.locator('.td-done .td-label').innerText(),'DONE · MON: LEGS LIFT + EMOM');
check('Tue eve Up next',await next(p),'Up next · Thursday | Hockey | Hockey');await p.close();
// Plain missed day (no swap): Today stays on Tuesday, no make up in Up next
p=await open('2026-10-06T08:00:00',[]);
check('plain miss default session',await p.locator('.tp-name').innerText(),'Run + Arms');
check('plain miss hint',await p.locator('.td-hint').innerText(),'Not done yet: Mon. Tap the title to switch.');
check('plain miss Up next',await next(p),'Up next · Thursday | Hockey | Hockey');await p.close();
// Nothing swapped: Up next is tomorrow
p=await open('2026-10-05T20:00:00',[L('m','2026-10-05','Mon: Lower + sled')]);
check('normal Mon eve Up next',await next(p),'Up next · Tuesday | Run + Arms | 8 × 400 m · Arms');await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
