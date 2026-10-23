// Season bar (Plan tab, v114: 27 week segments filled by share of planned days trained; compact 27 columns x 7 rows of dots) + week header check: node tests/grid.js
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
const col=(p,wk)=>p.evaluate(wk=>[...document.querySelectorAll(`#seasonBar .sb-wk[data-wk="${wk}"] i`)].map(i=>i.className),wk);
let p=await open();
check('Plan order: seg, season grid, week tracker, week card, days, add button',await p.evaluate(()=>[...document.querySelectorAll('#plan > *')].map(e=>e.id||e.className.split(' ')[0])),['planSeg','seasonBar','weekTrack','card','days','addSession']);
check('season grid on Plan, none on Coach',await p.evaluate(()=>[!!document.querySelector('#plan #seasonBar .sb-g'),!!document.querySelector('#bench #gridWrap, #bench .sb')]),[true,false]);
check('27 week columns x 7 day boxes = 189',await p.evaluate(()=>[document.querySelectorAll('#seasonBar .sb-wk').length,document.querySelectorAll('#seasonBar .sb-wk i').length]),[27,189]);
check('caption: Season title, days trained, week pill',await p.evaluate(()=>[document.querySelector('.sb-t').firstChild.textContent.trim(),document.querySelector('#seasonBar .sb-sub').textContent,document.querySelector('#seasonBar .sb-pill').textContent]),['Season','4 days trained','Week 2 of 27']);
check('no uppercase letterspaced label in the season caption',await p.evaluate(()=>getComputedStyle(document.querySelector('.sb-t')).textTransform),'none');
check('week 1: nothing logged, planned days missed, Tue Wed Sun rest',await col(p,1),['b-missed','b-rest','b-rest','b-missed','b-missed','b-missed','b-rest']);
check('week 2 boxes match the day circles (one state source)',await p.evaluate(()=>{const d=[...document.querySelectorAll('#seasonBar .sb-wk[data-wk="2"] i')].map(i=>i.className.split(' ')[0].replace('b-','')),c=[...document.querySelectorAll('.td-strip .td-day')].map(x=>x.className.replace(/.*st-(\w+).*/,'$1'));return JSON.stringify(d)===JSON.stringify(c)}),true);
check('today (Sat week 2) has the ring',await p.evaluate(()=>[...document.querySelectorAll('#seasonBar i.now')].map(i=>i.parentElement.dataset.wk+':'+[...i.parentElement.children].indexOf(i))),['2:5']);
check('week 3 all future',(await col(p,3)).every(c=>c==='b-future'),true);
check('selected week framed (week 2)',await p.evaluate(()=>[...document.querySelectorAll('#seasonBar .sb-wk.sel')].map(b=>b.dataset.wk)),['2']);
check('race days outlined: Nashville Thu wk 11, Brisbane Sat wk 27',await p.evaluate(()=>[...document.querySelectorAll('#seasonBar i.race')].map(i=>i.parentElement.dataset.wk+':'+[...i.parentElement.children].indexOf(i))),['11:3','27:5']);
check('axis labels: Sep 28, Nashville, Brisbane',await p.evaluate(()=>[...document.querySelectorAll('.sb-ax > span')].map(x=>x.textContent)),['Sep 28','Nashville','Brisbane']);
const g=await p.evaluate(()=>{const w=document.querySelector('#seasonBar .sb').getBoundingClientRect(),b=document.querySelector('#seasonBar .sb-wk').getBoundingClientRect(),i=document.querySelector('#seasonBar .sb-wk i').getBoundingClientRect();return{h:Math.round(w.height),tap:Math.round(b.height),box:Math.round(i.width),sq:Math.abs(i.width-i.height)<1,noScroll:document.documentElement.scrollWidth<=innerWidth}});
console.log('season block h',g.h);check('390: compact (under 170 px), square boxes 9 to 13 px, column tap area at least 70 px, no horizontal scroll',[g.h<170,g.box>=9&&g.box<=13,g.sq,g.tap>=70,g.noScroll],[true,true,true,true,true]);
check('colours come from theme tokens only',await p.evaluate(()=>{const css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('');const m=css.match(/\.sb-[^{]*\{[^}]*\}/g)||[];return m.every(r=>!/#[0-9a-f]{3,6}\b/i.test(r))}),true);
check('another athlete has their own grid',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('#seasonBar .sb-sub').textContent;renderSeasonGrid('fred');return t}),'0 days trained');
await p.click('#seasonBar .sb-wk[data-wk="4"]');await p.clock.runFor(500);
check('tap week 4 opens week 4 and moves the frame',await p.evaluate(()=>[document.getElementById('weekJump').value,document.querySelector('.sb-wk.sel').dataset.wk]),['4','4']);
// header structure
check('no Plan heading, no tick bar, no x / 7 days pill, one week nav, no eyebrow or Week N: prefix',await p.evaluate(()=>[!!document.querySelector('#plan .section-title'),!!document.querySelector('.td-ticks'),!!document.querySelector('.wk-days'),document.querySelectorAll('#plan .week-nav').length,!!document.querySelector('#weekHero .eyebrow'),/Week \\d+:/.test(document.getElementById('weekHero').textContent)]),[false,false,false,1,false,false]);
check('week focus is one ellipsis line',await p.evaluate(()=>{const f=document.querySelector('.wk-f'),c=getComputedStyle(f);return[c.whiteSpace,c.textOverflow,f.getBoundingClientRect().height<24]}),['nowrap','ellipsis',true]);
check('stats line has no x / 7 days',(await p.locator('#weekTrack .wk-tot').innerText()).replace(/\\s+/g,' ').includes('/ 7'),false);
// week header
await p.evaluate(()=>{currentWeek=2;renderPlan()});
check('week 2 strip states',await p.evaluate(()=>[...document.querySelectorAll('.td-strip .td-day')].map(d=>d.className.replace('td-day st-','').replace(' now','*'))),['trained','trained','rest','rest','trained','trained*','future']);
check('week 2 tiles: labels, numbers, targets',(await p.locator('#weekTrack .wk-tot').innerText()).replace(/\s+/g,' ').trim(),'Days trained 4/7 Sessions 4/5 Run 6/'+(await p.evaluate(()=>PLAN[1].runKm))+' km Avg RPE '+(await p.evaluate(()=>document.querySelector('#weekTrack .kp-rpe b').textContent)));
await p.close();
p=await open(360);
check('360: no horizontal scroll, bar inside the screen',await p.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth,document.querySelector('#seasonBar .sb-row').getBoundingClientRect().right<=innerWidth]),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
