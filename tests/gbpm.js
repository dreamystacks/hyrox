// v174 Garmin import never makes a second log for a logged session, is idempotent, and raw Garmin lines never show; run chips carry bpm only when matched without guessing. node tests/gbpm.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
const LAPS='Laps: 0:53 (107) / 5:26 (156) / 1:18 (166) / 5:48 (169) / 1:36 (161) / 1:30 (157) / 4:04 (170) / 0:06 (172) / 1:23 (160) / 5:40 (167) / 0:45 (172)';
const APP={id:'1795053352438',date:'2026-11-18',session:'Tue: Run + arms A',duration:60,distance:4,pace:'5:40',rpe:8,notes:'Workout 58:13 · 5/5 exercises done\nRuns: 5:31 / 5:39 / 5:44 / 5:35\nLoads (lb): Dumbbell lateral raise 20 (4/4)\nOverhead triceps extension: Keep same weight next time\n'+LAPS+'\nGarmin: 25126382230 · Indoor Running · avg HR 163 · max HR 176\nRep HR: 156 / 169 / 167\nWatch reps: 5:26 / 5:48 / 5:40 · 3 km · 5:39/km\nGarmin added after the workout (app times kept)',savedAt:'2026-11-19T01:55:52Z',updatedAt:'2026-11-19T02:00:48Z'};
const DUP={id:'1795053656886',date:'2026-11-18',session:'Tue: Run + arms A',duration:29,distance:3,pace:'5:39',rpe:8,notes:'Workout 28:58 · imported from Garmin\nRuns: 5:26 / 5:48 / 5:40\n'+LAPS+'\nGarmin: 25126382230 · Indoor Running · avg HR 163 · max HR 176\nRep HR: 156 / 169 / 167',savedAt:'2026-11-19T02:00:56Z',updatedAt:'2026-11-19T02:00:56Z'};
const open=async(logs,acts)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.addInitScript(([logs,acts])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'https://example.test/exec',key:'k'}));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(logs));
  window._posts=[];window.fetch=async(u,o)=>{const body=o&&o.body?JSON.parse(o.body):{};window._posts.push(o&&o.body||'');if(body.action==='garmin')return new Response(JSON.stringify({ok:true,activities:acts,daily:[]}));return new Response(JSON.stringify({ok:true,logs:[],bench:[],state:[]}))}},[logs,acts]);
 await p.clock.install({time:new Date('2026-11-18T21:30:00')});await p.goto('file://'+__dirname+'/../index.html');await p.clock.runFor(5000);return p};
const RAW=/Laps:|Rep HR:|Watch reps:|App reps:|Garmin added|Garmin: \d/;
// 1. Fred's real Nov 18 data: the duplicate is removed once, and nothing raw shows anywhere
let p=await open([APP,DUP],[]);
let r=await p.evaluate(()=>({n:getLogs().filter(x=>x.date==='2026-11-18').length,dup:allLogs('fred').find(x=>x.id==='1795053656886').deleted,dirty:JSON.stringify(load('hrx_dirty_v1',{})).includes('1795053656886')||window._posts.some(b=>b.includes('1795053656886')&&b.includes('"deleted":true'))}));
ok(r.n===1&&r.dup===true&&r.dirty,'the duplicate Nov 18 Garmin log is tombstoned and queued for sync '+JSON.stringify(r));
r=await p.evaluate(()=>{const c=document.querySelector('#today .td-done');return{t:c.textContent,chips:[...c.querySelectorAll('.rc-run')].map(e=>e.querySelector('.rc-tm').textContent+(e.querySelector('.rc-bpm').textContent?' '+e.querySelector('.rc-bpm').textContent.replace('♥','').trim():'')),notes:[...c.querySelectorAll('.td-dnotes p')].map(e=>e.textContent)}});
ok(!/Laps:|Rep HR:|Watch reps:|Garmin added/.test(r.t),'Today done card hides Laps, Rep HR, Watch reps and the Garmin added line');
ok(JSON.stringify(r.chips)==='["5:31 156","5:39 169","5:44 167","5:35 167"]','v175: app reps put on the watch timeline (rep 1 anchored on the 5:26 lap, 90 s rest): one bpm per rep '+JSON.stringify(r.chips));
ok(r.notes.some(t=>/Keep same weight/.test(t)),'the athlete note still shows');
ok(await p.evaluate(()=>/Laps:|Rep HR:|Watch reps:/.test(allLogs('fred').find(x=>x.id==='1795053352438').notes)),'the raw lines stay in the stored notes for the coach');
await p.click('.bottombar [data-view=plan]');await p.clock.runFor(500);
r=await p.evaluate(()=>{const row=document.querySelector('#days .day-card[data-date="2026-11-18"]');return{row:row.querySelector('.day-head').textContent}});
ok(!RAW.test(r.row),'Plan day row shows no raw Garmin line');
await p.click('#days .day-card[data-date="2026-11-18"] .day-head');await p.clock.runFor(400);
r=await p.evaluate(()=>{const s=document.querySelector('#days .day-card.open .day-body');s.querySelectorAll('details').forEach(d=>d.open=true);return{t:s.textContent,n:s.querySelectorAll('.did').length}});
ok(!RAW.test(r.t)&&r.n===1,'Plan sheet: one result, notes open, no raw Garmin line '+r.n);
ok(p.errs.length===0,'no page errors '+p.errs.join(' | '));await p.close();
// 2. runBpm rules
p=await open([],[]);
r=await p.evaluate(()=>{const N=t=>({notes:t});return{
 same:runBpm(N('Runs: 5:31 / 5:39 / 5:44 / 5:35\nRep HR: 150 / 155 / 160 / 158\nWatch reps: 5:30 / 5:40 / 5:45 / 6:50 · 4 km')),
 uniq:runBpm(N('Runs: 5:00 / 7:30\nRep HR: 150\nWatch reps: 5:02 · 1 km')),
 amb:runBpm(N('Runs: 5:00 / 5:05\nRep HR: 150\nWatch reps: 5:02 · 1 km')),
 watch:runBpm(N('Runs: 5:26 / 5:48 / 5:40\nRep HR: 156 / 169 / 167')),
 off:runBpm(N('Runs: 5:26 / 5:48\nRep HR: 156 / 169 / 167')),
 none:runBpm(N('Runs: 5:26 / 5:48'))}});
