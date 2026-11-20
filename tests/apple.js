// v183 Apple Watch athlete (Will): Health_Daily rows from the HYROX Santé shortcut drive readiness on Today and the Health rows
// (no Body Battery or stress, breathing and wrist temperature instead, Apple Health labels), and Import from Apple Watch on the
// report card opens the HYROX Workout shortcut, then reads its heart rate (action health_get) and adds avg and max HR to the log. node tests/apple.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const R=(d,rhr,hrv,ss,sh,rr,wt,steps)=>({athlete:'will',date:d,resting_hr:String(rhr),hrv_last_night:hrv==null?'':String(hrv),hrv_weekly_avg:'',hrv_status:'',sleep_score:String(ss),sleep_hours:String(sh),deep_min:'50',rem_min:'90',body_battery_high:'',body_battery_low:'',stress_avg:'',steps:String(steps),resp_rate:String(rr),wrist_temp:String(wt),active_kcal:'400',updated_at:'2026-11-20T12:10:00Z'});
const ROWS=[R('2026-11-16',60,40,82,7.4,14.1,35.4,9000),R('2026-11-17',61,42,85,7.6,14.0,35.5,8000),R('2026-11-18',61,45,81,7.2,14.2,35.4,10515),R('2026-11-19',60,44,91,8.1,14.0,35.44,7675),R('2026-11-20',59,45,89,6.3,13.9,35.47,67)];
// heart rate as Shortcuts sends it: one reading a minute from 6:50 to 8:10 PM, the session (6:55 to 7:40 PM) at 150 to 170
const hv=[],hs=[];for(let m=0;m<=80;m++){const t=new Date(2026,10,20,18,50+m),inS=m>=5&&m<=50;hv.push(inS?150+(m%21):80);const h=t.getHours(),h12=h%12||12;hs.push(`Nov 20, 2026 at ${h12}:${String(t.getMinutes()).padStart(2,'0')} ${h>=12?'PM':'AM'}`)}
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const open=async(opt={})=>{const p=await b.newPage({viewport:{width:opt.w||390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;p.bodies=[];
 await p.route('https://x.test/**',async r=>{const body=JSON.parse(r.request().postData()||'{}');p.bodies.push(body);
  if(body.action==='garmin')return r.fulfill({status:200,body:JSON.stringify(opt.empty?{ok:false,error:'no_garmin_key'}:{ok:true,source:'apple',activities:[],daily:ROWS})});
  if(body.action==='health_get')return r.fulfill({status:200,body:JSON.stringify(p.hr?{ok:true,found:true,received_at:'2030-01-01T00:00:00Z',log:body.log,hr_v:hv.join('\n'),hr_s:hs.join('\n')}:{ok:true,found:false})});
  return r.fulfill({status:200,body:JSON.stringify({ok:true})})});
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','will');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://x.test/exec',key:'k'}))});
 await p.clock.install({time:new Date(opt.at||'2026-11-20T19:45:00')});await p.goto(URL);await p.clock.runFor(5000);await p.clock.runFor(2000);await p.waitForTimeout(300);await p.clock.runFor(500);return p};
