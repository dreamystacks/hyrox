// v152 Import from Garmin: Today button (sync set up, own view, no running workout), fetch with action garmin, picker sheet, sim laps matched to runs and stations (double press merged, extra lap dropped), finish sheet prefilled, saved log carries Garmin: <id> and Lap HR, sim report opens, same activity not offered again, no key message, 390 and 360. node tests/gimp.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
for(const W of [390,360]){const p=await b.newPage({viewport:{width:W,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://example.test/exec',key:'k'}));
 window.__gmode='ok';window.__posts=[];const of=window.fetch;window.fetch=async(u,o)=>{const body=o&&o.body?JSON.parse(o.body):{};window.__posts.push(body);
  if(body.action==='garmin'){if(window.__gmode==='nokey')return new Response(JSON.stringify({ok:false,error:'no_garmin_key'}));
   const laps=[{s:300,hr:150},{s:2,hr:150},{s:150,hr:165},{s:310,hr:158},{s:75,hr:170},{s:320,hr:160},{s:140,hr:172},{s:330,hr:161},{s:160,hr:175},{s:1.5,hr:120}];
   return new Response(JSON.stringify({ok:true,activities:[{id:'999',date:'2026-11-21',start:'2026-11-21 10:00:00',type:'indoor_running',name:'HYROX',min:30,km:0,hr:158,max:182,cal:500,laps}],daily:[]}))}
  return new Response(JSON.stringify({ok:true,logs:[],bench:[],state:[]}))}});
await p.clock.install({time:new Date('2026-11-21T12:00:00')});await p.goto('file://'+__dirname+'/../index.html');await p.clock.runFor(5000);
const btn=p.locator('#today [data-gimp]');ok(await btn.count()===1&&/Import from Garmin/.test(await btn.innerText()),W+' Today has the Import from Garmin button');
await btn.click();await p.clock.runFor(800);
const post=await p.evaluate(()=>window.__posts.find(x=>x.action==='garmin'));ok(post&&post.athlete==='fred'&&post.key==='k',W+' posts action garmin with key and athlete');
ok(await p.locator('#gimpModal.show .gi-row').count()===1&&/HYROX/.test(await p.locator('#gimpModal').innerText()),W+' picker lists the watch workout');
await p.locator('#gimpModal .gi-row').click();await p.clock.runFor(400);
const f=await p.evaluate(()=>({h:$('finish').hidden,p:finPayload}));
ok(!f.h&&f.p.session==='Sat: HYROX sim',W+' finish sheet opens as the sim');
ok(/Sim week 8 · total 29:48/.test(f.p.notes),W+' sim total from matched laps: '+(f.p.notes.match(/Sim week[^\n]*/)||[''])[0]);
ok(/Runs: 5:00 \/ 5:10 \/ 5:20 \/ 5:30/.test(f.p.notes),W+' runs from laps (double press merged into the next lap)');
ok(/SkiErg 2:32/.test(f.p.stations)&&f.p.stations.split(' · ').length===4,W+' 4 stations: '+f.p.stations);
ok(/Garmin: 999/.test(f.p.notes)&&/Lap HR: /.test(f.p.notes)&&f.p.hr===158,W+' Garmin id, lap HR, avg HR');
await p.locator('#finRpe [data-fr="8"]').click();await p.locator('#finSave').click();await p.clock.runFor(800);
const lg=await p.evaluate(()=>getLogs('fred').find(x=>/Garmin: 999/.test(x.notes)));ok(lg&&lg.rpe===8&&lg.date==='2026-11-21',W+' log saved');
ok(await p.locator('#simCmpModal.show').count()===1,W+' sim report opens');
await p.evaluate(()=>{$('simCmpModal').classList.remove('show');showView('plan');showView('today')});await p.clock.runFor(400);
// done card replaces the session card; open the Plan Sunday? instead call import directly to check dedupe
await p.evaluate(()=>{const b=document.createElement('button');b.dataset.gimp='8|5|2026-11-21';b.id='tb';document.body.appendChild(b)});await p.click('#tb');await p.clock.runFor(800);
ok(await p.locator('#gimpModal.show').count()===0&&/No new Garmin workout/.test(await p.locator('#toast').innerText()),W+' imported activity not offered again');
await p.evaluate(()=>window.__gmode='nokey');await p.click('#tb');await p.clock.runFor(800);ok(/No Garmin key for Fred/.test(await p.locator('#toast').innerText()),W+' no key message');
// v153: after a log today the done card still offers the import, and so does the Plan day sheet
ok(await p.locator('#today .td-done [data-gimp]').count()>=1,W+' done card keeps the Import from Garmin button');
await p.evaluate(()=>showView('plan'));await p.clock.runFor(500);await p.locator('.day-card.dr[data-day=Fri]').first().click();await p.clock.runFor(500);
ok(await p.locator('.day-card.open [data-gimp]').count()===1,W+' Plan day sheet has Import from Garmin');
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);ok(!ov,W+' no overflow');
ok(errs.length===0,W+' no errors '+errs.join(';'));await p.close()}
await b.close();console.log(fail?'FAILED '+fail:'ALL PASS');process.exit(fail?1:0)})();
