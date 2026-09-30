// Season grid (Plan tab, 27 rows x 7 columns) + week header check: node tests/grid.js
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
const row=(p,wk)=>p.evaluate(wk=>[...document.querySelectorAll(`.sg2-row[data-wk="${wk}"] i`)].map(i=>i.className.replace(/^b-/,'').replace(' race','#')),wk);
let p=await open();
check('Plan order: seg, grid, week nav, header, days, add button',await p.evaluate(()=>[...document.querySelectorAll('#plan > *')].map(e=>e.id||e.className.split(' ')[0])),['section-title','planSeg','gridWrap','week-nav','weekHero','days','addSession']);
check('27 rows x 7 = 189 boxes',await p.evaluate(()=>[document.querySelectorAll('.sg2-row').length,document.querySelectorAll('.sg2-row i').length]),[27,189]);
check('counter',(await p.locator('.sg-count').innerText()).replace(/\s+/g,' '),'Day 13 / 189 · 5 trained · 176 days left');
check('row labels 1..27',await p.evaluate(()=>[...document.querySelectorAll('.sg2-lab')].map(x=>+x.textContent).join()===Array.from({length:27},(_,i)=>i+1).join()),true);
check('deload labels (4, 8, 12, 16, 20)',await p.evaluate(()=>[...document.querySelectorAll('.sg2-lab.dl')].map(x=>+x.textContent)),[4,8,12,16,20]);
check('week 1: Rest day log Tue, Wed and Sun rest, rest missed',await row(p,1),['missed','rest','rest','missed','missed','missed','rest']);
check('week 2 (swapped): Mon, Tue, Thu, Fri trained, Wed rest, Sat today, Sun ahead',await row(p,2),['trained','trained','rest','trained','trained','today','future']);
check('today box shows a tick when trained',await p.locator('.sg2-row[data-wk="2"] i.b-today').innerText(),'✓');
check('week 3 all ahead',await row(p,3),Array(7).fill('future'));
check('race days: Sat and Sun of week 27',await row(p,27),['future','future','future','future','future','future#','future#']);
check('week 2 row is selected',await p.evaluate(()=>document.querySelector('.sg2-row.sel').dataset.wk),'2');
const g=await p.evaluate(()=>{const r=document.querySelectorAll('.sg2-row')[1],is=r.querySelectorAll('i'),b0=is[0].getBoundingClientRect(),b1=is[1].getBoundingClientRect(),c=document.querySelector('.sg-card').getBoundingClientRect(),gr=document.querySelector('.sg2').getBoundingClientRect();return{box:Math.round(b0.width),gap:Math.round(b1.left-b0.right),inside:gr.left>=c.left&&gr.right<=c.right,noScroll:document.documentElement.scrollWidth<=innerWidth,fixed:[...document.querySelectorAll('.sg-card *')].some(e=>getComputedStyle(e).position==='fixed')}});
check('390: boxes 30px, 6px gap, inside card, no horizontal scroll, nothing fixed',[g.box,g.gap,g.inside,g.noScroll,g.fixed],[30,6,true,true,false]);
check('another athlete has their own grid',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('.sg-count').textContent.replace(/\s+/g,' ')+' | '+document.querySelectorAll('.sg2 i.b-trained').length;renderSeasonGrid('fred');return t}),'Day 13 / 189 · 0 trained · 176 days left | 0');
// collapse and remember
await p.click('#sgToggle');check('collapsing hides the boxes',await p.evaluate(()=>[getComputedStyle(document.querySelector('.sg-body')).display,localStorage.getItem('hrx_grid_open')]),['none','0']);
await p.evaluate(()=>renderPlan());check('collapsed state survives a re-render',await p.evaluate(()=>document.querySelector('.sg-card').classList.contains('shut')),true);
await p.click('#sgToggle');check('open again',await p.evaluate(()=>[getComputedStyle(document.querySelector('.sg-body')).display!=='none',localStorage.getItem('hrx_grid_open')]),[true,'1']);
// tap a row: selects that week below
await p.click('.sg2-row[data-wk="4"]');await p.clock.runFor(800);
check('tap week 4 selects it in Plan',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.week-title').textContent.startsWith('Week 4:'),document.querySelector('.sg2-row.sel').dataset.wk]),['plan',true,'4']);
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
check('360: no horizontal scroll, grid inside card',await p.evaluate(()=>{const c=document.querySelector('.sg-card').getBoundingClientRect(),gr=document.querySelector('.sg2').getBoundingClientRect();return [document.documentElement.scrollWidth<=innerWidth,gr.left>=c.left&&gr.right<=c.right]}),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
