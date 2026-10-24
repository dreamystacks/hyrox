// v118: sim report after every sim (vs the last comparable sim), as a 1080x1920 story image with Share.
// Finish sheet save opens it, Today done card and the Plan day sheet reopen it. node tests/simcmp.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const S=(id,date,week,tot,runs,st,rpe)=>({id,athlete:'fred',date,week,session:'Sat: HYROX sim',duration:40,distance:4,rpe,knee:0,stations:st,notes:`Workout 40:00 · 4/4 exercises done\nSim week ${week} · total ${tot}\nRuns: ${runs}\nLoads (lb): Sled push 250 (1/1) · Sled pull 170 (1/1)`,updatedAt:date+'T19:00:00Z',savedAt:date+'T19:00:00Z'});
const W3=S('a','2026-10-17',3,'33:52','6:13 / 6:31 / 6:36 / 6:48','SkiErg 2:15 · Sled push 1:10 · Sled pull 1:47 · Burpee broad jumps 2:29',8);
const W4=S('b','2026-10-24',4,'32:25','5:22 / 5:58 / 6:20 / 6:29','SkiErg 2:12 · Sled push 1:20 · Sled pull 2:22 · Burpee broad jumps 2:19',9);
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},[logs]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-10-24T14:30:00',[W3,W4]);
const m=await p.evaluate(()=>{const L=getLogs('fred'),a=simParse(L.find(x=>x.id==='b')),pr=simPrev(L.find(x=>x.id==='b'),'fred'),bb=simParse(pr),ins=simInsights(a,bb);return{prev:pr.id,tot:a.tot,km:a.km,ins}});
ok(m.prev==='a'&&m.tot===1945,'compares Oct 24 with Oct 17 '+JSON.stringify([m.prev,m.tot,m.km]));
ok(m.ins.out.some(s=>/faded 1:22/.test(s))&&m.ins.out.some(s=>/Run 1 at 5:22\/km/.test(s))&&m.ins.out.some(s=>/Sled pull lost 20 s at the same weight/.test(s)),'insights: fade, fast run 1, sled pull at same weight '+JSON.stringify(m.ins.out));
ok(m.ins.out.some(s=>/plan said 75% and you went at RPE 9/.test(s))&&/Next: start run 1 at 5:5\d\/km/.test(m.ins.tip),'RPE vs plan and the pacing tip '+m.ins.tip);
// Today done card button opens the report
ok(await p.locator('#today [data-simcmp]').count()===1,'Today done card has the Sim report button');
await p.click('#today [data-simcmp]');await p.clock.runFor(800);
ok(await p.locator('#simCmpModal').evaluate(e=>e.classList.contains('show')),'report sheet opens');
const img=await p.evaluate(()=>{const i=document.querySelector('#simCmpModal .sc-img');return i?{w:i.naturalWidth,h:i.naturalHeight,src:i.src.slice(0,30)}:null});
ok(img&&img.w===1080&&img.h===1920,'story image 1080x1920 '+JSON.stringify(img));
const data=await p.evaluate(()=>document.querySelector('#simCmpModal .sc-img').src);fs.writeFileSync((process.env.SHOTS||'/tmp')+'/simstory.png',Buffer.from(data.split(',')[1],'base64'));
ok(await p.locator('#simShare').isVisible(),'Share button');
const full=await p.evaluate(()=>{const mk=(id,d,w)=>({id,athlete:'fred',date:d,session:'Sat: HYROX sim',rpe:8,stations:'SkiErg 4:40 · Sled push 3:00 · Sled pull 4:10 · Burpee broad jumps 5:00 · RowErg 4:30 · Farmers carry 1:40 · Sandbag lunges 4:30 · Wall balls 6:00',notes:`Sim week ${w} · total 1:36:00\nRuns: 6:10 / 6:20 / 6:30 / 6:35 / 6:40 / 6:45 / 6:50 / 6:55`});const a=simParse(mk('f2','2026-11-28',9)),cv=simStory(a,null,'fred');return cv.toDataURL('image/png')});fs.writeFileSync((process.env.SHOTS||'/tmp')+'/simstory_full.png',Buffer.from(full.split(',')[1],'base64'));ok(full.length>1000,'a full sim with 8 runs and 8 stations also renders');
ok(/faded/.test(await p.locator('#simCmpBody').innerText()),'insights listed under the image');
await p.evaluate(()=>{window.__sh=null;navigator.canShare=()=>true;navigator.share=o=>{window.__sh=o.files[0].name;return Promise.resolve()}});await p.click('#simShare');await p.clock.runFor(500);
ok(await p.evaluate(()=>window.__sh)==='hyrox-sim-week4.png','Share passes the png file to the share sheet');
await p.click('#closeSimCmp');ok(!(await p.locator('#simCmpModal').evaluate(e=>e.classList.contains('show'))),'X closes it');
// Plan day sheet
await p.evaluate(()=>{currentWeek=4;showView('plan')});await p.clock.runFor(400);await p.locator('.day-card[data-day=Sat] .day-head').click();await p.clock.runFor(400);
ok(await p.locator('.day-card[data-day=Sat] [data-simcmp]').isVisible(),'Plan Saturday sheet has the Sim report button');
await p.locator('.day-card[data-day=Sat] [data-simcmp]').click();await p.clock.runFor(800);ok(await p.locator('#simCmpModal').evaluate(e=>e.classList.contains('show')),'opens from Plan too');
await p.close();
// saving a sim from the finish sheet opens it automatically; first sim ever says so
p=await open('2026-10-24T14:30:00',[]);
await p.evaluate(()=>openFinish({date:'2026-10-24',session:'Sat: HYROX sim',duration:40,distance:4,stations:'SkiErg 2:12 · Sled push 1:20',notes:'Sim week 4 · total 32:25\nRuns: 5:22 / 5:58 / 6:20 / 6:29'}));await p.click('#finish [data-fr="9"]');await p.click('#finSave');await p.clock.runFor(1500);
ok(await p.locator('#simCmpModal').evaluate(e=>e.classList.contains('show')),'saving a sim opens the report');
ok(/First sim to compare with/.test(await p.locator('#simCmpBody').innerText()),'no earlier sim: says it is the first');
await p.close();
// no button on non sim days
p=await open('2026-10-24T14:30:00',[{id:'h',athlete:'fred',date:'2026-10-24',week:4,session:'Thu: Hockey',duration:60,rpe:7,notes:'',updatedAt:'2026-10-24T19:00:00Z'}]);ok(await p.locator('[data-simcmp]').count()===0,'no report button on other sessions');await p.close();
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
