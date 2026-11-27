// v229 one time fix of Fred's Nov 27 half sim (watch RoxZone laps off by one; SkiErg lap ran 150 m into run 2). node tests/simfix27.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const LOG={id:'1795807343817',date:'2026-11-27',session:'Sat: HYROX sim',duration:55,distance:4,pace:'7:05',rpe:10,knee:0,stations:'SkiErg 0:05 · Sled push 5:11 · Sled pull 4:31 · Burpee broad jumps 7:03',notes:'Workout 56:38 · 5/5 exercises done\nSim week 9 · total 45:13\nRuns: 12:03 / 4:09 / 5:18 / 6:50\nLoads (lb): Sled push 325 (1/1) · Sled pull 225 (1/1)\nPlan: moved from Sat to Fri (week 9)\nGarmin: 25218616680 · Indoor Running · avg HR 149 · max HR 198 · 677 kcal · 56 min\nWatch sim week 9 · total 50:00',updatedAt:'2026-11-27T19:22:23.817Z'};
for(const withG of [true,false]){const lg=Object.assign({},LOG,withG?{}:{notes:LOG.notes.replace(/\nGarmin:[^\n]*\nWatch sim[^\n]*/,'')});
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(l=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([l]))},lg);
await p.clock.install({time:new Date('2026-11-27T15:00:00')});await p.goto(URL);await p.clock.runFor(5000);
const x=await p.evaluate(()=>load(k('logs'),[])[0]);const tag=withG?'(with Garmin line) ':'(app only) ';
ok(x.stations==='SkiErg 3:43 · Sled push 3:28 · Sled pull 4:08 · Burpee broad jumps 6:50',tag+'stations from the watch laps');
ok(/^Sim week 9 · total 44:40$/m.test(x.notes)&&(x.notes.match(/^Sim week/mg)||[]).length===1&&!/Watch sim week/.test(x.notes),tag+'one Sim line, total 44:40');
ok(/^Runs: 5:49 \/ 6:49 \/ 7:00 \/ 6:54$/m.test(x.notes)&&(x.notes.match(/^Runs:/mg)||[]).length===1&&x.pace==='6:38'&&x.distance===4,tag+'runs and pace');
ok(/^Seg HR: Run 146 · SkiErg 163/m.test(x.notes)&&/^Loads \(lb\): Sled push 325/m.test(x.notes)&&(!withG||/^Garmin: 25218616680/m.test(x.notes)),tag+'Seg HR added, Loads and Garmin lines kept');
ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}'))&&await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}')).some(k=>/logs\|fred\|1795807343817/.test(k))),tag+'queued for sync');
const n1=x.notes;await p.reload();await p.clock.runFor(5000);ok(await p.evaluate(()=>load(k('logs'),[])[0].notes)===n1,tag+'applies once');
const card=await p.locator('#today').innerText();ok(/44:40/.test(card)&&/5:49/.test(card)&&/3:43/.test(card),tag+'Today report card shows the fixed sim');
await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
