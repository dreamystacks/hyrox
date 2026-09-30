// Plan header check: node tests/header.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Clock pinned to Tue Sep 29 2026 18:00 (week 1, day 2): Mon and Tue trained, today is Tue.
// Checks dots vs circles share one state source, today dot (trained keeps lime plus ring, untrained is amber),
// the column frame follows taps and the arrows, circles scroll to and open the right day card, stats line, and 390/360 layout.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const LOGS=[L('a','2026-09-28','Mon: Lower + sled',{rpe:8}),L('b','2026-09-29','Tue: Run + arms A',{distance:2.4,pace:'5:30',rpe:6})];
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w,logs=LOGS,t='2026-09-29T18:00:00')=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},logs);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(600);return p};
for(const w of [390,360]){
 const p=await open(w);
 check(w+': week 1 dots = circles (one state source)',await p.evaluate(()=>{const d=[...document.querySelectorAll('.sgm-col[data-wk="1"] i')].map(i=>i.className.replace(/^b-/,'').replace(' now','')),c=[...document.querySelectorAll('.td-strip .td-day')].map(x=>x.className.replace(/.*st-(\w+).*/,'$1'));return JSON.stringify(d)===JSON.stringify(c.map(s=>s))}),true);
 check(w+': Mon and Tue trained, Tue is today with the ring and lime fill',await p.evaluate(()=>[...document.querySelectorAll('.sgm-col[data-wk="1"] i')].slice(0,3).map(i=>i.className)),['b-trained','b-trained now','b-future']);
 check(w+': stats line',(await p.locator('.wk-tot').innerText()).replace(/\s+/g,' '),'2/5 sessions 2.4/8 km RPE 7.0');
 check(w+': frame on week 1, one only',await p.evaluate(()=>[...document.querySelectorAll('.sgm-col.sel')].map(x=>x.dataset.wk)),['1']);
 check(w+': no horizontal scroll, dots inside the screen',await p.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth,document.querySelector('.sgm').getBoundingClientRect().right<=innerWidth]),[true,true]);
 check(w+': first session card starts within the first screen',await p.evaluate(()=>document.querySelector('.day-card').getBoundingClientRect().top<560),true);
 // tap a column far away: frame moves, week card follows
 await p.click('.sgm-col[data-wk="9"]');await p.clock.runFor(500);
 check(w+': tapping week 9 moves the frame and the week select',await p.evaluate(()=>[document.querySelector('.sgm-col.sel').dataset.wk,document.getElementById('weekJump').value]),['9','9']);
 check(w+': column hit area is the full column height',await p.evaluate(()=>{const c=document.querySelector('.sgm-col[data-wk="9"]').getBoundingClientRect();return c.height>=60}),true);
 await p.click('#nextWeek');await p.clock.runFor(300);
 check(w+': arrows move the frame too',await p.evaluate(()=>document.querySelector('.sgm-col.sel').dataset.wk),'10');
 // circle tap scrolls to and opens the right card
 await p.evaluate(()=>{currentWeek=1;renderPlan();window.scrollTo(0,0)});await p.clock.runFor(300);
 await p.click('.td-strip [data-jump=Fri]');await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const c=document.querySelector('.day-card[data-day=Fri]'),t=c.getBoundingClientRect().top;return{open:c.classList.contains('open'),top:Math.round(t),atEnd:scrollY>=document.documentElement.scrollHeight-innerHeight-2}});
 check(w+': tapping the Fri circle opens Fri and puts it at the top (or as high as the page allows) '+JSON.stringify(r),[r.open,(r.top>=0&&r.top<=40)||(r.atEnd&&r.top>=0&&r.top<600)],[true,true]);
 await p.evaluate(()=>window.scrollTo(0,0));await p.clock.runFor(800);
 await p.click('.td-strip [data-jump=Mon]');await p.waitForTimeout(300);
 check(w+': tapping Mon opens Mon',await p.evaluate(()=>document.querySelector('.day-card[data-day=Mon]').classList.contains('open')),true);
 await p.close()}
// untrained today keeps the amber fill
let p=await open(390,[],'2026-09-29T18:00:00');
check('today untrained: amber dot with ring',await p.evaluate(()=>document.querySelectorAll('.sgm-col[data-wk="1"] i')[1].className),'b-today now');
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
