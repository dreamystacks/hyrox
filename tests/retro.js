// Retro logging and sheet closing: node tests/retro.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Clock pinned to Fri Oct 2 2026 (week 1). Thursday hockey was not logged.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844},hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2','[]')});
await p.clock.install({time:new Date('2026-10-02T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);
const thu=p.locator('.day-card[data-day=Thu]');await thu.locator('.day-head').click();
check('Thu card offers Log hockey for Thu',await thu.locator('[data-hockey]').innerText(),'LOG HOCKEY · THU');
await thu.locator('[data-hockey]').click();await p.clock.runFor(300);
check('finish sheet opens with Thursday as the date',await p.evaluate(()=>[!$('finish').hidden,finPayload.date,finPayload.session]),[true,'2026-10-01','Thu: Hockey']);
await p.mouse.click(195,30);await p.clock.runFor(300);
check('tapping above the sheet closes it',await p.evaluate(()=>$('finish').hidden),true);
await thu.locator('[data-hockey]').click();await p.clock.runFor(300);
await p.click('#finRpe [data-fr="6"]');await p.click('#finSave');await p.clock.runFor(500);await p.click('.bottombar [data-view=plan]');await p.clock.runFor(400);
check('saved on Thursday, Thu card now Logged',await p.evaluate(()=>[getLogs().map(x=>x.date+' '+x.session),document.querySelector('.day-card[data-day=Thu] .day-logged')?.textContent.trim()]),[['2026-10-01 Thu: Hockey'],'✓ Logged']);
// Mon and Tue missed: Start plus "log it for Mon"
const mon=p.locator('.day-card[data-day=Mon]');await mon.locator('.day-head').click();
check('Mon card: Start and a retro link',[await mon.locator('[data-start]').count(),await mon.locator('[data-retro]').innerText()],[1,'Already done it? Log it for Mon']);
await mon.locator('[data-retro]').click();await p.clock.runFor(300);
check('retro link opens the log form on Monday with its session',await p.evaluate(()=>[document.querySelector('.view.active').id,date.value,session.value]),['log','2026-09-28','Mon: Lower + sled']);
await p.click('#cancelEdit');await p.clock.runFor(300);
check('future days have no log buttons',await p.evaluate(()=>!!document.querySelector('.day-card[data-day=Sat] [data-retro],.day-card[data-day=Sat] [data-start]')),false);
// swipe down closes the settings sheet
await p.evaluate(()=>settingsModal.classList.add('show'));await p.clock.runFor(200);
await p.evaluate(()=>{const sh=settingsModal.querySelector('.sheet'),T=(t,y)=>sh.dispatchEvent(new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:1,target:sh,clientY:y,clientX:100})]}));T('touchstart',300);T('touchmove',350);T('touchmove',450);T('touchend',450)});
await p.clock.runFor(400);
check('swiping the settings sheet down closes it',await p.evaluate(()=>settingsModal.classList.contains('show')),false);
await p.evaluate(()=>settingsModal.classList.add('show'));await p.evaluate(()=>{const sh=settingsModal.querySelector('.sheet'),T=(t,y)=>sh.dispatchEvent(new TouchEvent(t,{bubbles:true,touches:t==='touchend'?[]:[new Touch({identifier:1,target:sh,clientY:y,clientX:100})]}));T('touchstart',300);T('touchmove',330);T('touchend',330)});await p.clock.runFor(400);
check('a short drag snaps back and keeps it open',await p.evaluate(()=>settingsModal.classList.contains('show')),true);
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
