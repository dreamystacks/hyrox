// v107: deload weeks (4, 8, 12, 16, 20) cut volume, keep intensity. Lifts 3 sets at 80% of the last normal load,
// EMOM 12 min at normal loads (sleds and carries hold), Tuesday 4 intervals at normal pace, arms 3 sets, Saturday 75%.
// The next normal week builds from the last normal week, never from the deload loads. node tests/deload.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const L=(id,date,week,session,notes)=>({id,athlete:'fred',date,week,session,duration:60,rpe:7,knee:0,notes,savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z'});
const W3=[L('m3','2026-10-12',3,'Mon: Lower + sled','Workout 55:00\nLoads (lb): Trap-bar deadlift 300 (3/3 · RIR 2) · Hack squat 200 (3/3 · RIR 2) · Sled push 250 (10-20) · Farmers carry 53 (1/1)')];
const W4=L('m4','2026-10-19',4,'Mon: Lower + sled','Workout 50:00\nLoads (lb): Trap-bar deadlift 240 (3/3 · RIR 3+) · Hack squat 160 (3/3) · Sled push 250 (10-20) · Farmers carry 53 (1/1)');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_unit_v2',JSON.stringify('lb'));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_sledcfg_v2',JSON.stringify({sledpush:{kg:45.36,plates:{45:1}},sledpull:{kg:45.36,plates:{45:1}}}))},[logs]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-10-19T07:00:00',W3);
// plan content
const pl=await p.evaluate(()=>{const w=PLAN[3];return{mon:w.mon,tue:w.tue,fri:w.fri,sat:w.sat,km:w.runKm,all:[4,8,12,16,20].map(n=>PLAN[n-1]).every(x=>/3 x 5 @ 80%/.test(x.mon)&&/EMOM 12 min \(3 rounds\), normal loads/.test(x.mon)&&!/light/i.test(x.mon+x.fri)&&/^4 x /.test(x.tue)&&/3 sets each/.test(x.tue)&&!/2 sets/.test(x.tue+x.fri)&&/75%/.test(x.sat)&&/Weighted pull ups 3 x 5 @ 80%/.test(x.fri))}});
ok(pl.all,'every deload week: 3 sets @ 80%, EMOM 12 min at normal loads, 4 intervals, arms 3 sets, sim 75%');
ok(/^4 x 600 m, 90 s rest/.test(pl.tue)&&pl.km===12,'week 4 Tuesday 4 x 600 m, run km 12');
// Today card
const td=await p.locator('#today').innerText();
ok(/Trap bar deadlift\s*240 lb[^\n]*\s*3×5\s*80% of last/.test(td)&&!/Light/.test(td),'Today Monday card: clean name, 3×5 and an 80% of last chip');
ok(/240 lb/.test(td),'Today load chip: 80% of the last normal 300 lb = 240 lb');
ok(/EMOM 12′/.test(td),'Today shows EMOM 12′');
// workout mode
await p.evaluate(()=>startWorkout(4,0,'2026-10-19'));await p.clock.runFor(600);
const wo=await p.locator('#workout').innerText();
ok(/deload 80%/.test(wo),'workout: suggestion says deload 80%');
ok(await p.evaluate(()=>document.querySelectorAll('#workout .wo-item.sets')[0].querySelectorAll('.st-r[data-row]').length)===3,'workout: trap bar set table has 3 rows');
const em=await p.evaluate(()=>{const it=sessionItems('Mon',rawFor(PLAN[3],'mon','Mon'),PLAN[3]).find(i=>i.emom);return[suggestLoad('carry',4,null,1).kg,suggestLoad('carry',4,null,1).why,suggestLoad('trap',4).kg,it.emom.moves.length]});
ok(em[0]===55&&em[1]==='dlhold'&&em[2]===240,'EMOM farmers carry holds the normal 53 lb load (55 after the usual rounding), the lift drops to 240: '+JSON.stringify(em));
const sl=(await p.locator('#workout .emom .sl-why').first().innerText()).trim();ok(/deload week: same as last EMOM load/.test(sl),'sled card: deload holds the last EMOM load: '+sl);
ok(/250 lb/.test(await p.locator('#workout .emom .sl-sug span').first().innerText()),'sled suggestion stays 250 lb');
await p.evaluate(()=>closeWorkout&&closeWorkout());await p.close();
// Tuesday and Friday
p=await open('2026-10-20T07:00:00',W3);
ok(/4 × 600 m/.test(await p.locator('#today').innerText()),'Today Tuesday: 4 × 600 m');
await p.evaluate(()=>startWorkout(4,1,'2026-10-20'));await p.clock.runFor(600);
const lat=await p.evaluate(()=>{const it=[...document.querySelectorAll('#workout .wo-item.sets')].find(e=>/Lateral raises/i.test(e.innerText));return it?it.querySelectorAll('.st-r[data-row]').length:0});
ok(lat===3,'workout Tuesday: lateral raises 3 sets (deload), got '+lat);await p.close();
p=await open('2026-10-23T07:00:00',W3);const fr=await p.locator('#today').innerText();
ok(/Weighted pull-ups\s*3×5\s*80% of last/i.test(fr)&&/EMOM 12′/.test(fr),'Today Friday: weighted pull-ups 3×5 at 80%, EMOM 12′');
ok(await p.evaluate(()=>simPct(PLAN[3]))===75,'Saturday week 4 sim at 75%');
// Plan
await p.evaluate(()=>{currentWeek=4;showView('plan')});await p.clock.runFor(400);
const mon=await p.locator('.day-card[data-day=Mon]').innerText();ok(/EMOM 12\b/.test(mon),'Plan Monday row subtitle: '+mon.replace(/\n/g,' | ').slice(0,90));
ok(/\/\s*7\s*km/.test((await p.locator('#weekTrack .wk-tot').innerText()).replace(/\n/g,' ')),'Plan week tracker target 7 km (12 minus the Sunday run, v116)');
await p.close();
// week 5 builds from week 3, not from the deload
p=await open('2026-10-26T07:00:00',[W4,...W3]);
const w5=await p.evaluate(()=>[suggestLoad('trap',5).kg,suggestLoad('trap',5).last.kg,sledSuggest('sledpush',5,'Mon').total]);
ok(w5[1]===300&&w5[0]>300,'week 5 trap bar builds from the week 3 300 lb, not the deload 240: '+JSON.stringify(w5));
ok(Math.round(w5[2])===250,'week 5 sled base is the normal EMOM load');
const td5=await p.locator('#today').innerText();ok(!/80% of last/.test(td5),'week 5 Today has no 80% chip');
await p.close();
// coach prompt and Excel note
ok(/Deload weeks 4, 8, 12, 16, 20 \(plan change Oct 19/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains the new deload');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
