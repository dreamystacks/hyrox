// v149 Ask the coach: Progress tile, sheet with input, question saved as bench ask_q<stamp> and queued for sync (Benchmarks row test=ask), waiting line, coach.json answers shown, New answer state cleared on open, viewing another athlete read only, not counted as a fresh test, 390 and 360. node tests/ask.js
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
for(const W of [390,360]){const p=await b.newPage({viewport:{width:W,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','will');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-11-16T19:00:00')});await p.goto('file://'+__dirname+'/../index.html');await p.clock.runFor(5000);
await p.click('[data-view=bench]');await p.clock.runFor(800);
ok(/Ask anything about your training/.test(await p.locator('.dt-ask').innerText()),W+' tile idle text');
await p.click('.dt-ask');await p.clock.runFor(600);
ok(await p.locator('#dashModal #askIn').isVisible(),W+' sheet has the input');
await p.fill('#askIn','Should I go lighter on Monday after being sick?');await p.click('#askSend');await p.clock.runFor(300);
const st=await p.evaluate(()=>{const b=JSON.parse(localStorage.getItem('hrx_will_bench_v2')||'{}'),ks=Object.keys(b).filter(x=>/^ask_q\d{14}$/.test(x)),d=JSON.parse(localStorage.getItem('hrx_dirty_v1')||'{}');return{ks,v:ks[0]&&b[ks[0]].v,dirty:Object.keys(d).some(x=>x.startsWith('bench|will|ask_q')),list:document.querySelector('#askWrap').innerText,ow:document.documentElement.scrollWidth>innerWidth}});
ok(st.ks.length===1&&st.v==='Should I go lighter on Monday after being sick?',W+' saved as '+st.ks[0]);ok(st.dirty,W+' queued for sync');
ok(/Waiting · the coach answers tonight/.test(st.list),W+' waiting line');ok(!st.ow,W+' no overflow');
await p.click('#dashModal [data-dclose], #dashClose').catch(()=>p.evaluate(()=>closeDash()));await p.clock.runFor(400);
ok(/Waiting · answer tonight/.test(await p.locator('.dt-ask').innerText()),W+' tile shows waiting');
const id=st.ks[0].slice(4);
await p.evaluate(id=>{window.COACH={week:7,athletes:{will:{headline:'x',answers:{[id]:{a:'Yes: hold last week loads Monday, then build.',at:'2026-11-16T21:45:00'}}}}};renderBench()},id);await p.clock.runFor(300);
ok(/New answer from the coach/.test(await p.locator('.dt-ask').innerText()),W+' tile shows new answer');
await p.click('.dt-ask');await p.clock.runFor(500);ok(/Coach\s*Yes: hold last week loads/.test(await p.locator('#dashModal').innerText()),W+' answer shown');
await p.evaluate(()=>closeDash());await p.clock.runFor(300);await p.evaluate(()=>renderBench());
ok(!/New answer/.test(await p.locator('.dt-ask').innerText()),W+' new state cleared after reading');
ok(/0\s*logged|Fresh tests/.test(await p.locator('#dash').innerText())&&!/1\s*logged/.test(await p.locator('#dash').innerText()),W+' question not counted as a fresh test');
await p.evaluate(()=>{localStorage.setItem('hrx_sync_v1',JSON.stringify({url:'http://127.0.0.1:9/x',key:'k'}));athlete='fred';viewAthlete='will';renderBench()});await p.clock.runFor(300);await p.click('.dt-ask');await p.clock.runFor(500);
const ro=await p.evaluate(()=>({n:document.querySelectorAll('#dashModal #askIn').length,t:document.querySelector('#dashModal').innerText.slice(0,200),v:viewing(),a:athlete}));ok(ro.n===0&&/Read only/.test(ro.t),W+' viewing Will from Fred: read only '+JSON.stringify(ro));
ok(errs.length===0,W+' no errors '+errs.join(';'));await p.close()}
await b.close();console.log(fail?'FAILED '+fail:'ALL PASS');process.exit(fail?1:0)})();
