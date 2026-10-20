// v108: heart rate checks during the Sunday zone 2 run. Workout mode input, zone status, readings list,
// finish sheet pre-filled with the average, notes lines, Plan result chip, HR only save. node tests/hrcheck.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_unit_v2',JSON.stringify('lb'))});
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-10-25T09:00:00');
await p.evaluate(()=>startWorkout(4,6,'2026-10-25'));await p.clock.runFor(600);
ok(await p.locator('#workout [data-hrin]').isVisible(),'Sunday workout shows a heart rate box');
ok(/Zone 2 is 130 to 140/.test(await p.locator('#workout .hr-box').innerText()),'empty box explains the zone');
await p.clock.runFor(8*60000);await p.fill('#workout [data-hrin]','138');await p.click('#workout [data-hradd]');await p.clock.runFor(300);
let hb=await p.locator('#workout .hr-box').innerText();ok(/Last 138 bpm · in zone 2/.test(hb)&&/138 at 8′/.test(hb),'138 at 8 min: in zone 2 · '+hb.replace(/\n/g,' | '));
await p.clock.runFor(10*60000);await p.fill('#workout [data-hrin]','146');await p.press('#workout [data-hrin]','Enter');await p.clock.runFor(300);
hb=await p.locator('#workout .hr-box').innerText();ok(/Last 146 bpm · above zone 2, slow down/.test(hb)&&/avg 142/.test(hb),'146 by Enter: above zone 2, avg 142');
ok(await p.evaluate(()=>!getComputedStyle(document.querySelector('#workout .hr-st')).color.includes('NaN')),'status line styled');
ok(await p.evaluate(()=>{const it=document.querySelector('#workout [data-hrin]').closest('[data-wo]');return!document.querySelector(`#workout [data-wo="${it.dataset.wo}"] .ck`).textContent})===true,'tapping inside the box did not tick the run');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');await p.locator('#workout .hr-box').scrollIntoViewIfNeeded();await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/hr.png'});
// reopen keeps readings
await p.evaluate(()=>{minimizeWorkout();openWorkout()});await p.clock.runFor(300);ok(/avg 142/.test(await p.locator('#workout .hr-box').innerText()),'readings survive minimize');
// finish
await p.evaluate(()=>finishWorkout());await p.clock.runFor(400);
ok(await p.locator('#finRunWrap').isVisible()&&(await p.inputValue('#finHr'))==='142','finish sheet pre-fills Avg heart rate 142');
ok(/above zone 2/.test(await p.locator('#finPace').innerText()),'finish sheet shows the zone check');
await p.fill('#finKm','5');await p.fill('#finTime','32:00');await p.click('#finish [data-fr="5"]');await p.click('#finSave');await p.clock.runFor(500);
const lg=await p.evaluate(()=>getLogs('fred').find(l=>l.date==='2026-10-25'));
ok(lg&&/Run: 5 km in 32:00 \(6:24\/km\) · avg HR 142/.test(lg.notes)&&/HR checks: 138, 146/.test(lg.notes),'notes: Run line with avg HR and HR checks · '+(lg&&lg.notes.replace(/\n/g,' | ')));
await p.evaluate(()=>{currentWeek=4;showView('plan')});await p.clock.runFor(400);
ok(/142 bpm/.test(await p.locator('.day-card[data-day=Sun]').innerText()),'Plan Sunday result line shows 142 bpm');
await p.evaluate(()=>showView('today'));await p.clock.runFor(300);ok(/HR checks: 138, 146|avg HR 142/.test(await p.locator('#today').innerText()),'Today done card carries the heart rate');
await p.close();
// HR only, no km or time
p=await open('2026-11-01T09:00:00');await p.evaluate(()=>startWorkout(5,6,'2026-11-01'));await p.clock.runFor(600);
await p.fill('#workout [data-hrin]','134');await p.click('#workout [data-hradd]');await p.clock.runFor(300);
await p.evaluate(()=>finishWorkout());await p.clock.runFor(400);await p.click('#finish [data-fr="4"]');await p.click('#finSave');await p.clock.runFor(500);
const l2=await p.evaluate(()=>getLogs('fred').find(l=>l.date==='2026-11-01'));ok(l2&&/Run: avg HR 134/.test(l2.notes)&&!/HR checks/.test(l2.notes),'HR only save keeps the heart rate: '+(l2&&l2.notes.replace(/\n/g,' | ')));
// not on other days
await p.close();p=await open('2026-10-20T09:00:00');await p.evaluate(()=>startWorkout(4,1,'2026-10-20'));await p.clock.runFor(600);
ok(await p.locator('#workout [data-hrin]').count()===0,'no heart rate box on Tuesday intervals');await p.close();
ok(/HR checks: 138, 142, 145/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains HR checks');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
