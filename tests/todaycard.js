// v140 Today session card: the session name shows once, caption + Change pill, single activity days have no item list, open sessions are chips. node tests/todaycard.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
for(const w of [390,360]){const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
 await p.clock.install({time:new Date('2026-11-12T10:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 const d=await p.evaluate(()=>{const c=document.querySelector('#today .td-session'),vis=e=>e&&getComputedStyle(e).display!=='none';return{n:[...c.querySelectorAll('*')].filter(e=>!e.closest('select')&&!e.children.length&&getComputedStyle(e).display!=='none'&&e.offsetParent&&/hockey/i.test(e.textContent)).length,cap:c.querySelector('.ts-cap').textContent,title:c.querySelector('.tp-name').textContent,sub:c.querySelector('.td-sub').textContent,list:vis(c.querySelector('.exercise-list')),det:vis(c.querySelector('.det-btn')),chips:[...c.querySelectorAll('.ts-chip')].map(x=>x.textContent),rest:c.querySelector('[data-restday]').textContent,sel:!!c.querySelector('.ts-chg #sessionPick'),btn:c.querySelector('[data-hockey]').textContent,fit:document.documentElement.scrollWidth<=innerWidth}});
 ok(d.title==='Hockey'&&d.btn==='Log hockey'&&d.n===2,w+': Hockey shows as the title and the button only ('+d.n+')');
 ok(d.cap==='Today · Thursday'&&d.sel,w+': caption and Change pill with the picker');
 ok(d.sub==='Counts as hard conditioning.'&&!d.list&&!d.det,w+': one line description, no item list, no Show details');
 ok(JSON.stringify(d.chips)==='["MonLegs lift + EMOM","TueRun + Arms"]',w+': open sessions as chips '+d.chips);
 ok(/^No game today\? Log a rest day$/.test(d.rest)&&d.fit,w+': rest link, no horizontal scroll');
 await p.click('[data-pickday="1"]');await p.clock.runFor(300);
 const m=await p.evaluate(()=>{const c=document.querySelector('#today .td-session');return{title:c.querySelector('.tp-name').textContent,cap:c.querySelector('.ts-cap').textContent,chips:[...c.querySelectorAll('.ts-chip')].map(x=>x.textContent),list:getComputedStyle(c.querySelector('.exercise-list')).display!=='none',start:!!c.querySelector('[data-start]')}});
 ok(m.title==='Run + Arms'&&m.cap==='Today · Thursday'&&m.list&&m.start,w+': a chip switches to that session with its list and Start');
 ok(m.chips[0]==='TodayHockey'&&m.chips.includes('MonLegs lift + EMOM'),w+': back to today chip first '+m.chips);
 await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