ok(JSON.stringify(r.same)==='[150,155,160,null]','same count: paired by order, the 4th (6:50 vs 5:35, over 10%) gets none '+JSON.stringify(r.same));
ok(JSON.stringify(r.uniq)==='[150,null]','different counts: a single clear match gets its bpm '+JSON.stringify(r.uniq));
ok(JSON.stringify(r.amb)==='[null,null]','different counts and two candidates: none');
ok(JSON.stringify(r.watch)==='[156,169,167]','watch times kept: one bpm per rep');
ok(JSON.stringify(r.off)==='[null,null]'&&JSON.stringify(r.none)==='[null,null]','counts that disagree or no Rep HR: none');
r=await p.evaluate(()=>{const L='Laps: 1:00 (110) / 5:00 (150) / 1:30 (140) / 5:10 (160) / 2:00 (130)';return{rest:runBpm({date:'2026-11-18',session:'Tue: Run + arms A',notes:'Runs: 5:00 / 5:10\n'+L}),starts:runBpm({date:'2026-11-18',session:'Tue: Run + arms A',notes:'Runs: 5:00 / 5:10\nRep starts: 0:00 / 6:30\n'+L}),gap:runBpm({date:'2026-11-18',session:'Tue: Run + arms A',notes:'Runs: 5:00 / 5:10\nRep starts: 0:00 / 12:00\n'+L}),noanchor:runBpm({date:'2026-11-18',session:'Tue: Run + arms A',notes:'Runs: 3:00 / 3:10\n'+L})}});
ok(JSON.stringify(r.rest)==='[150,160]','time alignment with the planned 90 s rest '+JSON.stringify(r.rest));
ok(JSON.stringify(r.starts)==='[150,160]','time alignment with the logged Rep starts line');
ok(JSON.stringify(r.gap)==='[150,null]','a rep outside the watch recording gets none '+JSON.stringify(r.gap));
ok(JSON.stringify(r.noanchor)==='[null,null]','no watch lap within 10% of rep 1: none');
await p.evaluate(()=>startWorkout(8,1,'2026-11-18'));await p.clock.runFor(600);
await p.click('.dk-b');await p.clock.runFor(331000);await p.click('.dk-b');await p.clock.runFor(1000);
r=await p.evaluate(()=>{const y=woState();return{rst:JSON.stringify(y.rst||{}),times:JSON.stringify(y.times||{})}});
await p.evaluate(()=>{const y=woState(),k=Object.keys(y.times)[0];y.times[k]=[331000,339000];y.rst[k]=[y.rst[k][0],y.rst[k][0]+421000];y.rep=null;woSave(y)});
await p.evaluate(()=>finishWorkout());await p.clock.runFor(300);r=await p.evaluate(()=>finPayload.notes);
ok(/Rep starts: 0:00 \/ 7:01/.test(r)&&/Runs: 5:31 \/ 5:39/.test(r),'finishing an interval workout writes the Rep starts line '+(r.match(/Rep starts: [^\n]*/)||[''])[0]);
await p.evaluate(()=>closeFinish());
// 3. finish sheet chips
await p.evaluate(()=>openFinish({date:'2026-11-18',session:'Tue: Run + arms A',duration:29,notes:'Workout 28:58 · imported from Garmin\nRuns: 5:26 / 5:48 / 5:40\nRep HR: 156 / 169 / 167'}));
r=await p.evaluate(()=>[...document.querySelectorAll('#finRuns .rc')].map(e=>e.textContent));
ok(JSON.stringify(r)==='["5:26 · 156 bpm","5:48 · 169 bpm","5:40 · 167 bpm"]','finish sheet shows one bpm per rep '+JSON.stringify(r));
await p.evaluate(()=>closeFinish());await p.close();
// 4. import: attach to the app log, then a stale second pick or a second tap adds nothing
const laps=[{s:53,km:.1,hr:107},{s:326,km:1,hr:156},{s:78,km:.15,hr:166},{s:348,km:1,hr:169},{s:96,km:.2,hr:161},{s:340,km:1,hr:167},{s:45,km:.1,hr:172}];
const ACT={id:'25126382230',date:'2026-11-18',start:'2026-11-18 20:27:35',type:'indoor_running',name:'Indoor Running',min:28.8,km:3.38,hr:163,max:176,laps};
const APP0=Object.assign({},APP,{notes:'Workout 58:13 · 5/5 exercises done\nRuns: 5:31 / 5:39 / 5:44 / 5:35\nLoads (lb): Dumbbell lateral raise 20 (4/4)'});
p=await open([APP0],[ACT]);
await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);
await p.evaluate(()=>{window._stale=gimpCtx.list[0]});
await p.locator('#gimpModal .gi-row').first().click();await p.clock.runFor(400);
ok(await p.evaluate(()=>$('pickModal').classList.contains('show')),'logged reps on both sides: asks which run data to keep');
await p.click('#pickList [data-pk="0"]');await p.clock.runFor(400);
r=await p.evaluate(()=>{const L=getLogs().filter(x=>x.date==='2026-11-18');return{n:L.length,g:/Garmin: 25126382230/.test(L[0].notes)}});
ok(r.n===1&&r.g,'Keep the app: Garmin added to the same log, still one log');
await p.evaluate(()=>gimpUse(window._stale));await p.clock.runFor(400);
r=await p.evaluate(()=>({n:getLogs().filter(x=>x.date==='2026-11-18').length,fin:!$('finish').hidden,pick:$('pickModal').classList.contains('show')}));
ok(r.n===1&&!r.fin&&!r.pick,'a stale pick of the same activity does nothing (idempotent) '+JSON.stringify(r));
await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);
ok(await p.evaluate(()=>!$('gimpModal').classList.contains('show')&&getLogs().filter(x=>x.date==='2026-11-18').length===1),'a second Import lists nothing new');
r=await p.evaluate(()=>[...document.querySelectorAll('#today .td-done .rc-run')].map(e=>e.querySelector('.rc-tm').textContent+(e.querySelector('.rc-bpm').textContent?' '+e.querySelector('.rc-bpm').textContent.replace('♥','').trim():'')).join('|'));
ok(r==='5:31 156|5:39 169|5:44 167|5:35','done card after the merge: bpm by time, none for rep 4, which the watch did not cover '+r);
await p.close();
// 5. a different activity on a day whose session is already logged with another Garmin activity still attaches, never a new log
const APP2=Object.assign({},APP0,{notes:APP0.notes+'\nGarmin: 111 · Strength'});
p=await open([APP2],[Object.assign({},ACT,{id:'222'})]);
await p.locator('#today [data-gimp]').first().click();await p.clock.runFor(800);await p.locator('#gimpModal .gi-row').first().click();await p.clock.runFor(400);
if(await p.evaluate(()=>$('pickModal').classList.contains('show'))){await p.click('#pickList [data-pk="1"]');await p.clock.runFor(400)}
r=await p.evaluate(()=>{const L=getLogs().filter(x=>x.date==='2026-11-18');return{n:L.length,both:/^Garmin: (111\+222|222\+111) · /m.test(L[0].notes)&&(L[0].notes.match(/^Garmin: /mg)||[]).length===1,runs:(L[0].notes.match(/^Runs: (.*)$/m)||[])[1],fin:!$('finish').hidden}});
ok(r.n===1&&r.both&&!r.fin,'session already carries another Garmin activity: the new one merges into the same Garmin line (v187), no second log '+JSON.stringify(r));
r=await p.evaluate(()=>[...document.querySelectorAll('#today .td-done .rc-run')].map(e=>e.querySelector('.rc-tm').textContent+' '+e.querySelector('.rc-bpm').textContent.replace('♥','').trim()).join('|'));
ok(r==='5:26 156|5:48 169|5:40 167','Use Garmin: watch reps with one bpm each '+r);
// 6. finish sheet race: if the session got logged while the sheet was open, Save adds nothing
await p.evaluate(()=>openFinish({gid:'333',date:'2026-11-18',session:'Tue: Run + arms A',duration:29,rpe:8,notes:'Runs: 5:26'}));await p.click('#finSave');await p.clock.runFor(300);
ok(await p.evaluate(()=>getLogs().filter(x=>x.date==='2026-11-18').length===1),'finish sheet from an import never saves a second log for a logged session');
ok(p.errs.length===0,'no page errors '+p.errs.join(' | '));
await b.close();console.log(fail?fail+' failed':'all ok');process.exit(fail?1:0)})();
