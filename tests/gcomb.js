// v187 combined Garmin import: a Friday logged in the app (lifts), then Import from Garmin with two watch activities (Strength, then the
// RoxZone EMOM): tap + on both and Combine; one Garmin line with both ids, kcal and minutes summed, max HR the highest, avg HR weighted by
// minutes; the report card shows the combined stats; both ids count as imported; a single tap on a row still imports just that one;
// a second import onto a log that already has a Garmin line merges into it. node tests/gcomb.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const ACTS=[{id:'901',date:'2026-11-20',start:'2026-11-20 18:00:00',type:'strength_training',name:'Strength',min:40,hr:110,max:150,cal:250,laps:[]},{id:'902',date:'2026-11-20',start:'2026-11-20 18:42:00',type:'hiit',name:'HYROX EMOM',min:16,hr:160,max:182,cal:200,laps:[]}];
const LOG={id:'f1',date:'2026-11-20',session:'Fri: Upper + erg + arms B',duration:60,rpe:8,notes:'Workout 58:00 · 6/6 exercises done\nLoads (lb): Weighted pull-up 25 (3/3)',updatedAt:'2026-11-20T23:50:00Z',savedAt:'2026-11-20T23:50:00Z'};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([L,A])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://x.test/exec',key:'k'}));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(L));
  window.fetch=async(u,o)=>{const body=o&&o.body?JSON.parse(o.body):{};if(body.action==='garmin')return new Response(JSON.stringify({ok:true,activities:A,daily:[]}));return new Response(JSON.stringify({ok:true}))}},[logs,ACTS]);
 await p.clock.install({time:new Date('2026-11-20T19:10:00')});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open([LOG]);
await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);
ok(await p.locator('#gimpModal.show .gi-sel').count()===2,'picker shows a + next to each activity');
ok(await p.locator('#gimpModal [data-gcomb]').isDisabled(),'Combine is off until two are picked');
await p.locator('#gimpModal .gi-sel').nth(1).click();await p.locator('#gimpModal .gi-sel').nth(0).click();
ok(/Combine 2 workouts/i.test(await p.locator('#gimpModal [data-gcomb]').innerText()),'Combine 2 workouts');
await p.locator('#gimpModal [data-gcomb]').click();await p.clock.runFor(600);
const n=await p.evaluate(()=>{const L=getLogs().filter(x=>x.date==='2026-11-20'&&!x.deleted);return{n:L.length,nt:L[0].notes}});
ok(n.n===1,'still one log');
ok(/^Garmin: 901\+902 · Strength \+ HYROX EMOM · avg HR 124 · max HR 182 · 450 kcal · 56 min$/m.test(n.nt),'one combined Garmin line (avg weighted 40/16 min): '+(n.nt.match(/^Garmin: .*$/m)||[''])[0]);
ok((n.nt.match(/^Garmin: /mg)||[]).length===1,'no second Garmin line');
const card=await p.evaluate(()=>document.querySelector('#today .rc2').innerText.replace(/\s+/g,' '));ok(/Avg HR 124 bpm/.test(card)&&/Calories 450 kcal/.test(card)&&/Max HR 182 bpm/.test(card),'report card shows the combined stats');
ok(await p.evaluate(()=>{const d=gimpDone();return d.has('901')&&d.has('902')}),'both ids count as imported');
await p.close();
// single tap still imports one, then a later import of the other merges into the same line
p=await open([LOG]);await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);await p.locator('#gimpModal .gi-row').nth(1).click();await p.clock.runFor(600);
let nt=await p.evaluate(()=>getLogs().find(x=>x.id==='f1').notes);ok(/^Garmin: 902 · HYROX EMOM · avg HR 160 · max HR 182 · 200 kcal · 16 min$/m.test(nt),'a single tap imports that one activity');
await p.evaluate(()=>refreshViews());await p.clock.runFor(300);await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);
ok(await p.locator('#gimpModal.show .gi-row').count()===1,'only the strength activity is left');
await p.locator('#gimpModal .gi-row').first().click();await p.clock.runFor(600);
nt=await p.evaluate(()=>getLogs().find(x=>x.id==='f1').notes);
ok(/^Garmin: 902\+901 · HYROX EMOM \+ Strength · avg HR 124 · max HR 182 · 450 kcal · 56 min$/m.test(nt)&&(nt.match(/^Garmin: /mg)||[]).length===1,'the second import merges into the existing line: '+(nt.match(/^Garmin: .*$/m)||[''])[0]);
ok(await p.evaluate(()=>getLogs().filter(x=>x.date==='2026-11-20'&&!x.deleted).length)===1,'still one log');
await p.close();
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
