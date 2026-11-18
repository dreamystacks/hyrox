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
const bar=(p,wk)=>p.evaluate(wk=>{const e=document.querySelector(`#seasonBar .sb-wk[data-wk="${wk}"]`);return{cls:e.className.replace(/\s+/g,' ').trim(),h:Math.round(e.querySelector('b').getBoundingClientRect().height)}},wk);
let p=await open();
check('Plan order: seg, season tracker, week tracker, week card, days, add button',await p.evaluate(()=>[...document.querySelectorAll('#plan > *')].map(e=>e.id||e.className.split(' ')[0])),['planSeg','seasonBar','weekTrack','card','days','addSession']);
check('season tracker on Plan, none on Coach (v157 bars, not the 189 box grid)',await p.evaluate(()=>[!!document.querySelector('#plan #seasonBar .sb2-bars'),!!document.querySelector('#seasonBar .sb-g'),!!document.querySelector('#bench #gridWrap, #bench .sb')]),[true,false,false]);
check('27 week bars, tap area full height',await p.evaluate(()=>[document.querySelectorAll('#seasonBar .sb-wk').length,document.querySelectorAll('#seasonBar .sb-wk b').length,Math.round(document.querySelector('#seasonBar .sb-wk').getBoundingClientRect().height)>=44]),[27,27,true]);
const SW=await p.evaluate(()=>seasonWeeks('fred')),dsum=SW.filter(x=>x.st!=='fut').reduce((a,x)=>a+x.done,0),usum=SW.filter(x=>x.st!=='fut').reduce((a,x)=>a+x.due,0);
check('head: Week 2 of 27 and the sessions pill from the same data',await p.evaluate(()=>[document.querySelector('.sb2-wk').textContent,document.querySelector('#seasonBar .sb-pill').textContent]),['Week 2 of 27',dsum+' of '+usum+' sessions']);
check('flag line counts the days to Brisbane',await p.evaluate(()=>[document.querySelector('.sb2-fl').textContent,raceDays(RACES[0])]),['Brisbane in '+(await p.evaluate(()=>raceDays(RACES[0])))+' days',await p.evaluate(()=>raceDays(RACES[0]))]);
check('no uppercase letterspaced label in the tracker',await p.evaluate(()=>getComputedStyle(document.querySelector('.sb2-wk')).textTransform),'none');
const b1=await bar(p,1),b2=await bar(p,2),b3=await bar(p,3),b27=await bar(p,27);
check('week 1 is past, week 2 current, week 3 a short stub, week 27 the dark Brisbane bar',[b1.cls.includes('past'),b2.cls.includes('cur'),b3.cls.includes('fut'),b27.cls.includes('fin')],[true,true,true,true]);
check('bar heights: past bars follow sessions done, stub is 8 px, Brisbane bar is the tallest',[b1.h===10+Math.round(SW[0].done/SW[0].P*30),b3.h,b27.h>=Math.max(b1.h,b2.h)],[true,8,true]);
check('selected week marked (week 2)',await p.evaluate(()=>[...document.querySelectorAll('#seasonBar .sb-wk.sel')].map(b=>b.dataset.wk)),['2']);
check('summary line for the selected week',await p.evaluate(()=>document.querySelector('.sb2-cap').textContent.replace(/\s+/g,' ')),'Week 2 · this week'+SW[1].done+' of '+SW[1].P+' sessions'+(SW[1].km?' · '+(SW[1].km%1?SW[1].km.toFixed(1):SW[1].km)+' km':''));
const g=await p.evaluate(()=>{const w=document.querySelector('#seasonBar .sb').getBoundingClientRect();return{h:Math.round(w.height),noScroll:document.documentElement.scrollWidth<=innerWidth}});
console.log('season block h',g.h);check('390: compact (under 190 px), no horizontal scroll',[g.h<190,g.noScroll],[true,true]);
check('colours come from theme tokens only',await p.evaluate(()=>{const css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('');const m=css.match(/\.sb2[^{]*\{[^}]*\}/g)||[];return m.length>0&&m.every(r=>!/#[0-9a-f]{3,6}\b/i.test(r))}),true);
check('another athlete has their own tracker',await p.evaluate(()=>{renderSeasonGrid('will');const t=document.querySelector('#seasonBar .sb-pill').textContent;renderSeasonGrid('fred');return t}),'0 of '+SW.filter(x=>x.st!=='fut').reduce((a,x)=>a+x.due,0)+' sessions');
await p.click('#seasonBar .sb-wk[data-wk="4"]');await p.clock.runFor(500);
check('tap week 4 opens week 4, marks it and the summary says planned',await p.evaluate(()=>[document.getElementById('weekJump').value,document.querySelector('.sb-wk.sel').dataset.wk,document.querySelector('.sb2-cap b').textContent]),['4','4','Week 4 · planned']);
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
check('360: no horizontal scroll, bar inside the screen',await p.evaluate(()=>[document.documentElement.scrollWidth<=innerWidth,document.querySelector('#seasonBar .sb2-bars').getBoundingClientRect().right<=innerWidth]),[true,true]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
