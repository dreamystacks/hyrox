// Workout dock, ghost tap guard, lap filter, last time line, race totals, assisted pull-up, lock screen setting. node tests/dock.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const go=async(date)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.clock.install({time:new Date(date)});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);return p};
const dockTxt=p=>p.locator('.wo-dock').innerText();
// ---- Monday: sets, rest, RIR, last time, EMOM race totals ----
let p=await go('2026-10-12T17:00:00');
await p.evaluate(()=>{store(k('logs'),[{id:'a1',date:'2026-10-05',week:2,session:'Mon: Lower + sled',duration:45,rpe:8,knee:0,notes:'Workout 43:18\nLoads (lb): Trap-bar deadlift 205 (3/3 · RIR 2) · Hack squat 150 (3/3 · RIR 3+) · Sled push 190 (10-20)\nTrap-bar deadlift: 70 first set, 80 second, 95 last set. Each side',savedAt:'2026-10-06T01:02:31Z',updatedAt:'2026-10-06T01:02:31Z'}])});
await p.evaluate(()=>startWorkout(3,0,'2026-10-12'));await p.clock.runFor(600);
let t=await dockTxt(p);ok(/Set 1 of 3 done/.test(t)&&/Trap/.test(t),'dock starts on Set 1 of the trap bar: '+t.replace(/\n/g,' | '));
const wl=await p.locator('#workout .wo-last').first().innerText();ok(/Last time Mon, Oct 5: 205 lb · 3\/3 sets · RIR 2/.test(wl)&&/95 last set/.test(wl),'last time line with sets, RIR and note: '+wl);
const em=await p.locator('#workout .em-moves').innerText();ok(/Today \d+ × 24 m = \d+ m/.test(em)&&/HYROX race: 50 m/.test(em),'EMOM sled push shows today total and race distance: '+em.replace(/\n/g,' | ').slice(0,400));
await p.screenshot({path:OUT+'/dock-mon.png'});
await p.click('.dk-b');await p.clock.runFor(300);t=await dockTxt(p);ok(/Skip rest/.test(t),'after a set the dock offers Skip rest');
await p.click('.dk-b');await p.clock.runFor(300);ok(/Skip rest/.test(await dockTxt(p)),'second tap inside 1.2 s is ignored');
await p.clock.runFor(1300);await p.click('.dk-b');await p.clock.runFor(300);t=await dockTxt(p);ok(/Set 2 of 3 done/.test(t),'tap after the lock skips rest, dock moves to set 2');
for(let i=0;i<2;i++){await p.clock.runFor(1300);await p.click('.dk-b');await p.clock.runFor(1300);if(/Skip rest/.test(await dockTxt(p)))await p.click('.dk-b')}
await p.clock.runFor(1300);t=await dockTxt(p);ok(/Reps left in the tank/.test(t)&&await p.locator('.dk-c').count()===5,'after the last set the dock asks RIR with 5 buttons');
await p.locator('.dk-c').nth(2).click();await p.clock.runFor(300);ok(await p.evaluate(()=>Object.values(woState().rir||{}).includes('2')),'RIR 2 saved from the dock');
t=await dockTxt(p);ok(/Set 1 of 3 done/.test(t)&&/Hack/.test(t),'dock moves on to the hack squat');
await p.evaluate(()=>document.querySelector('#woNote').focus());await p.clock.runFor(200);ok(!(await p.locator('.wo-dock').isVisible()),'dock hidden while typing');
ok(!p.errs.length,'no page errors (Mon) '+p.errs.join('|'));await p.close();
// ---- Saturday sim: double tap guard ----
p=await go('2026-10-10T13:00:00');await p.evaluate(()=>startWorkout(2,5,'2026-10-10'));await p.clock.runFor(600);
t=await dockTxt(p);ok(/Start sim/.test(t),'Saturday dock starts the sim: '+t.replace(/\n/g,' | '));
await p.click('.dk-b');await p.clock.runFor(100);await p.click('.dk-b');await p.clock.runFor(100);
ok(await p.evaluate(()=>woState().sim&&woState().sim.marks.length===0),'double tap on Start sim logs no lap');
await p.clock.runFor(1500);await p.click('.dk-b');await p.clock.runFor(200);ok(await p.evaluate(()=>woState().sim.marks.length===0),'Next 1.6 s after start is ignored');
t=await dockTxt(p);ok(/Next → RowErg/.test(t)&&/\d:\d\d/.test(t),'dock shows Next → RowErg with the lap timer');
await p.screenshot({path:OUT+'/dock-sim.png'});
await p.clock.runFor(170000);await p.click('.dk-b');await p.clock.runFor(200);ok(await p.evaluate(()=>woState().sim.marks.length===1),'real lap after 2:50 is logged');
ok(await p.locator('#workout .sim-strip #simNext').count()===0&&await p.locator('.wo-dock #simNext').count()===1,'Next button lives only in the dock');
await p.evaluate(()=>dockAct&&(dockLock=0));await p.evaluate(()=>navigator.mediaSession&&1);
ok(!p.errs.length,'no page errors (Sat) '+p.errs.join('|'));await p.close();
// ---- Tuesday intervals: rep guard and lap filter ----
p=await go('2026-10-13T17:00:00');await p.evaluate(()=>startWorkout(3,1,'2026-10-13'));await p.clock.runFor(600);
t=await dockTxt(p);ok(/Start rep 1 of/.test(t),'Tuesday dock starts rep 1: '+t.replace(/\n/g,' | '));
await p.click('.dk-b');await p.clock.runFor(1300);await p.click('.dk-b');await p.clock.runFor(200);ok(await p.evaluate(()=>!!woState().rep),'stop within 3 s is ignored');
await p.evaluate(()=>{const y=woState();y.times={};y.times[y.rep.parent]=[20000,125000,128000];y.rep=null;woSave(y)});
await p.evaluate(()=>finishWorkout());await p.clock.runFor(300);const nt=await p.evaluate(()=>finPayload.notes);
ok(/Runs: 2:05 \/ 2:08/.test(nt)&&!/0:20/.test(nt),'a 20 s lap on a 400 m rep is dropped: '+(nt.match(/Runs: [^\n]*/)||[''])[0]);
ok(!p.errs.length,'no page errors (Tue) '+p.errs.join('|'));await p.close();
// ---- Friday: assisted pull-up ----
p=await go('2026-10-16T17:00:00');
await p.evaluate(()=>{store(k('logs'),[{id:'b1',date:'2026-10-09',week:2,session:'Fri: Upper + erg + arms B',notes:'Loads (lb): Assisted pull-up 70 (3/3 · RIR 3+)',savedAt:'2026-10-09T20:00:00Z',updatedAt:'2026-10-09T20:00:00Z'}]);store(k('assist'),{pullup:true})});
ok(await p.evaluate(()=>parseLoads(getLogs()[0])[0].ek==='pullup'&&parseLoads(getLogs()[0])[0].as===true),'"Assisted pull-up" parses as pullup, assisted');
const sg=await p.evaluate(()=>suggestLoad('pullup',3,null));ok(sg&&sg.kg<70,'assisted, RIR 3+: suggestion lowers assistance ('+(sg&&sg.kg)+')');
await p.evaluate(()=>startWorkout(3,4,'2026-10-16'));await p.clock.runFor(600);
ok(await p.locator('[data-assist=pullup].on').count()===1,'pull-up row shows the assisted toggle on');
await p.screenshot({path:OUT+'/dock-fri.png'});
await p.evaluate(()=>finishWorkout());await p.clock.runFor(300);ok(/Assisted pull-up \d/.test(await p.evaluate(()=>finPayload.notes)),'Loads line writes Assisted pull-up');
await p.evaluate(()=>{store(k('assist'),{})});ok(await p.evaluate(()=>{const s=suggestLoad('pullup',3,null);return !s||s.why==='plan'||s.kg!==undefined}),'toggle off: assisted history not used as added weight');
// lock screen setting
await p.evaluate(()=>{const f=document.getElementById('finish');if(f)f.classList.remove('show')});
await p.evaluate(()=>avatarBtn.click());await p.clock.runFor(200);ok(/On/.test(await p.locator('#lockVal').innerText()),'Lock screen controls default On');
await p.evaluate(()=>lockRow.click());await p.clock.runFor(100);ok(/Off/.test(await p.locator('#lockVal').innerText())&&await p.locator('#settingsModal.show').count()===1,'toggle Off, sheet stays open');
ok(!p.errs.length,'no page errors (Fri) '+p.errs.join('|'));await p.close();
console.log(fails?fails+' FAILED':'ALL OK');await b.close();process.exit(fails?1:0)})();
