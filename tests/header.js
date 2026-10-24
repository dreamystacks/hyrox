// Plan header check (v111: day rows, day sheet, dots on Coach): node tests/header.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
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
 check(w+': season grid on Plan above the week tracker, 189 day boxes',await p.evaluate(()=>[document.querySelector('#plan #seasonBar').nextElementSibling.id,document.querySelectorAll('#seasonBar .sb-wk i').length]),['weekTrack',189]);
 check(w+': week 1 boxes = week circles, Mon and Tue trained, Tue today ringed',await p.evaluate(()=>{const d=[...document.querySelectorAll('#seasonBar .sb-wk[data-wk="1"] i')],c=[...document.querySelectorAll('.td-strip .td-day')].map(x=>x.className.replace(/.*st-(\w+).*/,'$1'));return[JSON.stringify(d.map(i=>i.className.split(' ')[0].replace('b-','')))===JSON.stringify(c),d.slice(0,3).map(i=>i.className)]}),[true,['b-trained','b-trained now','b-future']]);
 check(w+': week tiles',(await p.locator('#weekTrack .wk-tot').innerText()).replace(/\s+/g,' ').trim(),'Days trained 2/7 Sessions 2/5 Run 2.4/4.4 km Avg RPE '+(await p.evaluate(()=>document.querySelector('#weekTrack .kp-rpe b').textContent)));
 check(w+': season caption',await p.evaluate(()=>[document.querySelector('#seasonBar .sb-sub').textContent,document.querySelector('#seasonBar .sb-pill').textContent]),['2 days trained','Week 1 of 27']);
 check(w+': all 7 day rows fit on screen below the week card (rows about 64 px)',await p.evaluate(()=>{const r=[...document.querySelectorAll('#days .day-card')].map(c=>Math.round(c.getBoundingClientRect().height));return[r.length,r.every(h=>h>=56&&h<=80)]}),[7,true]);
 check(w+': no horizontal scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // tap a circle: that day's sheet opens at the bottom of the screen
 await p.click('.td-strip [data-jump=Fri]');await p.clock.runFor(300);
 const r=await p.evaluate(()=>{const c=document.querySelector('.day-card[data-day=Fri]'),bd=c.querySelector('.day-body').getBoundingClientRect();return{open:c.classList.contains('open'),bottom:Math.round(bd.bottom),dim:getComputedStyle(document.getElementById('planDim')).display,title:c.querySelector('.ds-h b').textContent}});
 check(w+': tapping the Fri circle opens the Fri sheet at the bottom with a dim backdrop',[r.open,Math.abs(r.bottom-844)<=2,r.dim,r.title],[true,true,'block','Upper + EMOM']);
 await p.click('.day-card[data-day=Fri] [data-dclose]');await p.clock.runFor(200);
 check(w+': X closes it',await p.evaluate(()=>[document.querySelectorAll('.day-card.open').length,document.body.classList.contains('psheet')]),[0,false]);
 await p.click('.day-card[data-day=Mon] .day-head');await p.clock.runFor(200);
 await p.mouse.click(195,60);await p.clock.runFor(200);
 check(w+': tapping the dim area closes the sheet',await p.locator('.day-card.open').count(),0);
 // arrows and swipe change week
 await p.click('#nextWeek');await p.clock.runFor(300);
 check(w+': arrow moves to week 2',await p.evaluate(()=>document.getElementById('weekJump').value),'2');
 await p.evaluate(()=>{const z=document.getElementById('days'),T=(t,x)=>z.dispatchEvent(new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:1,target:z,clientX:x,clientY:300})],changedTouches:[new Touch({identifier:1,target:z,clientX:x,clientY:300})]}));T('touchstart',300);T('touchend',120)});await p.clock.runFor(300);
 check(w+': swipe left moves to week 3',await p.evaluate(()=>document.getElementById('weekJump').value),'3');
 // season bar: tap a week opens it
 check(w+': season grid inside the screen',await p.evaluate(()=>document.querySelector('#seasonBar .sb-row').getBoundingClientRect().right<=innerWidth),true);
 check(w+': no season dots on Coach',await p.evaluate(()=>!!document.querySelector('#bench .sgm, #bench .sb')),false);
 await p.click('#seasonBar .sb-wk[data-wk="9"]');await p.clock.runFor(500);
 check(w+': tapping week 9 in the season grid opens week 9 and frames it',await p.evaluate(()=>[document.querySelector('.view.active').id,document.getElementById('weekJump').value,document.querySelector('.sb-wk.sel').dataset.wk]),['plan','9','9']);
 await p.close()}
// untrained today keeps the amber fill
let p=await open(390,[],'2026-09-29T18:00:00');
check('nothing logged: today untrained keeps its ring, counter 0',await p.evaluate(()=>[document.querySelectorAll('#seasonBar .sb-wk[data-wk="1"] i')[1].className,document.querySelector('#seasonBar .sb-sub').textContent]),['b-future now','0 days trained']);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
