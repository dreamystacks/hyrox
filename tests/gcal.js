// v186 Garmin calories on the report card: a log whose Garmin: line has kcal shows it; an older log without kcal takes it from the
// activity list the garmin action returns (cached per athlete); up to 6 stat tiles, an odd last tile spans the row. node tests/gcal.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const LOGS=[{id:'1795189000000',athlete:'fred',date:'2026-11-19',session:'Thu: Hockey',duration:75,rpe:7,notes:'Workout 74:54 · imported from Garmin\nGarmin: 25137292198 · Ice Hockey · avg HR 140 · max HR 180',updatedAt:'2026-11-20T03:40:00Z',savedAt:'2026-11-20T03:40:00Z'},
 {id:'1795100000000',athlete:'fred',date:'2026-11-18',session:'Tue: Run + arms A',duration:60,rpe:8,distance:4,pace:'5:40',notes:'Runs: 5:31 / 5:39 / 5:44 / 5:35\nGarmin: 25126382230 · Indoor Running · avg HR 163 · max HR 176 · 392 kcal',updatedAt:'2026-11-19T03:00:00Z',savedAt:'2026-11-19T03:00:00Z'}];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));let calls=0;
await p.route('https://x.test/**',async r=>{const body=JSON.parse(r.request().postData()||'{}');if(body.action==='garmin'){calls++;return r.fulfill({status:200,body:JSON.stringify({ok:true,activities:[{id:'25137292198',date:'2026-11-19',type:'ice_hockey',min:74.9,hr:140,max:180,cal:692,laps:[]}],daily:[]})})}return r.fulfill({status:200,body:JSON.stringify({ok:true})})});
await p.addInitScript(L=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://x.test/exec',key:'k'}));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(L));
 localStorage.setItem('hrx_fred_gdaily_v2',JSON.stringify({at:new Date('2026-11-19T22:00:00').toISOString(),rows:[]}))},LOGS);
await p.clock.install({time:new Date('2026-11-19T22:50:00')});await p.goto(URL);await p.clock.runFor(5000);await p.clock.runFor(2000);await p.waitForTimeout(300);await p.clock.runFor(500);
ok(calls>=1,'empty calorie cache makes the app ask the garmin action even inside the 3 hour cache');
await p.evaluate(()=>refreshViews());await p.clock.runFor(300);
const t=await p.evaluate(()=>{const c=document.querySelector('#today .rc2');return c&&{txt:c.innerText.replace(/\s+/g,' '),n:c.querySelectorAll('.rc-st').length,cls:c.querySelector('.rc-stats').className}});
ok(t&&/Calories 692 kcal/.test(t.txt)&&/Avg HR 140 bpm/.test(t.txt)&&/Max HR 180 bpm/.test(t.txt),'hockey card shows Garmin calories from the activity cache: '+(t&&t.txt.slice(0,160)));
ok(t&&t.n===5&&/n5/.test(t.cls),'five stat tiles '+(t&&t.n));
ok(await p.evaluate(()=>{const s=[...document.querySelectorAll('#today .rc2 .rc-st')];const a=s[3].getBoundingClientRect(),z=s[4].getBoundingClientRect();return z.width>a.width*1.8}),'the fifth tile spans the row');
const r=await p.evaluate(()=>reportCard(getLogs().find(x=>x.id==='1795100000000'),{mine:true}));ok(/392 kcal/.test(r)&&(r.match(/class="rc-st"/g)||[]).length>=7&&/Max HR/.test(r),'run card keeps the kcal and Max HR (v208: up to 8 tiles)');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