let p=await open();
ok(p.bodies.some(x=>x.action==='garmin'&&x.athlete==='will'),'Will asks the sync web app for his daily rows (action garmin)');
const r=await p.evaluate(()=>readiness('will'));
ok(r&&r.score>=70&&r.r.rhr===59&&r.r.sleepH===6.3&&r.r.bbHi==null,'readiness from Apple data without Body Battery '+(r&&r.score));
ok(r&&!/Body Battery/.test(r.text),'readiness text never mentions Body Battery: '+(r&&r.text));
const t=await p.evaluate(()=>document.querySelector('#today .rdy').innerText.replace(/\s+/g,' '));
ok(/Readiness/.test(t)&&/HRV 45 ms/.test(t)&&/Sleep 6:18/.test(t)&&/Resting HR 59 bpm/.test(t)&&!/Garmin/.test(t),'Today readiness block for Will '+t.slice(0,140));
await p.evaluate(()=>showView('health'));await p.clock.runFor(800);
const h=await p.evaluate(()=>[...document.querySelectorAll('#health .hl-list .lr b')].map(b=>b.textContent));
ok(JSON.stringify(h)==='["Resting HR","HRV","Sleep","Respiratory rate","Wrist temperature","Steps","Body weight"]','Health rows '+JSON.stringify(h));
const ft=await p.evaluate(()=>document.querySelector('#health .hl-foot').innerText);ok(/Apple Health · updated/.test(ft)&&!(await p.evaluate(()=>/Garmin/.test(document.querySelector('#health').innerText))),'Health footer says Apple Health '+ft);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at 390');
// a Tuesday session saved at 7:42 PM after a 45 min workout
await p.evaluate(()=>{showView('today');putLog({id:String(new Date(2026,10,20,19,42).getTime()),date:'2026-11-20',session:'Fri: Upper + erg + arms B',duration:45,rpe:7,notes:'Workout 45:00 · 6/6 exercises done',savedAt:new Date(2026,10,20,19,42).toISOString()});refreshViews()});await p.clock.runFor(500);
ok(await p.locator('#today [data-awimp]').count()===1&&await p.locator('#today [data-gimp]').count()===0,'done card offers Import from Apple Watch, not Garmin');
const id=await p.locator('#today [data-awimp]').getAttribute('data-awimp');
await p.evaluate(()=>{document.addEventListener('click',e=>{if(e.target.closest('[data-awimp]'))window.__nav=true},true)});
await p.evaluate(i=>store(k('awpend'),{id:i,at:Date.now()}),id);
await p.evaluate(()=>awPoll(true));await p.clock.runFor(30000);await p.waitForTimeout(200);
ok(await p.evaluate(()=>!getLogs().some(x=>/Apple Watch:/.test(x.notes||''))),'nothing found yet: the log is unchanged');
p.hr=true;await p.evaluate(i=>store(k('awpend'),{id:i,at:Date.now()}),id);const pr=p.evaluate(()=>awPoll(true));await p.clock.runFor(2000);await pr;await p.clock.runFor(500);
const lg=await p.evaluate(i=>getLogs().find(x=>x.id===i).notes,id);
ok(/^Apple Watch: avg HR 1[45]\d · max HR 170 · 51 readings$/m.test(lg),'only the readings in the session window (start 3 min early, end 2 min late) count: '+lg.split('\n').pop());
ok(p.bodies.some(x=>x.action==='health_get'&&x.log===id&&x.athlete==='will'),'health_get asks for that log');
const card=await p.evaluate(()=>document.querySelector('#today .rc2').innerText.replace(/\s+/g,' '));
ok(/Avg HR/.test(card)&&/170 bpm/.test(card)&&!/Apple Watch:/.test(card),'report card shows Avg HR and Max HR, the notes line stays hidden');
ok(await p.locator('#today [data-awimp]').count()===0,'Import button gone once imported');
await p.clock.runFor(3000);ok(p.bodies.some(x=>!x.action&&/Apple Watch: avg HR/.test(JSON.stringify(x)))||await p.evaluate(()=>Object.keys(load('hrx_dirty_v1',{})).some(x=>x.startsWith('log|will'))),'updated log synced to the Sheet');
ok(!p.errs.length,'no page errors '+p.errs.join('|'));await p.close();
p=await open({empty:true});ok(/HYROX Santé/.test(await p.locator('#today .rdy').innerText()),'no data yet: Today points to the HYROX Santé shortcut');
const c1=p.bodies.length;await p.evaluate(()=>{gdTried={};renderToday()});await p.clock.runFor(3000);ok(p.bodies.length===c1,'no retry right away');await p.close();
p=await open({w:360});await p.evaluate(()=>showView('health'));await p.clock.runFor(800);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'no overflow at 360');await p.close();
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
