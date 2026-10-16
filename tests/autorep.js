// v82: interval reps start by themselves after the rest. node tests/autorep.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-13T17:00:00')});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
await p.evaluate(()=>startWorkout(3,1,'2026-10-13'));await p.clock.runFor(600);
const dock=()=>p.locator('.wo-dock').innerText();
ok(/Start rep 1 of 5/.test(await dock()),'first rep is still a manual start');
await p.click('.dk-b');await p.clock.runFor(150000);
await p.click('.dk-b');await p.clock.runFor(500);
const rc=await p.locator('#woRest').innerText();ok(/Rep 2 of 5 starts by itself/.test(rc),'after stopping rep 1 the top rest card says rep 2 starts by itself: '+rc.replace(/\n/g,' | '));
await p.clock.runFor(95000);
const st=await p.evaluate(()=>woState());ok(st.rep&&st.rep.n===2,'rep 2 started when the rest ended');
ok(/Stop|rep 2/i.test(await dock()),'dock now stops rep 2: '+(await dock()).replace(/\n/g,' | '));
await p.clock.runFor(150000);await p.click('.dk-b');await p.clock.runFor(1500);
ok(await p.evaluate(()=>woState().autoNext&&woState().autoNext.n===3),'rep 3 queued');
await p.click('#woRestSkip');await p.clock.runFor(500);
ok(await p.evaluate(()=>woState().rep&&woState().rep.n===3),'Skip rest starts rep 3 right away');
const t=await p.evaluate(()=>woState().times);const a=Object.values(t)[0];ok(a[0]>=149000&&a[1]>=149000,'rep times logged: '+a.map(v=>Math.round(v/1000)).join(','));
// close app mid rest, reopen after rest end
await p.clock.runFor(150000);await p.click('.dk-b');await p.clock.runFor(500);
await p.evaluate(()=>closeWorkout());await p.clock.runFor(120000);await p.evaluate(()=>{woRestore();openWorkout()});await p.clock.runFor(500);
const s4=await p.evaluate(()=>{const y=woState();return y.rep&&{n:y.rep.n,run:woElapsed(y)-y.rep.t0}});
ok(s4&&s4.n===4&&s4.run>=25000&&s4.run<=35000,'reopened after the rest: rep 4 runs since the rest end ('+JSON.stringify(s4)+')');
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
