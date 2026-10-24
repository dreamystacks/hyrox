// v116: the weekly km target leaves the Sunday zone 2 run out; the bar has a core part, a gap, and a faded Sunday part that fills
// when the Sunday run is logged. Today and Plan trackers, Coach report and trend targets, coach prompt. node tests/kmbar.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const L=(id,date,week,session,distance)=>({id,athlete:'fred',date,week,session,duration:40,distance,rpe:6,notes:'',updatedAt:date+'T20:00:00Z',savedAt:date+'T20:00:00Z'});
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs,w=390)=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},[logs]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
const bar=p=>p.evaluate(sel=>{const el=document.querySelector(sel);const c=el.querySelector('.km-core'),s=el.querySelector('.km-sun');return{n:el.closest('.wk3-i').querySelector('.wk3-n').textContent.replace(/\s+/g,''),core:c&&c.querySelector('i').style.width,sun:s&&s.querySelector('i').style.width,cw:c&&Math.round(c.getBoundingClientRect().width),sw:s&&Math.round(s.getBoundingClientRect().width),over:el.classList.contains('over'),gap:s&&Math.round(s.getBoundingClientRect().left-c.getBoundingClientRect().right)}},'#today .km2');
ok(true,'');
let p=await open('2026-10-24T12:00:00',[L('t','2026-10-21',4,'Tue: Intervals + arms A',2.4)]);
const fx=await p.evaluate(()=>[sunKm(PLAN[3]),coreKm(PLAN[3]),sunKm(PLAN[24]),coreKm(PLAN[24]),sunKm(PLAN[10]),coreKm(PLAN[10]),sunKm(PLAN[0])]);
ok(JSON.stringify(fx)==='[5,7,4,14,0,14,0]','Sunday km per week: week 4 5 (core 7), week 25 4, week 11 optional 0, week 1 rest 0 '+JSON.stringify(fx));
let t=await bar(p);ok(t.n==='2.4/7km','Today fraction 2.4/7 km: '+t.n);
ok(t.core==='34.2857%'&&t.sun==='0%','core part 34% filled, Sunday part empty '+JSON.stringify(t));
ok(t.gap>=2&&t.sw<t.cw&&t.sw>0,'gap between parts, Sunday part narrower '+JSON.stringify(t));
ok(await p.evaluate(()=>{const s=document.querySelector('#today .km-sun'),c=document.querySelector('#today .km-core');return getComputedStyle(s).backgroundColor!==getComputedStyle(c).backgroundColor}),'Sunday part is faded');
await p.evaluate(()=>{currentWeek=4;showView('plan')});await p.clock.runFor(400);
ok(/2\.4\/7km/.test(await p.locator('#weekTrack').evaluate(e=>e.textContent.replace(/\s+/g,''))),'Plan tracker shows /7 km too');
await p.close();
// core done + Sunday run: goes over into the Sunday part
p=await open('2026-10-25T18:00:00',[L('t','2026-10-21',4,'Tue: Intervals + arms A',4.5),L('s','2026-10-24',4,'Sat: HYROX sim',3),L('u','2026-10-25',4,'Sun: Optional easy run',5)]);
t=await bar(p);ok(t.n==='12.5/7km'&&t.core==='100%'&&t.sun==='100%'&&t.over,'Sunday run fills the faded part and the bar is marked over '+JSON.stringify(t));
await p.close();
p=await open('2026-10-24T12:00:00',[L('t','2026-10-21',4,'Tue: Intervals + arms A',4.5),L('s','2026-10-24',4,'Sat: HYROX sim',4)],360);
t=await bar(p);ok(t.core==='100%'&&t.sun==='30%','over the core without Sunday: 8.5 km fills 30% of the Sunday part '+JSON.stringify(t));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'no overflow at 360');
// Coach trend target uses the core km
ok(await p.evaluate(()=>{showView('bench');return true}),'');await p.clock.runFor(500);
const tr=await p.evaluate(()=>document.querySelector('#bench')?document.querySelector('#bench').textContent:'');ok(!/of 12 target/.test(tr),'Coach trend never shows the Sunday inclusive target');
await p.close();
ok(/Run km targets in the app \(v116/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains the core km target');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
