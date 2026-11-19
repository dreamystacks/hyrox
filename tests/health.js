// v167 Garmin daily data: readiness on Today (score, verdict, HRV, sleep, resting HR), Health page rows with sparklines and tags,
// fetch through the sync web app (action garmin) cached per athlete, no key state, no sync state, rate limit. node tests/health.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const R=(d,rhr,hrv,ss,sh,bh,bl,st,steps)=>({athlete:'fred',date:d,resting_hr:String(rhr),hrv_last_night:hrv==null?'':String(hrv),hrv_weekly_avg:'',hrv_status:'',sleep_score:ss==null?'':String(ss),sleep_hours:sh==null?'':String(sh),body_battery_high:String(bh),body_battery_low:String(bl),stress_avg:String(st),steps:String(steps),updated_at:'2026-11-18T23:35:00Z'});
const GOOD=[R('2026-11-13',48,62,78,7.5,95,20,25,9000),R('2026-11-14',50,55,65,6.4,80,22,35,7000),R('2026-11-15',47,60,80,7.8,98,30,20,6000),R('2026-11-16',48,57,72,7,90,28,28,10000),R('2026-11-17',47,null,null,null,72,30,4,210),
 Object.assign(R('2026-11-18',48,null,null,null,75,72,13,0),{updated_at:'2026-11-18T11:10:00Z'}),R('2026-11-18',47,53,72,6.2,100,72,9,67)];
const BAD=GOOD.slice(0,5).concat([R('2026-11-18',55,40,45,4.9,38,10,40,500)]);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const open=async(rows,opt={})=>{const p=await b.newPage({viewport:{width:opt.w||390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;p.calls=0;
 await p.route('https://x.test/**',async r=>{p.calls++;const body=JSON.parse(r.request().postData()||'{}');p.last=body;await r.fulfill({status:200,body:JSON.stringify(opt.nokey?{ok:false,error:'no_garmin_key'}:{ok:true,activities:[],daily:rows})})});
 await p.addInitScript(o=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');if(!o.nosync)localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://x.test/exec',key:'k'}))},opt);
 await p.clock.install({time:new Date('2026-11-18T19:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.clock.runFor(2000);await p.waitForTimeout(300);await p.clock.runFor(500);return p};
let p=await open(GOOD);
ok(p.calls>=1&&p.last.action==='garmin'&&p.last.athlete==='fred','Today asks the sync web app for Garmin data (action garmin)');
const r=await p.evaluate(()=>readiness('fred'));
ok(r&&r.score>=70&&r.verdict==='As planned'&&r.r.rhr===47&&r.r.sleepH===6.2,'duplicate rows for a date keep the latest update; good night gives As planned '+(r&&r.score));
const t=await p.evaluate(()=>document.querySelector('#today .rdy').innerText.replace(/\s+/g,' '));
ok(/Morning readiness/.test(t)&&/\b\d+ Readiness As planned/.test(t)&&/HRV 53 ms/.test(t)&&/Sleep 6:12/.test(t)&&/Resting HR 47 bpm/.test(t),'Today readiness shows score, verdict, HRV, sleep and resting HR '+t.slice(0,160));
const n0=p.calls;await p.evaluate(()=>{renderToday();renderToday()});await p.clock.runFor(3000);ok(p.calls===n0,'no new Garmin call within 3 hours');
await p.evaluate(()=>showView('health'));await p.clock.runFor(800);
const h=await p.evaluate(()=>[...document.querySelectorAll('#health .hl-list .lr b')].map(b=>b.textContent));
ok(JSON.stringify(h)==='["Resting HR","HRV","Sleep","Body Battery","Stress","Steps","Body weight"]','Health rows '+JSON.stringify(h));
ok(await p.evaluate(()=>document.querySelectorAll('#health .hl-sp svg').length>=5&&!!document.querySelector('#health .hl-hero')),'sparklines and the readiness summary on Health');
await p.click('#hlRefresh');await p.clock.runFor(1500);ok(p.calls===n0+1,'Refresh forces a new pull');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at 390');ok(!p.errs.length,'no page errors '+p.errs.join('|'));await p.close();
p=await open(BAD);const rb=await p.evaluate(()=>readiness('fred'));ok(rb&&rb.lv==='bad'&&rb.verdict==='Recovery day'&&/zone 2 or mobility/.test(rb.text),'bad night gives Recovery day '+(rb&&rb.score));
ok(/Recovery day/.test(await p.locator('#today .rdy').innerText()),'Today shows Recovery day');await p.close();
p=await open(GOOD,{nokey:true});ok(/No Garmin key/.test(await p.locator('#today .rdy').innerText()),'no key: Today says there is no Garmin key yet');
const c1=p.calls;await p.evaluate(()=>{gdTried={};renderToday()});await p.clock.runFor(3000);ok(p.calls===c1,'no key: no retry for a day');await p.close();
p=await open(GOOD,{nosync:true});ok(p.calls===0&&/Set up sync/.test(await p.locator('#today .rdy').innerText()),'no sync: no call and a set up sync note');await p.close();
p=await open(GOOD,{w:360});await p.evaluate(()=>showView('health'));await p.clock.runFor(800);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'no overflow at 360');await p.close();
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
