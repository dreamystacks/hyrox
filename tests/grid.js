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
const seg=(p,wk)=>p.evaluate(wk=>{const b=document.querySelector(`#seasonBar .sb-wk[data-wk="${wk}"]`);return[b.className.replace('sb-wk','').trim(),b.querySelector('i').style.getPropertyValue('--f')]},wk);
let p=await open();
check('Plan order: seg, season bar, week tracker, week card, days, add button',await p.evaluate(()=>[...document.querySelectorAll('#plan > *')].map(e=>e.id||e.className.split(' ')[0])),['planSeg','seasonBar','weekTrack','card','days','addSession']);
check('season bar is back on Plan, gone from Coach',await p.evaluate(()=>[!!document.querySelector('#plan #seasonBar .sb-row'),!!document.querySelector('#bench #gridWrap, #bench .sb')]),[true,false]);
check('27 week segments',await p.locator('#seasonBar .sb-wk').count(),27);
check('caption: SEASON left, week and days trained right',await p.evaluate(()=>[document.querySelector('.sb-cap .td-label').textContent,document.querySelector('.sb-count').textContent.replace(/\s+/g,' ')]),['Season','Week 2 / 27 · 4 days trained']);
check('week 1: past, nothing trained (empty fill)',await seg(p,1),['past','0%']);
check('week 2: current week, selected, 4 of 5 planned days trained = 80% fill',await seg(p,2),['cur sel','80%']);
check('week 3: future, empty',await seg(p,3),['fut','0%']);
check('race weeks marked (Nashville 11, Brisbane 27)',await p.evaluate(()=>[...document.querySelectorAll('#seasonBar .sb-wk.race')].map(b=>+b.dataset.wk)),[11,27]);
check('axis labels: Sep 28, Nashville, Brisbane',await p.evaluate(()=>[...document.querySelectorAll('.sb-ax span')].map(x=>x.textContent)),['Sep 28','Nashville','Brisbane']);
const g=await p.evaluate(()=>{const w=document.querySelector('#seasonBar .sb').getBoundingClientRect(),b=document.querySelector('.sb-wk').getBoundingClientRect();return{h:Math.round(w.height),tap:Math.round(b.height),noScroll:document.documentElement.scrollWidth<=innerWidth}});
check('390: compact (under 90 px tall), tap area at least 30 px, no horizontal scroll',[g.h<90,g.tap>=30,g.noScroll],[true,true,true]);
check('colours come from theme tokens only',await p.evaluate(()=>{const css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('');const m=css.match(/\.sb-[^{]*\{[^}]*\}/g)||[];return m.every(r=>!/#[0-9a-f]{3,6}\b/i.test(r))}),true);
check('another athlete has their own bar',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('.sb-count').textContent.replace(/\s+/g,' ');renderSeasonGrid('fred');return t}),'Week 2 / 27 · 0 days trained');
await p.click('#seasonBar .sb-wk[data-wk="4"]');await p.clock.runFor(500);
check('tap week 4 opens week 4 and moves the ring',await p.evaluate(()=>[document.getElementById('weekJump').value,document.querySelector('.sb-wk.sel').dataset.wk]),['4','4']);
// header structure
check('no Plan heading, no tick bar, no x / 7 days pill, one week nav, no eyebrow or Week N: prefix',await p.evaluate(()=>[!!document.querySelector('#plan .section-title'),!!document.querySelector('.td-ticks'),!!document.querySelector('.wk-days'),document.querySelectorAll('#plan .week-nav').length,!!document.querySelector('#weekHero .eyebrow'),/Week \\d+:/.test(document.getElementById('weekHero').textContent)]),[false,false,false,1,false,false]);
check('week focus is one ellipsis line',await p.evaluate(()=>{const f=document.querySelector('.wk-f'),c=getComputedStyle(f);return[c.whiteSpace,c.textOverflow,f.getBoundingClientRect().height<24]}),['nowrap','ellipsis',true]);
check('stats line has no x / 7 days',(await p.locator('#weekTrack .wk-tot').innerText()).replace(/\\s+/g,' ').includes('/ 7'),false);
// week header
await p.evaluate(()=>{currentWeek=2;renderPlan()});
check('week 2 strip states',await p.evaluate(()=>[...document.querySelectorAll('.td-strip .td-day')].map(d=>d.className.replace('td-day st-','').replace(' now','*'))),['trained','trained','rest','rest','trained','trained*','future']);
check('week 2 totals: sessions, km, RPE',(await p.locator('#weekTrack .wk-tot').innerText()).replace(/\s+/g,' '),'4 days trained 4/5 sessions 6/'+(await p.evaluate(()=>PLAN[1].runKm))+' km');
await p.close();
p=await open(360);
check('360: no horizontal scroll, bar inside the screen',await p.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth,document.querySelector('.sb-row').getBoundingClientRect().right<=innerWidth]),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
