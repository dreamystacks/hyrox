// v104: Sunday easy run everywhere (labels, finish sheet distance and time, km tracker) and the Oct 18 log fix. node tests/sunrun.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-18T17:30:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([
{id:'s1',date:'2026-10-17',week:3,session:'Sat: HYROX sim',duration:35,distance:4,notes:'Sim week 3 · total 33:52',updatedAt:'2026-10-17T19:00:00Z',savedAt:'2026-10-17T19:00:00Z'},
{id:'r1',date:'2026-10-18',week:3,session:'Sun: Optional easy run',duration:5,distance:0,rpe:6,knee:1,notes:'Workout 0:04 · 0/1 exercises done',updatedAt:'2026-10-18T21:30:00Z',savedAt:'2026-10-18T21:30:00Z'}]))});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(4500);
const fx=await p.evaluate(()=>{const x=getLogs('fred').find(l=>l.id==='r1');return[x.distance,x.duration,x.pace,/5\.01 km in 30:51/.test(x.notes),!/Workout 0:04/.test(x.notes)]});
ok(JSON.stringify(fx)===JSON.stringify([5.01,31,'6:09',true,true]),'Oct 18 run fixed to 5.01 km, 31 min, 6:09/km '+JSON.stringify(fx));
ok(/9(\.0|\.01)?\/7km/.test(await p.locator('#today .wk-tot').innerText().then(t=>t.replace(/\s+/g,''))),'Today km tracker counts the run: '+(await p.locator('#today .wk-tot').innerText()).replace(/\s+/g,' '));
ok(/Easy run/i.test(await p.locator('#today').innerText())&&!/Recovery/i.test(await p.locator('#today .td-done').innerText()),'Today done card says Easy run, not Recovery');
await p.evaluate(()=>showView('plan'));await p.clock.runFor(500);
const sun=await p.locator('.day-card[data-day=Sun]').innerText();ok(/EASY RUN|Easy run/.test(sun)&&!/RECOVERY|Recovery/.test(sun),'Plan Sunday card tag and title: '+sun.replace(/\n/g,' | ').slice(0,80));
ok(/5\.01 km/.test(sun),'Plan Sunday card shows the km');
ok(await p.evaluate(()=>[...document.querySelectorAll('#session option')].some(o=>o.textContent==='Sun plan: Easy run')),'log form option reads Sun plan: Easy run');
// a new Sunday run through the finish sheet (week 4)
await p.clock.setFixedTime(new Date('2026-10-25T10:00:00'));await p.evaluate(()=>{showView('today')});await p.clock.runFor(500);
await p.evaluate(()=>openFinish({date:'2026-10-25',session:'Sun: Optional easy run',askRun:true,duration:1}));
ok(await p.locator('#finRunWrap').isVisible(),'finish sheet asks for distance and time on a Sunday run');
await p.fill('#finKm','6');await p.fill('#finTime','36:30');ok((await p.locator('#finPace').innerText())==='Pace 6:05 /km','pace computed');
await p.click('#finish [data-fr="5"]');await p.click('#finSave');await p.clock.runFor(500);
const nl=await p.evaluate(()=>getLogs('fred').find(l=>l.date==='2026-10-25'));ok(nl&&nl.distance===6&&nl.duration===37&&nl.pace==='6:05'&&/Run: 6 km in 36:30/.test(nl.notes),'saved with 6 km, 37 min, 6:05 '+JSON.stringify(nl&&[nl.distance,nl.duration,nl.pace]));
// zone 2 shows on every surface (Fred, Oct 18: keep additions coherent everywhere)
await p.clock.setFixedTime(new Date('2026-10-31T18:00:00'));await p.evaluate(()=>showView('today'));await p.clock.runFor(500);
ok(/Zone 2 · 30 to 40 min/.test(await p.locator('#today .td-next').innerText()),'Saturday Up next shows Zone 2 for Sunday: '+(await p.locator('#today .td-next').innerText()).replace(/\n/g,' | '));
await p.clock.setFixedTime(new Date('2026-11-01T10:00:00'));await p.evaluate(()=>showView('today'));await p.clock.runFor(500);
const td=await p.locator('#today').innerText();ok(/Zone 2 · 30 to 40 min/.test(td)&&/Zone 2 · 130 to 140 bpm/.test(td),'Today Sunday card: subtitle and bpm chip');
await p.evaluate(()=>{currentWeek=6;showView('plan')});await p.clock.runFor(400);await p.locator('.day-card[data-day=Sun] .day-head').click();await p.clock.runFor(300);const pc=await p.locator('.day-card[data-day=Sun]').innerText();ok(/ZONE 2 · 130 TO 140 BPM|Zone 2 · 130 to 140 bpm/i.test(pc),'Plan Sunday card badge: '+pc.replace(/\n/g,' | ').slice(0,120));
await p.evaluate(()=>showView('today'));await p.clock.runFor(300);await p.locator('#today [data-start]').first().click();await p.clock.runFor(800);
ok(/Zone 2 · 130 to 140 bpm/.test(await p.locator('#workout').innerText()),'workout mode shows the zone 2 chip');
await p.evaluate(()=>openFinish({date:'2026-11-01',session:'Sun: Optional easy run',askRun:true,duration:1}));await p.fill('#finKm','5');await p.fill('#finTime','32:00');await p.fill('#finHr','138');
ok(/in zone 2/.test(await p.locator('#finPace').innerText()),'finish sheet: heart rate check says in zone 2');
await p.click('#finish [data-fr="4"]');await p.click('#finSave');await p.clock.runFor(400);
ok(/avg HR 138/.test(await p.evaluate(()=>getLogs('fred').find(l=>l.date==='2026-11-01').notes)),'avg HR saved in the Run line');
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(f?f+' failed':'all passed');process.exit(f?1:0)})();
