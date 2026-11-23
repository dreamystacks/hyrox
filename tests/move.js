// v196: move a session to another day, this week only (synced checks "mv-<week>"). Plan sheet button, picker of free days, source row Moved, destination row with the session and Moved from, Today default and hint on the day, Up next, finish note, states (no Missed on the source), Move it back. node tests/move.js
const {chromium}=require('playwright'),path=require('path');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async t=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');if(!localStorage.getItem('hrx_fred_checks_v2'))localStorage.setItem('hrx_fred_checks_v2',JSON.stringify({'mv-9':''}))/* v214: clear Fred's default week 9 moves */});await p.clock.install({time:new Date(t)});await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.clock.runFor(4500);return p};
let p=await open('2026-11-23T09:00:00');// Monday week 9
await p.evaluate(()=>{showView('plan')});await p.clock.runFor(400);
await p.locator('.day-card[data-day=Fri] .day-head').click();await p.clock.runFor(400);
ok(await p.locator('.day-card[data-day=Fri] [data-mvday]').count()===1,'Friday sheet offers Move to another day');
await p.locator('.day-card[data-day=Fri] [data-mvday]').click();await p.clock.runFor(400);
const opts=await p.locator('#pickList .lr b').allInnerTexts();ok(opts.some(t=>/Wednesday/.test(t))&&!opts.some(t=>/Tuesday|Saturday|Thursday/.test(t)),'picker lists free days only: '+opts.join(' / '));
await p.locator('#pickList .lr',{hasText:'Wednesday'}).click();await p.clock.runFor(600);
ok(await p.evaluate(()=>JSON.stringify(mvMap(9,'fred')))==='{"Fri":"Wed"}','stored as mv-9 {"Fri":"Wed"}');
await p.evaluate(()=>{document.querySelectorAll('.day-card.open').forEach(c=>c.classList.remove('open'));renderPlan()});await p.clock.runFor(300);
const fri=await p.locator('.day-card[data-day=Fri] .day-head').innerText(),wed=await p.locator('.day-card[data-day=Wed] .day-head').innerText();
ok(/Moved to Wed this week/.test(fri)&&/Moved/.test(fri),'Friday row: Moved to Wed · '+fri.replace(/\n/g,' | '));
ok(/Upper/.test(wed)&&/Moved from Fri/.test(wed)&&/Upcoming/.test(wed),'Wednesday row: the session, Moved from Fri, Upcoming · '+wed.replace(/\n/g,' | '));
await p.evaluate(()=>showView('today'));await p.clock.runFor(300);
await p.close();
p=await open('2026-11-25T09:00:00');// Wednesday: storage carries over? new page = fresh storage, so set the move again
await p.evaluate(()=>{mvStore(9,'Fri','Wed');refreshViews()});await p.clock.runFor(400);
const td=await p.locator('#today').innerText();ok(/Moved from Fri/.test(td)&&/Upper/.test(await p.locator('#today .tp-name').innerText()),'Today on Wednesday shows the Friday session with Moved from Fri');
await p.evaluate(()=>{showView('plan')});await p.clock.runFor(300);await p.locator('.day-card[data-day=Wed] .day-head').click();await p.clock.runFor(300);
ok(await p.locator('.day-card[data-day=Wed] [data-start]').count()===1,'Wednesday sheet has Start workout');
ok((await p.locator('.day-card[data-day=Wed] [data-start]').getAttribute('data-start'))==='9|4|2026-11-25','Start runs Friday (index 4) on Wednesday');
await p.evaluate(()=>{startWorkout(9,4,'2026-11-25')});await p.clock.runFor(500);await p.evaluate(()=>finishWorkout());await p.clock.runFor(300);
ok(/Plan: moved from Fri to Wed \(week 9\)/.test(await p.evaluate(()=>finPayload.notes)),'finish notes carry the move');
await p.close();
p=await open('2026-11-27T09:00:00');// Friday, moved session not done yet on Wed
await p.evaluate(()=>{mvStore(9,'Fri','Wed');refreshViews();showView('plan')});await p.clock.runFor(400);
const wedS=await p.locator('.day-card[data-day=Wed] .day-head').innerText(),friS=await p.locator('.day-card[data-day=Fri] .day-head').innerText();
ok(/To do/.test(wedS),'missed destination this week shows To do: '+wedS.replace(/\n/g,' | '));ok(/Moved/.test(friS)&&!/To do|Today/.test(friS),'source stays Moved on its own day');
const stt=await p.evaluate(()=>seasonStates('fred')[8].map(d=>d.day+':'+d.st).join(','));ok(/Fri:rest/.test(stt)&&/Wed:missed/.test(stt),'season states: '+stt);
await p.locator('.day-card[data-day=Fri] .day-head').click();await p.clock.runFor(300);await p.locator('.day-card[data-day=Fri] [data-mvundo]').click();await p.clock.runFor(400);
ok(await p.evaluate(()=>JSON.stringify(mvMap(9,'fred')))==='{}','Move it back clears the move');
ok(!errs.length,'no page errors '+errs.join(' | '));console.log(f?f+' FAILED':'ALL OK');await b.close();process.exit(f?1:0)})();
