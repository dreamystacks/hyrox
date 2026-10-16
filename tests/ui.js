// Oct 11 fixes: Rest day logs never hide a real result on a Plan card, compact workout strip, no layout shift and no page bleed while typing, EMOM distances instead of calories, DB bench 3x8. node tests/ui.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const L=(id,date,session,extra)=>Object.assign({id,date,week:2,session,duration:45,rpe:8,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z'},extra||{});
const logs=[L('a','2026-10-05','Mon: Lower + sled'),L('b','2026-10-06','Rest day',{duration:0}),L('c','2026-10-07','Tue: Run + arms A',{distance:3.2,pace:'5:20'}),L('d','2026-10-08','Thu: Hockey'),L('e','2026-10-09','Rest day',{duration:0}),L('f','2026-10-10','Sat: HYROX sim'),L('g','2026-10-11','Fri: Upper + erg + arms B',{duration:55})];
await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},logs);
await p.clock.install({time:new Date('2026-10-11T15:40:00')});await p.goto(URL);await p.clock.runFor(5000);
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(600);
const card=d=>p.locator(`.day-card[data-day=${d}] .day-mid`).innerText();
const tue=await card('Tue'),fri=await card('Fri');
ok(/^Rest day\nPlanned: Run \+ Arms · moved to Wed$/.test(tue),'Tue card (diary): Rest day, planned Run + Arms moved to Wed: '+tue.replace(/\n/g,' | '));
ok(/^Rest day\nPlanned: Upper \+ EMOM · moved to Sun$/.test(fri),'Fri card (diary): Rest day, Upper + EMOM moved to Sun: '+fri.replace(/\n/g,' | '));
const wed=await card('Wed');ok(/^Run \+ Arms\nPlanned: Rest/.test(wed)&&/3.2 km/.test(wed),'Wed card shows the Run + Arms done that day: '+wed.replace(/\n/g,' | '));
ok(/^Upper \+ EMOM\nPlanned: Recovery/.test(await card('Sun')),'Sun card shows Upper + EMOM, planned Recovery');
await p.screenshot({path:OUT+'/ui-plan.png',fullPage:true});
// plan text: no calories, DB bench 3x8
ok(await p.evaluate(()=>PLAN.every(w=>!/\d+ cal\b/.test(w.fri||''))),'no calorie targets left in the plan');
ok(await p.evaluate(()=>/SkiErg 150 m/.test(PLAN[1].fri)&&/row 150 m/.test(PLAN[1].fri)&&/DB bench 3 x 8/.test(PLAN[1].fri)),'week 2 Friday: SkiErg 150 m, row 150 m, DB bench 3 x 8');
// workout: compact rest strip, no page bleed, dock keeps its space while typing
await p.evaluate(()=>startWorkout(3,4,'2026-10-16'));await p.clock.runFor(600);
await p.evaluate(()=>startRest(150,'Rest after set 1'));await p.clock.runFor(300);
const rh=await p.locator('#woRest').evaluate(e=>e.getBoundingClientRect().height);ok(rh<135,'rest card stays compact ('+Math.round(rh)+' px, was about 240 before v73)');
const sh=await p.locator('.wo-sticky').evaluate(e=>e.getBoundingClientRect().height);ok(sh<200,'whole top bar under 200 px with the v83 rest card ('+Math.round(sh)+')');
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('main.shell')).visibility==='hidden'),'page behind the workout is hidden');
await p.screenshot({path:OUT+'/ui-rest.png'});
await p.evaluate(()=>{restEnd=0;renderWorkout()});await p.clock.runFor(200);const W=p.locator('#workout');await W.evaluate(e=>e.scrollTop=e.scrollHeight);await p.clock.runFor(200);
const before=await W.evaluate(e=>[e.scrollTop,e.scrollHeight]);await p.focus('#woNote');await p.clock.runFor(300);
const after=await W.evaluate(e=>[e.scrollTop,e.scrollHeight]);
ok(before[1]===after[1],'focusing a notes box does not change the page height ('+before[1]+' → '+after[1]+')');
ok(await p.evaluate(()=>getComputedStyle(document.querySelector('.wo-dock')).visibility==='hidden'),'dock invisible while typing');
const em=await p.locator('#workout .em-moves').innerText();ok(/SkiErg 150 m/i.test(em)&&!/cal/.test(em),'EMOM shows SkiErg 150 m, no calories');
// Today card shows the suggested load before Start (Fred, Oct 13)
await p.evaluate(()=>{closeWorkout&&closeWorkout();localStorage.removeItem(k('workout'));const L=getLogs();L.push({id:'h',date:'2026-10-12',week:3,session:'Other',duration:40,notes:'',savedAt:'2026-10-12T20:00:00Z',updatedAt:'2026-10-12T20:00:00Z'});store(k('logs'),L)});
await p.clock.setSystemTime(new Date('2026-10-13T19:00:00'));await p.evaluate(()=>{const L=getLogs();L.push({id:'i',date:'2026-10-05',week:2,session:'Mon: Lower + sled',duration:45,notes:'Loads (lb): Trap-bar deadlift 205 (3/3 · RIR 2)',savedAt:'2026-10-05T20:00:00Z',updatedAt:'2026-10-05T20:00:00Z'});store(k('logs'),L);showView('today')});await p.clock.runFor(400);
await p.evaluate(()=>{document.body.classList.remove('focus');const s=document.getElementById('sessionPick');s.value='Mon: Lower + sled';s.dispatchEvent(new Event('change',{bubbles:true}))});await p.clock.runFor(400);
const tr=await p.locator('.td-session .exercise').first().innerText();ok(/215 lb · 85\/side/.test(tr),'Today trap bar row shows 215 lb · 85/side before Start: '+tr.replace(/\n/g,' | '));
ok(!errs.length,'no page errors '+errs.join('|'));
console.log(fails?fails+' FAILED':'ALL OK');await b.close();process.exit(fails?1:0)})();
