// v206 bpm per station and run on sims: gimpSimHR (merge and drop rule of gimpSimLaps, time weighted HR), the Seg HR line,
// runBpm from Seg HR, station rows with ♥, and the one time fix of Fred's Nov 22 sim (watch stations). node tests/seghr.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const LOG={id:'1795376087322',athlete:'fred',date:'2026-11-22',week:8,session:'Sat: HYROX sim',duration:40,distance:4,pace:'6:20',rpe:8,knee:0,stations:'SkiErg 2:45 · Sled push 0:04 · Sled pull 0:04 · Burpee broad jumps 3:13',notes:"Workout 39:12 · 5/5 exercises done\nSim week 8 · total 34:27\nRuns: 5:49 / 6:10 / 6:38 / 6:38\nLoads (lb): Sled push 280 (1/1) · Sled pull 190 (1/1)\nSim week 8 · total 34:12\nGarmin: 25166565313 · Indoor Running · avg HR 151 · max HR 169 · 424 kcal · 34 min\nLap HR: 135 / 152 / 157 / 151 / 158 / 144 / 158 / 145 / 142\nApp reps: 5:42 / 7:19 / 8:49 / 6:29 · 4 km · 7:05/km\nGarmin added after the workout (watch times kept)",savedAt:'2026-11-22T19:34:47.322Z',updatedAt:'2026-11-22T19:35:35.365Z'};
const LAPS=[[3.73,96],[345.27,135],[143.35,152],[370.6,157],[83.56,151],[398.97,158],[134.14,144],[398.04,158],[174.76,145],[15.78,142]].map(([s,hr])=>({s,hr}));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-11-22T14:40:00-05:00')});
await p.addInitScript(l=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([l]))},LOG);
await p.goto(URL);await p.waitForTimeout(4000);
const u=await p.evaluate(L=>{const W=PLAN[7],segs=simSegments(W);return{n:segs.length,hr:gimpSimHR(L,segs)}},LAPS);
ok(u.n===8&&JSON.stringify(u.hr)==='[135,152,157,151,158,144,158,145]','gimpSimHR maps the 10 watch laps to the 8 sim parts (start lap merged, last dropped)');
const x=await p.evaluate(()=>JSON.parse(localStorage.getItem('hrx_fred_logs_v2'))[0]);
ok(x.stations==='SkiErg 2:23 · Sled push 1:24 · Sled pull 2:14 · Burpee broad jumps 2:55','Nov 22 fix: stations from the watch laps');
ok((x.notes.match(/^Sim week .*$/mg)||[]).join('|')==='Sim week 8 · total 34:12','Nov 22 fix: one Sim line, the watch total');
ok(/^Seg HR: Run 135 · SkiErg 152 · Run 157 · Sled push 151/m.test(x.notes),'Nov 22 fix: Seg HR line written');
ok(await p.evaluate(()=>JSON.stringify(runBpm(getLogs()[0])))==='[135,157,158,158]','runBpm reads the runs from Seg HR');
await p.reload();await p.waitForTimeout(3500);
const ui=await p.evaluate(()=>({runs:[...document.querySelectorAll('#today .rc-bpm em')].map(e=>e.textContent.trim()),st:[...document.querySelectorAll('#today .rc-row .rc-sv em')].map(e=>e.textContent.trim()),notes:document.querySelector('#today').textContent}));
ok(ui.runs.join(',')==='♥ 135,♥ 157,♥ 158,♥ 158','report card: ♥ on each run');
ok(ui.st.join(',')==='♥ 152,♥ 151,♥ 144,♥ 145','report card: ♥ on each station');
ok(!/Seg HR/.test(ui.notes),'Seg HR line hidden');

ok(await p.evaluate(()=>(getLogs()[0].notes.match(/^Seg HR/mg)||[]).length===1),'fix applies once');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'ALL OK');process.exit(f?1:0)})();
