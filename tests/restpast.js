// Log a rest day for a past day from Plan: node tests/restpast.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(n,g,w)=>{const a=JSON.stringify(g),b=JSON.stringify(w),ok=a===b;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+n+(ok?'':`\n     got  ${a}\n     want ${b}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.setItem('hrx_active_athlete','will');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_will_logs_v2','[]')});
await p.clock.install({time:new Date('2026-10-20T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);
const mon=p.locator('.day-card[data-day=Mon]');if(!(await mon.evaluate(c=>c.classList.contains('open'))))await mon.locator('.day-head').click();
check('Monday card (yesterday) offers a rest day',await mon.locator('[data-restpast]').innerText(),'Rested on Mon? Log rest day');
await mon.locator('[data-restpast]').click();await p.clock.runFor(400);
check('rest day saved on Monday',await p.evaluate(()=>getLogs().map(x=>x.date+' '+x.session)),['2026-10-19 Rest day']);
check('button gone once logged',await p.locator('.day-card[data-day=Mon] [data-restpast]').count(),0);
check('future days have no rest button',await p.locator('.day-card[data-day=Thu] [data-restpast]').count(),0);
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
