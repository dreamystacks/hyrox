// v138: during a sim the big clocks show the sim time, not the workout time (Fred, Nov 7). node tests/simclock.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-11-07T12:00:00')});await p.goto(URL);await p.clock.runFor(5000);
await p.evaluate(()=>startWorkout(6,5,'2026-11-07'));await p.clock.runFor(600);
const clk=()=>p.evaluate(()=>[...document.querySelectorAll('#workout .wo-clk')].map(e=>e.textContent));
ok(!(await p.locator('#workout').innerText()).includes('Sim time'),'before the sim: workout time, no Sim label');
await p.clock.runFor(10*60000);// 10 min warm up
await p.locator('#simGo').click();await p.clock.runFor(1000);
await p.clock.runFor(65000);let c=await clk();
ok(c.every(t=>/^1:0[56]$/.test(t)),'sim running: both clocks show sim time '+c);
const tx=await p.locator('#workout').innerText();ok(/Sim time/i.test(tx)&&/Workout 11:\d\d/i.test(tx),'Sim time label, workout time in the small line');
ok(await p.locator('#workout .wo-bar .wo-clk-l').count()===1,'top bar says Sim');
// finish all laps
const n=await p.evaluate(()=>simSegments(PLAN[5]).length);
for(let i=0;i<n;i++){await p.evaluate(()=>simNextAct());await p.clock.runFor(5000)}
const fin=await p.evaluate(()=>{const x=woState();return fmt(x.sim.marks[x.sim.marks.length-1]-x.sim.t0)});
await p.clock.runFor(60000);c=await clk();ok(c.every(t=>t===fin),'after the last lap the clocks freeze at the sim total '+fin+' '+c);
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
