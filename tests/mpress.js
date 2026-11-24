// v220 (Fred, Nov 24: new DB shoulder press machine at the gym): Fridays weeks 15 to 23 add "DB shoulder press machine 3 x 8-12"
// (2 x 10 in deloads 16 and 20) after the pull + press line. Plan text, guide key, Today row, Plan sheet, workout set rows, Excel. node tests/mpress.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async t=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2027-01-08T07:00:00');
const pl=await p.evaluate(()=>PLAN0.map(w=>[w.week,(w.fri.match(/DB shoulder press machine ([\dx -]+\d)/)||[])[1]]));
ok(pl.filter(x=>x[0]>=15&&x[0]<=23).every(x=>x[1]===([16,20].includes(x[0])?'2 x 10':'3 x 8-12')),'Fridays weeks 15 to 23, 2 x 10 in deloads');
ok(pl.filter(x=>x[0]<15||x[0]>23).every(x=>!x[1]),'no machine press before week 15 or after week 23');
ok(await p.evaluate(()=>guideKeys('DB shoulder press machine 3 x 8-12')[0]==='mpress'&&!!GUIDES.mpress&&LOADABLE.mpress===5&&REST_BY_KEY.mpress===90),'guide key, load step, rest');
ok(await p.evaluate(()=>{const it=sessionItems('Fri',PLAN[14].fri,PLAN[14]);const i=it.findIndex(x=>x.keys[0]==='mpress');return i===2&&it[1].keys[0]==='bench'}),'sits right after bench');
ok(/DB shoulder press machine/.test(await p.locator('#today').innerText()),'Today week 15 Friday row');
await p.evaluate(()=>startWorkout(15,4,null));await p.clock.runFor(600);
ok(await p.evaluate(()=>{const it=[...document.querySelectorAll('#workout .wo-item.sets')].find(e=>/shoulder press machine/i.test(e.innerText));return it&&it.querySelectorAll('.st-r[data-row]').length})===3,'workout 3 set rows');await p.close();
ok(!errs.length,'no page errors '+errs.join(' | '));
ok(/DB shoulder press machine/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt mentions it');
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
