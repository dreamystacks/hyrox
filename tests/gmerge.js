// v168 Import from Garmin after logging the session in the app: the rep laps become the Runs line and the Garmin data is added to the existing log, no second log. node tests/gmerge.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://example.test/exec',key:'k'}));
 localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([{id:'m',date:'2026-11-16',session:'Mon: Lower + sled',duration:70,rpe:9,updatedAt:'x'},{id:'t1',date:'2026-11-18',session:'Tue: Run + arms A',duration:55,rpe:8,distance:0,notes:'Workout 52:00 · 5/5 exercises done\nLoads (lb): Lateral raises 20 (4/4)',savedAt:'2026-11-18T20:00:00Z',updatedAt:'x'}]));
 const laps=[{s:600,km:1.6,hr:120},{s:330,km:1,hr:160},{s:90,km:0.1,hr:130},{s:335,km:1,hr:166},{s:95,km:0.1,hr:135},{s:340,km:1,hr:168},{s:90,km:0.1,hr:138},{s:338,km:1,hr:171},{s:400,km:0.6,hr:120}];
 window.fetch=async(u,o)=>{const body=o&&o.body?JSON.parse(o.body):{};if(body.action==='garmin')return new Response(JSON.stringify({ok:true,activities:[{id:'777',date:'2026-11-18',start:'2026-11-18 19:30:00',type:'running',name:'Intervals',min:45,km:6.6,hr:150,max:180,cal:500,laps}],daily:[]}));return new Response(JSON.stringify({ok:true,logs:[],bench:[],state:[]}))}});
await p.clock.install({time:new Date('2026-11-18T21:00:00')});await p.goto('file://'+__dirname+'/../index.html');await p.clock.runFor(5000);
const btn=p.locator('#today [data-gimp]').first();ok(await btn.count()===1,'the done card offers Import from Garmin');
await btn.click();await p.clock.runFor(800);await p.locator('#gimpModal .gi-row').first().click();await p.clock.runFor(600);
const r=await p.evaluate(()=>{const L=getLogs().filter(x=>x.date==='2026-11-18'&&x.session==='Tue: Run + arms A');return{n:L.length,notes:L[0].notes,dist:L[0].distance,pace:L[0].pace,fin:!$('finish').hidden}});
ok(r.n===1&&!r.fin,'no second log and no finish sheet');
ok(/Runs: 5:30 \/ 5:35 \/ 5:40 \/ 5:38/.test(r.notes)&&/Garmin: 777/.test(r.notes)&&/Rep HR: 160 \/ 166 \/ 168 \/ 171/.test(r.notes)&&/Loads \(lb\)/.test(r.notes),'the rep laps become the Runs line, Garmin and Rep HR lines are added, loads kept');
ok(r.dist===4&&r.pace==='5:36','distance 4 km and pace 5:36 '+r.dist+' '+r.pace);
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(fail?fail+' FAILED':'ALL OK');process.exit(fail?1:0)})();
