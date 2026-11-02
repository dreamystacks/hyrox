// v130: more running (Fred, Nov 1: "HYROX is a runner race"). Sunday zone 2 grows to 6 to 10 km in weeks 7 to 24,
// Tuesday intervals get one more rep in weeks 9, 10, 14, 17, 21, 22, 23, runKm follows. node tests/morerun.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','will');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2027-01-16T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);
const d=await p.evaluate(()=>PLAN.map(w=>({n:w.week,sun:sunKm(w),km:w.runKm,core:coreKm(w),tue:(w.tue.match(/^(\d+) x/)||[])[1]})));
const S={3:5,4:5,5:5,6:5,7:6,8:6,9:7,10:7,12:7,13:8,14:8,15:9,16:8,17:9,18:10,19:6,20:8,21:7,22:10,23:10,24:6};
ok(Object.entries(S).every(([n,k])=>d[n-1].sun===k),'Sunday km per week '+JSON.stringify(d.map(x=>x.sun)));
ok(d[8].tue==='7'&&d[13].tue==='9'&&d[20].tue==='4'&&d[22].tue==='9'&&d[11].tue==='4','Tuesday one more rep (deloads unchanged)');
ok(Math.max(...d.map(x=>x.km))===27&&d[20].km===27,'peak week 21 at 27 km');
ok(d.every(x=>Math.abs(x.km-x.sun-x.core)<0.01),'core target is runKm minus Sunday');
// week 16 (Jan 16 is a Saturday): Up next shows the longer Sunday
const nx=await p.locator('#today').innerText();ok(/Zone 2 · 45 to 55 min/.test(nx),'Up next: Sunday week 16 Zone 2 45 to 55 min');
await p.evaluate(()=>{currentWeek=17;showView('plan')});await p.clock.runFor(400);
ok(/50 to 60 min/.test(await p.locator('.day-card[data-day=Sun]').evaluate(c=>c.textContent)),'Plan week 17 Sunday 50 to 60 min');
ok(/5 x 2 km/.test(await p.locator('.day-card[data-day=Tue]').evaluate(c=>c.textContent)),'Plan week 17 Tuesday 5 x 2 km');
ok(/\/\s*14\s*km/.test((await p.locator('#weekTrack').innerText()).replace(/\n/g,' ')),'Plan week 17 km target 14 without Sunday');
ok(/More running \(v130/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains it');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
