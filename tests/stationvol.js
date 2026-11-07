// v131: station volume Fridays (weeks 7, 10, 14, 17, 22) replace the EMOM with one station at 2 to 4 times race volume.
// Plan text, Today rows, structure line, Plan row, workout timed item, stations logged, Fred keeps technique (not week 7). node tests/stationvol.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,who)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([w])=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1');localStorage.setItem(`hrx_${w}_unit_v2`,JSON.stringify('lb'))},[who]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-11-13T07:00:00','will');
const d=await p.evaluate(()=>PLAN.map(w=>({n:w.week,v:/\nStation volume: /.test(w.fri),em:/EMOM/.test(w.fri)})));
ok(d.filter(x=>x.v).map(x=>x.n).join()==='7,10,14,17,22'&&d.filter(x=>x.v).every(x=>!x.em),'station volume replaces the EMOM in weeks 7, 10, 14, 17, 22');
const it=await p.evaluate(()=>sessionItems('Fri',PLAN[6].fri,PLAN[6]).map(i=>[i.title,i.keys[0],timedKind(i,'Fri',PLAN[6]),!!i.vol]));
ok(JSON.stringify(it[it.length-2])==='["150 wall balls for time in sets of 25","wallball","st",true]'&&JSON.stringify(it[it.length-1])==='["Sandbag lunges 100 m with 20 kg in 4 pieces","lunge","st",true]','week 7 ends with the timed wall ball block, then the v139 lunge block '+JSON.stringify(it.slice(-2)));
ok(await p.evaluate(()=>dayWhat('Fri',PLAN[6]).what)==='5 lifts + station volume','structure line: 5 lifts + station volume');
const td=await p.locator('#today .td-session').innerText();ok(/Upper \+ station volume/.test(td)&&/150 wall balls/i.test(td)&&!/EMOM/.test(td.replace(/Mon: Legs lift \+ EMOM/,'')),'Today Friday week 7: title Upper + station volume, the block, no EMOM');
await p.evaluate(()=>{currentWeek=7;showView('plan')});await p.clock.runFor(400);
ok(/Station volume/.test(await p.locator('.day-card[data-day=Fri] .day-head').innerText()),'Plan Friday row subtitle mentions station volume');
await p.evaluate(()=>{showView('today');startWorkout(7,4,'2026-11-13')});await p.clock.runFor(600);
const blk=p.locator('#workout .wo-item',{hasText:'150 wall balls'});ok(await blk.count()===1,'workout has the block');
await blk.locator('[data-tstart],button',{hasText:/Start/}).first().evaluate(b=>b.click());await p.clock.runFor(5*60000+12000);
await p.locator('#workout .wo-item',{hasText:'150 wall balls'}).locator('button',{hasText:/Stop/}).first().evaluate(b=>b.click());await p.clock.runFor(500);
const pl=await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return window.__p});
ok(/Wall balls 5:1\d/.test(pl.stations||''),'stations field logs the block time: '+pl.stations);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');await p.close();
p=await open('2026-11-13T07:00:00','fred');
ok(await p.evaluate(()=>!/technique/.test(PLAN[6].fri)&&/Wall ball technique 2 x 10\.\nStation volume: RowErg/.test(PLAN[9].fri)),'Fred: no technique on week 7 (150 wall balls), technique before the week 10 row block');await p.close();
ok(/Station volume Fridays \(v131/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains it');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
