// Season grid + week strip check: node tests/grid.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Clock pinned to Sat Oct 10 2026 (plan week 2, day 13). Week 2 is swapped: Mon holds Tue's session, Tue holds Mon's.
// Week 1 has no logs except a logged Rest day on Tue. Checks states (trained, rest, missed, future, today), deload tint,
// counters, tap to jump to Plan, strip states and the x / 7 counter, and that nothing overflows at 390 and 360 wide.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const LOGS=[L('f','2026-09-29','Rest day',{duration:0}),L('a','2026-10-05','Tue: Run + arms A'),L('b','2026-10-06','Mon: Lower + sled'),L('c','2026-10-07','Rest day',{duration:0}),L('d','2026-10-09','Thu: Hockey'),L('e','2026-10-10','Sat: HYROX sim')];
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w=390)=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},LOGS);
 await p.clock.install({time:new Date('2026-10-10T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=bench]');await p.clock.runFor(500);return p};
const col=(p,wk)=>p.evaluate(wk=>[...document.querySelectorAll(`.sg-col[data-wk="${wk}"] i`)].map(i=>i.className.replace('s-','').replace(' now','*')),wk);
let p=await open();
check('grid is the first card under the athlete switch',await p.evaluate(()=>document.querySelector('#bench > #gridWrap')&&document.querySelector('#gridWrap').previousElementSibling.id),'benchSeg');
check('27 columns x 7 rows = 189 boxes',await p.evaluate(()=>[document.querySelectorAll('.sg-col').length,document.querySelectorAll('.sg i').length]),[27,189]);
check('header counter',await p.locator('.sg-count').innerText(),'Day 13 / 189 · 4 workouts');
check('week 1: no logs, Rest day log on Tue, Wed and Sun are rest',await col(p,1),['missed','rest','rest','missed','missed','missed','rest']);
check('week 2 (swapped): Mon, Tue, Thu, Fri by date or name, Wed rest, Sat today, Sun future',await col(p,2),['trained','trained','rest','trained','trained','trained*','future']);
check('week 3: all future',await col(p,3),Array(7).fill('future'));
check('deload columns tinted (weeks 4, 8, 12, 16, 20)',await p.evaluate(()=>[...document.querySelectorAll('.sg-col')].filter(c=>c.querySelector('.sg-in.dl')).map(c=>+c.dataset.wk)),[4,8,12,16,20]);
// geometry
const g=await p.evaluate(()=>{const c=document.querySelector('.sg-card').getBoundingClientRect(),gr=document.querySelector('.sg').getBoundingClientRect(),bx=document.querySelector('.sg i').getBoundingClientRect(),b2=document.querySelectorAll('.sg-col')[1].querySelector('i').getBoundingClientRect();return{inside:gr.left>=c.left&&gr.right<=c.right,box:Math.round(bx.width),gap:Math.round(b2.left-bx.right),noScroll:document.documentElement.scrollWidth<=innerWidth}});
check('390: grid inside its card, no horizontal scroll',[g.inside,g.noScroll],[true,true]);
check('390: boxes about 9px with a 3px gap',[g.box>=8&&g.box<=10,g.gap],[true,3]);
// other athlete has their own grid
check('the grid follows the athlete it is asked for',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('.sg-count').textContent+' | '+document.querySelectorAll('.sg i.s-trained').length;renderSeasonGrid('fred');return t}),'Day 13 / 189 · 0 workouts | 0');
// tap a column: jump to Plan on that week
await p.click('.sg-col[data-wk="4"]');await p.clock.runFor(500);
check('tap week 4 opens Plan on week 4',await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.week-title').textContent.startsWith('Week 4:')]),['plan',true]);
// strip states + counter on week 2 and week 1
await p.evaluate(()=>{currentWeek=2;renderPlan()});
check('week 2 strip states',await p.evaluate(()=>[...document.querySelectorAll('.td-strip .td-day')].map(d=>d.className.replace('td-day st-','').replace(' now','*'))),['trained','trained','rest','trained','trained','trained*','future']);
check('week 2 counter (5 trained + Wed rest)',await p.locator('.wk-days').innerText(),'6 / 7 days');
await p.evaluate(()=>{currentWeek=1;renderPlan()});
check('week 1 counter (Tue and Wed and Sun rest only)',await p.locator('.wk-days').innerText(),'3 / 7 days');
check('tick season bar untouched (27 ticks)',await p.locator('.td-ticks i').count(),27);
await p.evaluate(()=>{currentWeek=3;renderPlan()});
check('future week counter',await p.locator('.wk-days').innerText(),'0 / 7 days');
await p.close();
p=await open(360);
check('360: no horizontal scroll, grid inside card',await p.evaluate(()=>{const c=document.querySelector('.sg-card').getBoundingClientRect(),gr=document.querySelector('.sg').getBoundingClientRect();return [document.documentElement.scrollWidth<=innerWidth,gr.left>=c.left&&gr.right<=c.right]}),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
