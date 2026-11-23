// v214 Fred and Will week 9: no hockey, Thursday is a rest day on Plan, Today and the weekly count; Grady and other weeks keep hockey. node tests/nohockey.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(who,t)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:new Date(t)});
 await p.addInitScript(w=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1')},who);await p.goto(URL);await p.clock.runFor(4500);return p};
const thuRow=p=>p.evaluate(()=>{showView('plan');const c=[...document.querySelectorAll('#plan .day-card')].find(x=>/THU/i.test(x.innerText));return c.innerText.replace(/\s+/g,' ')});
for(const who of ['fred','will']){const p=await open(who,'2026-11-23T18:00:00');await p.clock.runFor(500);
 const r=await thuRow(p);ok(/Rest day No hockey this week/.test(r)&&!/Hockey\b(?! this)/.test(r.replace('No hockey','')),who+': week 9 Thursday row is a rest day: '+r);
 ok(/Sessions\s*0\s*\/\s*4/.test(await p.evaluate(()=>document.querySelector('#weekTrack').innerText.replace(/\s+/g,' '))),who+': hockey not counted in the week sessions');
 ok(await p.evaluate(()=>!canLog('Thu',rawFor(PLAN[8],'thu','Thu'),PLAN[8])&&canLog('Thu',rawFor(PLAN[9],'thu','Thu'),PLAN[9])),who+': week 10 keeps hockey');await p.close()}
{const p=await open('fred','2026-11-26T08:00:00');const t=await p.evaluate(()=>document.querySelector('#today').innerText);ok(/Recovery day/.test(t)&&!/Log hockey/.test(t),'Thursday Today shows a recovery day, no hockey');await p.close()}
{const p=await open('grady','2026-11-23T18:00:00');await p.clock.runFor(500);ok(/Hockey/.test(await thuRow(p)),'Grady keeps hockey');await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
