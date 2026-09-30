// Smoke test: node tests/smoke.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.clock.install({time:new Date('2026-09-28T16:00:00')});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
const plan=await p.evaluate(()=>[1,9,22].map(n=>{const w=PLAN[n-1];return n+' MON '+sessionItems('Mon',w.mon,w).map(x=>x.title).join(' | ')+' // FRI '+sessionItems('Fri',w.fri,w).map(x=>x.title).join(' | ')}).join('\n'));console.log(plan);
for(const v of ['plan','bench','guides','today'])await p.evaluate(v=>showView(v),v);
await p.evaluate(()=>startWorkout(1,0,'2026-09-28'));await p.clock.runFor(500);
console.log('workout items:',await p.locator('#workout .wo-item').count());
await p.screenshot({path:path.resolve(__dirname,'smoke.png')});
console.log(errs.length?'ERRORS '+JSON.stringify(errs):'OK no page errors');await b.close();process.exit(errs.length?1:0)})();
