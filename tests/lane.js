// Gym lane, bar weight and keyboard pin check: node tests/lane.js (needs playwright; Chromium at /opt/pw-browsers/chromium)
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
// fake visual viewport so the keyboard pin can be exercised off device
await p.addInitScript(()=>{const l={};window.__vv={offsetTop:0,height:innerHeight,addEventListener:(t,f)=>{(l[t]=l[t]||[]).push(f)},fire:t=>(l[t]||[]).forEach(f=>f())};Object.defineProperty(window,'visualViewport',{value:window.__vv,configurable:true})});
await p.clock.install({time:new Date('2026-09-28T16:00:00')});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
// lane seeded for Fred: Plan text rounds 20 m to 2 x 12 m
ok(await p.evaluate(()=>laneM())===12,'Fred starts with a 12 m lane');
const monTxt=await p.evaluate(()=>sessionItems('Mon',PLAN[0].mon,PLAN[0]).map(i=>i.detail).join(' '));
ok(/Sled push 2×12 m/.test(monTxt)&&!/20 m/.test(monTxt),'Monday EMOM shows Sled push 2×12 m: '+monTxt.slice(0,120));
ok(await p.evaluate(()=>laneFix('sled pull 12.5 m')==='sled pull 12 m'&&laneFix('sled push 25 m race weight')==='sled push 2×12 m race weight'&&laneFix('sled push 50 m')==='sled push 4×12 m'),'rounding: 12.5 to 1 length, 25 to 2, 50 to 4');
ok(await p.evaluate(()=>laneFix('farmers carry 20 m')==='farmers carry 20 m'),'only sled moves are rounded');
// Settings row
await p.click('#avatarBtn').catch(()=>p.evaluate(()=>avatarBtn.click()));
ok(await p.locator('#laneIn').inputValue()==='12','Settings shows 12');
await p.fill('#laneIn','0');await p.locator('#laneIn').dispatchEvent('change');
ok(await p.evaluate(()=>laneM())===0,'lane 0 turns it off');
ok(await p.evaluate(()=>/20 m/.test(sessionItems('Mon',PLAN[0].mon,PLAN[0]).map(i=>i.detail).join(' '))),'off: plan distance back to 20 m');
ok(await p.locator('#settingsModal.show').count()===1,'settings sheet stays open while editing the lane');
await p.fill('#laneIn','12');await p.locator('#laneIn').dispatchEvent('change');await p.evaluate(()=>closeSettings.click());
// workout: bar weight
await p.evaluate(()=>startWorkout(1,0,'2026-09-28'));await p.clock.runFor(600);
ok((await p.locator('#workout').innerText()).includes('2×12 m'),'workout screen shows 2×12 m');
const bp=p.locator('#workout [data-bps]').first();ok(await bp.count()===1,'trap bar row has a per side input');
await bp.fill('45');await p.clock.runFor(100);
const tot1=await p.locator('#workout .wt-row [data-wt]').first().inputValue();ok(tot1==='135','45 per side + default 45 bar = 135 (got '+tot1+')');
ok(await p.locator('#workout [data-barw]').first().inputValue()==='45','default bar 45 saved and shown');
await p.locator('#workout [data-barw]').first().fill('55');await p.locator('#workout [data-barw]').first().dispatchEvent('change');
ok(await p.locator('#workout .wt-row [data-wt]').first().inputValue()==='145','bar changed to 55 recomputes total to 145');
ok(await p.evaluate(()=>Object.values(woLoads()).includes('145')),'workout state holds the total 145');
ok(await p.evaluate(()=>barW('trap','lb')===55),'bar weight remembered per exercise');
// keyboard pin
await p.focus('#woNote');await p.evaluate(()=>{__vv.offsetTop=120;__vv.height=420;__vv.fire('resize');__vv.fire('scroll')});await p.clock.runFor(700);
const st=await p.evaluate(()=>({t:workout.style.top,h:workout.style.height}));ok(st.t==='120px'&&st.h==='420px','typing pins the workout screen to the visual viewport '+JSON.stringify(st));
await p.screenshot({path:OUT+'/lane-pin.png'});
await p.evaluate(()=>{document.activeElement.blur()});await p.clock.runFor(900);
ok(await p.evaluate(()=>workout.style.top===''&&workout.style.height===''),'blur releases the pin');
// notes line
await p.evaluate(()=>finishWorkout());await p.clock.runFor(200);
const nt=await p.evaluate(()=>finPayload.notes);ok(/Lane: 12 m · Sled push 2 × 12 m = 24 m/.test(nt),'finish notes carry the Lane line: '+nt.split('\n').filter(x=>/Lane/.test(x)).join('|'));
ok(/Loads \(lb\): Trap bar[^\n]*145/.test(nt)||/145/.test(nt),'loads line holds the 145 total');
ok(!errs.length,'no page errors '+JSON.stringify(errs));
console.log(fails?fails+' FAILED':'ALL OK');await b.close();process.exit(fails?1:0)})();
