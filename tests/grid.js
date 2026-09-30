// Season grid (Plan tab, compact 27 columns x 7 rows of dots) + week header check: node tests/grid.js
// Needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox.
// Clock pinned to Sat Oct 10 2026 (plan week 2, day 13). Week 2 is swapped: Mon holds Tue's session, Tue holds Mon's.
// Week 1 has no logs except a logged Rest day on Tue.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const LOGS=[L('f','2026-09-29','Rest day',{duration:0}),L('a','2026-10-05','Tue: Run + arms A',{distance:6,pace:'5:30',rpe:6}),L('b','2026-10-06','Mon: Lower + sled',{rpe:8,notes:'Workout 55:00 · 3/3 exercises done\nLoads (kg): Back squat 100 (3/3) · RDL 90 (3/3) · Sled push 120 (20+)\nNote: Felt strong'}),L('c','2026-10-07','Rest day',{duration:0}),L('d','2026-10-09','Thu: Hockey'),L('e','2026-10-10','Sat: HYROX sim')];
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w=390)=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},LOGS);
 await p.clock.install({time:new Date('2026-10-10T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);return p};
const col=(p,wk)=>p.evaluate(wk=>[...document.querySelectorAll(`.sgm-col[data-wk="${wk}"] i`)].map(i=>i.className.replace(/^b-/,'')),wk);
let p=await open();
check('Plan order: seg, grid, week nav, header, days, add button',await p.evaluate(()=>[...document.querySelectorAll('#plan > *')].map(e=>e.id||e.className.split(' ')[0])),['section-title','planSeg','gridWrap','week-nav','weekHero','days','addSession']);
check('27 columns x 7 = 189 dots',await p.evaluate(()=>[document.querySelectorAll('.sgm-col').length,document.querySelectorAll('.sgm-col i').length]),[27,189]);
check('one line counter',(await p.locator('.sgm-count').innerText()).replace(/\s+/g,' '),'Day 13 / 189 · 5 trained');
check('week 1: Rest day log Tue, Wed and Sun rest, rest missed',await col(p,1),['missed','rest','rest','missed','missed','missed','rest']);
check('week 2 (swapped)',await col(p,2),['trained','trained','rest','trained','trained','today','future']);
check('week 3 all ahead',await col(p,3),Array(7).fill('future'));
const g=await p.evaluate(()=>{const w=document.querySelector('.sgm-wrap').getBoundingClientRect(),i=document.querySelector('.sgm-col i').getBoundingClientRect();return{h:Math.round(w.height),dot:Math.round(i.width),noScroll:document.documentElement.scrollWidth<=innerWidth,fixed:[...document.querySelectorAll('.sgm-wrap *')].some(e=>getComputedStyle(e).position==='fixed')}});
check('390: compact (under 130px tall), dots 8 to 10px, no scroll, nothing fixed',[g.h<130,g.dot>=8&&g.dot<=10,g.noScroll,g.fixed],[true,true,true,false]);
check('another athlete has their own grid',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('.sgm-count').textContent.replace(/\s+/g,' ')+' | '+document.querySelectorAll('.sgm i.b-trained').length;renderSeasonGrid('fred');return t}),'Day 13 / 189 · 0 trained | 0');
await p.click('.sgm-col[data-wk="4"]');await p.clock.runFor(800);
check('tap week 4 selects it in Plan',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.week-title').textContent.startsWith('Week 4:')]),['plan',true]);
// week header
await p.evaluate(()=>{currentWeek=2;renderPlan()});
check('week 2 strip states',await p.evaluate(()=>[...document.querySelectorAll('.td-strip .td-day')].map(d=>d.className.replace('td-day st-','').replace(' now','*'))),['trained','trained','rest','trained','trained','trained*','future']);
check('week 2 x / 7 days',await p.locator('.wk-days').innerText(),'6 / 7 days');
check('week 2 totals: sessions, km, RPE',(await p.locator('.wk-tot').innerText()).replace(/\s+/g,' '),'4/5 sessions 6/'+(await p.evaluate(()=>PLAN[1].runKm))+' km RPE 7.0');
check('tick season bar untouched (27 ticks)',await p.locator('.td-ticks i').count(),27);
await p.evaluate(()=>{currentWeek=1;renderPlan()});check('week 1 x / 7 days',await p.locator('.wk-days').innerText(),'3 / 7 days');
await p.evaluate(()=>{currentWeek=3;renderPlan()});check('future week x / 7 days',await p.locator('.wk-days').innerText(),'0 / 7 days');
await p.close();
p=await open(360);
check('360: no horizontal scroll, grid inside its wrap',await p.evaluate(()=>{const w=document.querySelector('.sgm-wrap').getBoundingClientRect(),g=document.querySelector('.sgm').getBoundingClientRect();return [document.documentElement.scrollWidth<=innerWidth,g.left>=w.left&&g.right<=w.right]}),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
