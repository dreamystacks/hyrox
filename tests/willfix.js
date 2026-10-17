// v101: one time fix for Will's Oct 17 sim (laps not tapped). node tests/willfix.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();await p.clock.install({time:new Date('2026-10-17T16:00:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');localStorage.setItem('hrx_will_logs_v2',JSON.stringify([{id:'1792264428356',date:'2026-10-17',week:3,session:'Sat: HYROX sim',duration:45,distance:4,pace:'5:45',stations:'SkiErg 1:51 · Sled push 2:20 · Sled pull 0:04 · Burpee broad jumps 0:04',notes:'Workout 46:07 · 4/4 exercises done\nSim week 3 · total 27:14\nRuns: 0:07 / 3:42 / 9:08 / 9:54\nLoads (lb): Sled push 250 (1/1) · Sled pull 195 (1/1)\nNote: Les temps sont pas bons.',updatedAt:'2026-10-17T19:13:48Z'}]))});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(4000);
const r=await p.evaluate(()=>{const x=getLogs('will')[0];return{st:x.stations,n:x.notes,dirty:Object.keys(load('hrx_dirty_v1',{})).includes('logs|will|1792264428356')}});
ok(r.st==='SkiErg 2:21 · Sled push 1:13 · Sled pull 1:52 · Burpee broad jumps 2:36','stations rewritten pro rata');
ok(/Sim week 3 · total 35:22/.test(r.n)&&/Runs: 6:30 \/ 6:48 \/ 6:54 \/ 7:06/.test(r.n)&&/Times estimated/.test(r.n)&&/Sled pull 170 \(1\/1\)/.test(r.n)&&/Sled push 250/.test(r.n),'total 35:22, runs, note added, same sled loads as Fred (250 / 170)');
ok(r.dirty,'queued for sync');
await p.reload();await p.clock.runFor(3000);ok(await p.evaluate(()=>(getLogs('will')[0].notes.match(/Times estimated/g)||[]).length)===1,'applies only once');
await b.close();console.log(f?f+' failed':'all passed');process.exit(f?1:0)})();
