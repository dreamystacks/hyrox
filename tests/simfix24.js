// v118: one time fix of Fred's Oct 24 sim (sled pull lap tapped 15 s late). node tests/simfix24.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([{id:'s',athlete:'fred',date:'2026-10-24',week:4,session:'Sat: HYROX sim',duration:40,distance:4,rpe:9,stations:'SkiErg 2:12 · Sled push 1:20 · Sled pull 2:22 · Burpee broad jumps 2:19',notes:'Workout 42:10 · 4/4 exercises done\nSim week 4 · total 32:25\nRuns: 5:22 / 5:58 / 6:20 / 6:29',updatedAt:'2026-10-24T18:17:30Z'}]))});
await p.clock.install({time:new Date('2026-10-24T15:00:00')});await p.goto(URL);await p.clock.runFor(5000);
const x=await p.evaluate(()=>getLogs('fred')[0]);ok(/Sled pull 2:07/.test(x.stations)&&/Runs: 5:22 \/ 5:58 \/ 6:20 \/ 6:44/.test(x.notes)&&/total 32:25/.test(x.notes)&&/corrected by 15 s/.test(x.notes),'sled pull 2:07, run 4 6:44, total kept, note added');
await p.reload();await p.clock.runFor(5000);const y=await p.evaluate(()=>getLogs('fred')[0]);ok((y.notes.match(/corrected/g)||[]).length===1&&/Sled pull 2:07/.test(y.stations),'applies once');
ok(await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}')).some(k=>/logs\|fred\|s/.test(k))),'queued for sync');
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
