// v123: adaptive coach. coach.json athletes[who].plan["6"] rewrites days for that athlete only. Every surface follows
// (Today card, Up next, Plan row and sheet, workout, sim segments, km target, finish notes, Coach card), with an
// "Adjusted by coach" badge, the why and the original. Settings "Coach plan changes" off = original plan. Locked weeks ignored.
// node tests/adaptive.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const SAT='Half sim, 75%, half volume, all 8 stations in race order: 8 x (1 km run + station at half volume)';
const COACH={week:5,generated:'2026-10-31T23:00:00Z',athletes:{fred:{headline:'Runs are the lever',summary:'Good week.',tweaks:[],plan:{
 '6':{sat:{text:SAT,why:'Full 1 km runs: you and Will felt ready for more running, stations stay at half'},runKm:17},
 '9':{sat:{text:'Half sim, 50%',why:'should be ignored, full sim week'}},
 '11':{tue:{text:'Rest',why:'ignored, Nashville week'}},'7':{mon:{text:'Just vibes',why:'invalid, no EMOM'}}}},will:{headline:'x',tweaks:[]}}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,who='fred')=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(([w])=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1');localStorage.setItem(`hrx_${w}_unit_v2`,JSON.stringify('lb'))},[who]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);
 await p.evaluate(c=>{window.COACH=c;refreshViews()},COACH);await p.clock.runFor(300);return p};
let p=await open('2026-11-06T07:00:00');
const d=await p.evaluate(()=>({sat:PLAN[5].sat,orig:PLAN0[5].sat,km:PLAN[5].runKm,mon:PLAN[5].mon===PLAN0[5].mon,w9:PLAN[8].sat===PLAN0[8].sat,w11:PLAN[10].tue===PLAN0[10].tue,w7:PLAN[6].mon===PLAN0[6].mon,runs:simSegments(PLAN[5]).filter(s=>s.kind==='run').map(s=>s.km),json:JSON.parse(JSON.stringify(PLAN))[5].sat}));
ok(d.sat.includes('1 km run')&&d.orig.includes('500 m run'),'PLAN week 6 Saturday follows the coach, PLAN0 keeps the original');
ok(d.km===17&&d.mon,'runKm override 17, untouched days stay original');
ok(d.w7,'invalid override (Monday text without its EMOM) falls back to PLAN');ok(d.w9&&d.w11,'locked weeks ignored (full sim week 9 Saturday, Nashville week 11)');
ok(d.runs.length===8&&d.runs.every(k=>k===1),'sim segments: 8 runs of 1 km '+JSON.stringify(d.runs));
ok(d.json.includes('1 km run'),'JSON copy of PLAN carries the override');
// Today Friday: Up next is Saturday with the badge
const td=await p.locator('#today').innerText();ok(/Up next[\s\S]*Adjusted by coach/.test(td),'Up next shows Adjusted by coach for Saturday');
// Plan row and sheet
await p.evaluate(()=>{currentWeek=6;showView('plan')});await p.clock.runFor(400);
ok(await p.locator('.day-card[data-day=Sat] .day-head .adj-m').count()===1&&await p.locator('.day-card[data-day=Mon] .day-head .adj-m').count()===0,'Plan Saturday row has the Coach pill, Monday does not');
await p.locator('.day-card[data-day=Sat] .day-head').click();await p.clock.runFor(300);
const sh=await p.locator('.day-card[data-day=Sat] .day-body').innerText();
ok(/Adjusted by coach/.test(sh)&&/you and Will felt ready/.test(sh)&&/Original: Half sim[^\n]*500 m run/.test(sh),'Plan sheet: badge, why and original');
ok(/1 km run/.test(await p.locator('.day-card[data-day=Sat] .day-body').textContent()),'Plan sheet plan text is the coach version');
ok(/\/\s*12\s*km/.test((await p.locator('#weekTrack').innerText()).replace(/\n/g,' ')),'Plan km tracker uses runKm 17 (12 without the Sunday 5 km): '+(await p.locator('#weekTrack').innerText()).replace(/\n/g,' '));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/adj-sheet.png'});
await p.evaluate(()=>daySheetClose());
// Coach card
await p.evaluate(()=>showView('bench'));await p.clock.runFor(400);
const cc=await p.locator('#coachWrap').innerText();ok(/Plan changes from the coach[\s\S]*Sat[\s\S]*Week 6: Full 1 km runs/i.test(cc)&&!/should be ignored/.test(cc),'Coach card lists the change (not the locked ones)');
await p.close();
// Saturday: Today card, workout, finish note
p=await open('2026-11-07T08:00:00');
const t7=await p.locator('#today .td-session').innerText();ok(/Adjusted by coach/.test(t7)&&/1 km/.test(await p.locator('#today .td-session').textContent()),'Today Saturday card: badge and 1 km runs');
await p.evaluate(()=>startWorkout(6,5,'2026-11-07'));await p.clock.runFor(600);
ok(/Adjusted by coach/.test(await p.locator('#workout').innerText()),'workout shows the badge');
const notes=await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return window.__p.notes});
ok(/Plan: coach adjusted \(week 6\)/.test(notes),'finish notes: Plan: coach adjusted (week 6)');
await p.evaluate(()=>closeWorkout());
// Settings toggle
await p.evaluate(()=>$('adjRow').click());await p.clock.runFor(200);
ok(await p.evaluate(()=>PLAN[5].sat===PLAN0[5].sat&&localStorage.getItem('hrx_fred_planorig_v2')==='1'&&$('adjVal').textContent==='Off'),'Settings off: original plan');
ok(!/Adjusted by coach/.test(await p.locator('#today').innerText()),'Today drops the badge when off');
await p.evaluate(()=>$('adjRow').click());await p.clock.runFor(200);ok(await p.evaluate(()=>PLAN[5].sat.includes('1 km run')),'Settings on again: coach plan back');
// viewing Will: his plan is the original
ok(await p.evaluate(()=>{viewAthlete='will';const r=PLAN[5].sat===PLAN0[5].sat;viewAthlete=null;return r}),'Will (no plan in coach.json) sees the original');
await p.close();
p=await open('2026-11-07T08:00:00','will');ok(!/Adjusted by coach/.test(await p.locator('#today').innerText()),'Will\'s phone: no badge, original Saturday');await p.close();
// coach prompt
const pr=fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8');ok(/Adaptive plan \(v123/.test(pr)&&/"plan"/.test(pr),'coach prompt explains the plan field');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
