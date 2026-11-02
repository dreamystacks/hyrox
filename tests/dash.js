// v133 Progress dashboard: tiles on top, every old section opens in a sheet over the page and goes back on close. node tests/dash.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const S=(id,date,week,tot,runs,st)=>({id,athlete:'fred',date,week,session:'Sat: HYROX sim',duration:40,distance:4,rpe:8,knee:0,stations:st,notes:`Sim week ${week} · total ${tot}\nRuns: ${runs}\nLoads (lb): Sled push 250 (1/1) · Sled pull 170 (1/1)`,updatedAt:date+'T19:00:00Z',savedAt:date+'T19:00:00Z'});
const LOGS=[S('b','2026-10-24',4,'32:25','5:22 / 5:58 / 6:20 / 6:44','SkiErg 2:12 · Sled push 1:20 · Sled pull 2:07 · Burpee broad jumps 2:19'),S('c','2026-10-31',5,'30:10','6:05 / 6:10 / 6:15 / 6:20','RowErg 2:35 · Farmers carry 1:18 · Sandbag lunges 2:16 · Wall balls 2:30'),
 {id:'t',athlete:'fred',date:'2026-11-03',session:'Tue: Run + arms A',duration:50,distance:4,rpe:7,notes:'',updatedAt:'2026-11-03T19:00:00Z'}];
const BW={bw_1:{v:'157.4 lb',t:'x'},bw_5:{v:'160.1 lb',t:'x'}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
for(const w of [390,360]){const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg,bw])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bw))},[LOGS,BW]);
 await p.clock.install({time:new Date('2026-11-03T10:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=bench]');await p.clock.runFor(1500);
 const d=await p.evaluate(()=>{const P=roughProj('fred'),t=[...document.querySelectorAll('#dash [data-dash]')].map(x=>x.dataset.dash);return{t,big:document.getElementById('dashBig').textContent,want:fmtSec(Math.round(P.total)),bars:document.querySelectorAll('#dash .db-c i').length,hidden:document.getElementById('dashStore').hidden,store:['standWrap','projWrap','splitWrap','trendWrap','bwWrap','tlWrap'].every(id=>document.getElementById('dashStore').contains(document.getElementById(id))),bw:document.querySelector('[data-dash=bw] .dt-m').textContent.trim(),lever:document.querySelector('#dash .dt:nth-child(3) .dt-m').textContent}});
 ok(JSON.stringify(d.t)==='["proj","splits","splits","splits","bw","trends","trends","tests","coach"]',w+': tiles in order '+d.t);
 ok(d.big===d.want,w+': hero shows the rough projection '+d.big);
 ok(d.bars===9,w+': 9 split bars');
 ok(d.hidden&&d.store,w+': old sections live in the hidden store');
 ok(/^160\.1\s*lb$/.test(d.bw),w+': body weight tile '+d.bw);
 ok(d.lever==='Runs',w+': biggest lever is Runs');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),w+': no horizontal scroll');
 const j=await p.evaluate(async()=>{scrollTo(0,30);await new Promise(r=>setTimeout(r,1000));const ys=[];const h=()=>ys.push(scrollY);addEventListener('scroll',h);const n=document.querySelector('#dash .dt');kickBar();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,100))));renderBench();removeEventListener('scroll',h);const same=document.querySelector('#dash .dt')===n;scrollTo(0,0);return{ys,same}});
 ok(!j.ys.length,w+': v135 the bar kick never scrolls a page that already scrolls '+j.ys);
 ok(j.same,w+': v135 a re-render with the same data leaves the tiles in place');
 await p.click('[data-dash=splits]');await p.clock.runFor(600);
 const s=await p.evaluate(()=>({show:document.getElementById('dashModal').classList.contains('show'),title:document.getElementById('dashTitle').textContent,inSheet:['projWrap','leverWrap','splitWrap'].every(id=>document.getElementById('dashBody').contains(document.getElementById(id))),scaled:document.body.classList.contains('dsh-open'),grow:document.querySelector('#dashModal .sheet').classList.contains('grow')}));
 ok(s.show&&s.title==='Race splits'&&s.inSheet,w+': splits tile opens a sheet over the page with the splits table '+JSON.stringify(s));
 ok(s.scaled&&s.grow,w+': page behind scales, sheet grows from the tile');
 await p.click('#closeDash');await p.clock.runFor(300);
 ok(await p.evaluate(()=>!document.getElementById('dashModal').classList.contains('show')&&document.getElementById('dashStore').contains(document.getElementById('projWrap'))&&!document.body.classList.contains('dsh-open')),w+': X closes and puts the sections back');
 await p.click('[data-dash=bw]');await p.clock.runFor(600);
 ok(await p.evaluate(()=>{const e=document.getElementById('bwWrap');return document.getElementById('dashBody').contains(e)&&!e.hidden&&!!e.querySelector('.bwh')}),w+': body weight sheet shows the chart, input and weigh-in history');
 await p.evaluate(()=>showView('today'));await p.clock.runFor(300);
 ok(await p.evaluate(()=>!document.getElementById('dashModal').classList.contains('show')&&document.getElementById('bwWrap').hidden&&document.getElementById('dashStore').contains(document.getElementById('bwWrap'))),w+': leaving Progress closes the sheet');
 await p.click('.bottombar [data-view=bench]');await p.clock.runFor(800);await p.click('[data-dash=coach]');await p.clock.runFor(600);
 ok(await p.evaluate(()=>document.getElementById('dashBody').contains(document.querySelector('.card.cc'))&&!document.getElementById('coachFull').hidden),w+': coach strip opens the coach card with the full report');
 await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
