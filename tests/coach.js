// Coach tab check: node tests/coach.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Empty state on week 1 (Tue Sep 29 2026), seeded state on Sun Dec 6 2026 (week 10), measured full sim, viewing another athlete,
// light theme, 390 and 360 wide. Goal maths: Intermediate + 0.69 x (Advanced - Intermediate), goal total about 1:25:00.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const RUNS='Runs: 6:10 / 6:12 / 6:14 / 6:12';
const SIMS=[L('s9','2026-11-28','Sat: HYROX sim',{stations:'SkiErg 4:29 · Sled push 2:50 · Sled pull 4:10 · Burpee broad jumps 4:40',notes:RUNS}),
 L('s10','2026-12-05','Sat: HYROX sim',{stations:'RowErg 5:20 · Farmers carry 1:45 · Sandbag lunges 4:35 · Wall balls 5:00',notes:RUNS})];
const T='2026-11-01T00:00:00Z',BENCHV={run1k_1:{v:'4:05',t:T},run1k_8:{v:'3:53',t:T},ski_1:{v:'4:30',t:T},row_1:{v:'4:10',t:T},row_8:{v:'3:50',t:T}};
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async({t,logs=[],bench={},mode='dark',w=390}={})=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg,bn,m])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_mode',m);localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bn))},[logs,bench,mode]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=bench]');await p.clock.runFor(600);return p};
const txt=(p,sel)=>p.locator(sel).innerText().then(x=>x.replace(/\s+/g,' ').trim());
const geo=(p,w)=>p.evaluate(()=>({noScroll:document.documentElement.scrollWidth<=innerWidth,fixed:[...document.querySelectorAll('#bench *')].some(e=>getComputedStyle(e).position==='fixed'||getComputedStyle(e,'::before').position==='fixed'||getComputedStyle(e,'::after').position==='fixed')}));
// ---------- empty state, week 1 ----------
let p=await open({t:'2026-09-29T18:00:00'});
check('view order: hero, levers (hidden), coach, splits, tests',await p.evaluate(()=>[...document.querySelectorAll('#bench > *')].map(e=>e.id||e.className.split(' ')[0])).then(a=>a.slice(0,7)),['section-title','benchSeg','standWrap','leverWrap','card','splitWrap','testWrap']);
check('empty hero: no estimate, unlock week from PLAN, stations measured',[await txt(p,'.hero-big'),await txt(p,'.hero .pill'),await txt(p,'.hero-sub')],['-:--:--','UNLOCKS WEEK 9','Goal 1:25:00 · 0 of 8 stations measured']);
check('empty hero: dashed you marker, no gap bar',await p.evaluate(()=>[!!document.querySelector('.hl-you.dashed'),!!document.querySelector('.gb')]),[true,false]);
check('ladder ticks B I A E and a lime goal marker',await p.evaluate(()=>[[...document.querySelectorAll('.hl-tick')].map(t=>t.textContent.replace(/\s+/g,'')),document.querySelector('.hl-goal').textContent.trim()]),[['1:47B','1:34I','1:21A','1:13E'],'Goal 1:25']);
check('no levers while there is no data',await p.locator('#leverWrap').innerHTML(),'');
check('coach baseline copy and next report line',[await txt(p,'.cc-head'),(await txt(p,'#nextReport')).startsWith('Next report:')],['Baseline week',true]);
check('splits: 8 stations + runs, goal shown, dashed empty bars, dash label',await p.evaluate(()=>[document.querySelectorAll('.rs-row').length,document.querySelectorAll('.rs-bar.none').length,[...document.querySelectorAll('.rs-val')].every(v=>v.textContent==='—'),document.querySelector('.rs-row .rs-name small').textContent]),[9,9,true,'goal 4:15']);
check('tests: dash and target, no levels compared',await p.evaluate(()=>[document.querySelectorAll('.ft-row').length,document.querySelector('.ft-row .ft-v').textContent,document.querySelector('.ft-row .ft-t').textContent,document.querySelectorAll('.ft-row .lvl').length]),[8,'—','target 3:45',0]);
check('390: no horizontal scroll, nothing fixed',await geo(p),{noScroll:true,fixed:false});
await p.close();
// ---------- seeded ----------
p=await open({t:'2026-12-06T12:00:00',logs:SIMS,bench:BENCHV});
check('hero estimate, goal and gap',[await txt(p,'.hero-big'),await txt(p,'.hero .pill'),await txt(p,'.hero-sub')],['1:28:43','ESTIMATE · HALF SIMS','Goal 1:25:00 · +3:43 to find']);
check('YOU marker and filled track',await p.evaluate(()=>[!!document.querySelector('.hl-you:not(.dashed)'),parseFloat(document.querySelector('.hl-fill').style.width)>0]),[true,true]);
check('gap bar: runs and stations, labelled',(await txt(p,'.gb-l')),'Runs +2:32 Stations +1:12');
check('levers ranked by seconds lost, top 3',await p.evaluate(()=>[[...document.querySelectorAll('.lv-row b')].map(x=>x.textContent),[...document.querySelectorAll('.lv-v')].map(x=>x.textContent)]),[['Runs','Row','Burpee broad jumps'],['+2:32','+0:48','+0:21']]);
check('split labels carry a sign',await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.rs-row')].map(r=>[r.dataset.n,r.querySelector('.rs-val').textContent]))),{SkiErg:'+14s','Sled push':'+16s','Sled pull':'-3s','Burpee broad jumps':'+21s',Row:'+48s','Farmers carry':'-5s','Sandbag lunges':'+14s','Wall balls':'-33s','Runs, per km':'+19s'});
check('behind bars start at the axis and go right, ahead bars end at the axis and go left',await p.evaluate(()=>{const pos=n=>{const f=document.querySelector(`.rs-row[data-n="${n}"] .rs-f`);return[f.classList.contains('behind')?'behind':'ahead',Math.round(parseFloat(f.style.left)*10)/10,Math.round(parseFloat(f.style.width)*10)/10]};return[pos('Burpee broad jumps'),pos('Sled pull')]}),[['behind',50,23.3],['ahead',46.4,3.6]]);
check('long bars clamp at 45 s with an arrow',await p.evaluate(()=>{const f=document.querySelector('.rs-row[data-n="Row"] .rs-f');return[f.classList.contains('clamp'),parseFloat(f.style.width),getComputedStyle(f,'::after').content]}),[true,50,'"›"']);
check('tests: 60% closed, baseline only, target hit, no data',await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('.ft-row')].map(r=>[r.dataset.t,[r.querySelector('.ft-v').textContent,r.querySelector('.ft-t').textContent,r.querySelector('.ft-m i').style.width]])).run1k),['3:53','0:08 to 3:45 · 60%','60%']);
check('tests: baseline only',await p.evaluate(()=>{const r=document.querySelector('.ft-row[data-t=ski]');return[r.querySelector('.ft-v').textContent,r.querySelector('.ft-t').textContent,r.querySelector('.ft-m i').style.width]}),['4:30','baseline 4:30 · target 4:15','0%']);
check('tests: target hit',await p.evaluate(()=>{const r=document.querySelector('.ft-row[data-t=row]');return[r.querySelector('.ft-v').textContent,r.querySelector('.ft-t').textContent,r.querySelector('.ft-m i').style.width]}),['3:50','Target hit ✓','100%']);
check('Log a retest expands the existing entry table',await p.evaluate(async()=>{const before=getComputedStyle(benchTable).display;document.getElementById('retestBtn').click();return[before,getComputedStyle(benchTable).display,document.querySelectorAll('#benchTable [data-bench]').length]}),['none','grid',36]);
check('390: no horizontal scroll, nothing fixed',await geo(p),{noScroll:true,fixed:false});
// coach.json content
await p.evaluate(()=>{window.COACH={week:10,generated:'2026-12-05T23:52:00Z',athletes:{fred:{headline:'Runs are the lever',summary:'Run pace drifts late. Keep the first km calm.',tweaks:[{day:'Tue',text:'Add a tempo km'},{day:'Fri',text:'Keep RIR 2'},{day:'Sat',text:'Third one is hidden'}],strengths:['Wall balls ahead']}}};renderBench()});
check('coach card: headline, first sentence only, 2 tweaks with day tags',await p.evaluate(()=>[document.querySelector('.cc-head').textContent,document.querySelector('.cc-sum').textContent,[...document.querySelectorAll('.cc-tw')].map(t=>t.querySelector('.cc-day').textContent)]),['Runs are the lever','Run pace drifts late.',['Tue','Fri']]);
check('full report is collapsed and opens',await p.evaluate(()=>{const h=document.getElementById('coachFull').hidden;document.getElementById('rpToggle').click();return[h,document.getElementById('coachFull').hidden,!!document.querySelector('#coachFull #reportWrap .rp-verdict')]}),[true,false,true]);
await p.close();
// ---------- measured full sim ----------
p=await open({t:'2027-02-07T12:00:00',logs:[...SIMS,L('f19','2027-02-06','Sat: HYROX sim',{duration:91,notes:'Sim week 19 · total 1:31:20\n'+RUNS})],bench:BENCHV});
check('measured full sim replaces the estimate, estimate stays as a small line',[await txt(p,'.hero-big'),await txt(p,'.hero .pill'),await txt(p,'.hero-sm')],['1:31:20','MEASURED · FULL SIM FEB 6','Estimate from splits 1:28:43']);
await p.close();
// ---------- viewing another athlete (read only) ----------
p=await open({t:'2026-12-06T12:00:00',logs:SIMS,bench:BENCHV});
await p.evaluate(()=>{syncCfg=()=>({url:'x',key:'y'});viewAthlete='will';renderBench()});
check('viewing Will: banner, empty hero, disabled entry',await p.evaluate(()=>[document.getElementById('benchSeg').textContent.trim(),document.querySelector('.hero-big').textContent,[...document.querySelectorAll('#benchTable [data-bench]')].every(i=>i.disabled)]),['Viewing Will, read only · Back to me','-:--:--',true]);
await p.close();
// ---------- light theme and 360 ----------
p=await open({t:'2026-12-06T12:00:00',logs:SIMS,bench:BENCHV,mode:'light',w:360});
check('light 360: behind colour is the darker orange, no scroll',await p.evaluate(()=>[getComputedStyle(document.documentElement).getPropertyValue('--behind').trim(),document.documentElement.scrollWidth<=innerWidth]),['#b4540a',true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
