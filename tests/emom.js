// EMOM focus mode: node tests/emom.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Monday week 3 (EMOM 16 min, 4 moves). Checks the full screen view, no scrolling at 390x844 and with a keyboard sized viewport,
// minute advance, notes per exercise, nothing else on screen, Stop, auto end with the time in the log.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w,h)=>{const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_sledcfg_v2',JSON.stringify({sledpush:{kg:45.36,plates:{45:2}}}))});
 await p.clock.install({time:new Date('2026-10-12T07:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 await p.evaluate(()=>startWorkout(3,0,'2026-10-12'));await p.clock.runFor(500);
 await p.evaluate(()=>document.querySelector('#workout [data-emom]').click());await p.clock.runFor(1200);return p};
const fits=p=>p.evaluate(()=>{const f=document.getElementById('emFocus'),r=f.getBoundingClientRect(),ins=[...f.querySelectorAll('.emf-clock,.emf-name,#emfNote,.emf-stop')].map(e=>e.getBoundingClientRect());return{noScroll:f.scrollHeight<=f.clientHeight+1,inside:ins.every(q=>q.top>=r.top-1&&q.bottom<=r.bottom+1&&q.height>0)}});
let p=await open(390,844);
check('focus view covers the screen',await p.evaluate(()=>{const f=document.getElementById('emFocus');return[!f.hidden,getComputedStyle(f).position,document.elementFromPoint(195,420)&&f.contains(document.elementFromPoint(195,420))]}),[true,'fixed',true]);
check('390x844: everything fits, no scrolling',await fits(p),{noScroll:true,inside:true});
check('top: round, minute, countdown',await p.evaluate(()=>[emfRound.textContent,emfMin.textContent,/^(1:00|0:[0-5]\d)$/.test(emfClock.textContent)]),['Round 1 of 4','Minute 1 of 16',true]);
check('card: name, target, load and last time line exist',await p.evaluate(()=>[emfName.textContent,emfTarget.textContent.length>0,emfLoad.textContent]),['Sled push',true,'190 lb · 2 x 45']);
check('next list shows 3 upcoming moves',await p.locator('#emfNext li').count(),3);
check('no dock, toast, pill or tab bar visible',await p.evaluate(()=>['.wo-dock','#toast','#woPill','.bottombar'].map(s=>{const e=document.querySelector(s);return!e||getComputedStyle(e).visibility==='hidden'||e.hidden||getComputedStyle(e).display==='none'})),[true,true,true,true]);
await p.fill('#emfNote','left hip tight');
check('note saved for this exercise',await p.evaluate(()=>woState().notes[emomRun.key+'|m0']),'left hip tight');
await p.clock.runFor(60000);
check('next minute: card advances, note box is empty for the new move',await p.evaluate(()=>[emfMin.textContent,emfName.textContent!=='Sled push',emfNote.value]),['Minute 2 of 16',true,'']);
// keyboard: shrink the viewport to what iOS leaves above the keyboard
await p.setViewportSize({width:390,height:420});await p.clock.runFor(1200);await p.focus('#emfNote');
check('keyboard sized viewport (390x420): still fits, clock and card visible',await fits(p),{noScroll:true,inside:true});
check('typing a note locks the page behind (no scroll jump) and the top stays pinned',await p.evaluate(()=>[document.body.style.position,document.getElementById('emFocus').style.top,scrollY]),['fixed','0px',0]);
await p.evaluate(()=>document.getElementById('emfNote').blur());await p.clock.runFor(1000);
check('leaving the note unlocks the page',await p.evaluate(()=>[document.body.style.position,!document.body.dataset.emfLock]),['',true]);
await p.setViewportSize({width:390,height:844});await p.clock.runFor(1200);
// run to the end
await p.clock.runFor(15*60000);
check('EMOM ends: focus view closes, EMOM checked off, time stored',await p.evaluate(()=>[document.getElementById('emFocus').hidden,Object.values(woState().emtime||{})[0]]),[true,{ms:960000,mins:16,full:true}]);
check('finish notes carry the EMOM time and the exercise note',await p.evaluate(()=>{let got;openFinish=x=>{got=x.notes};finishWorkout();return[/EMOM 16′: done in 16:00/.test(got),/Sled push[^\n]*: left hip tight/.test(got)]}),[true,true]);
await p.close();
// Stop button and a 360 wide phone
p=await open(360,640);
check('360x640: fits without scrolling',await fits(p),{noScroll:true,inside:true});
await p.clock.runFor(30000);await p.click('#emfStop');await p.clock.runFor(500);
check('Stop closes the view and logs where it stopped',await p.evaluate(()=>[document.getElementById('emFocus').hidden,emomRun,Object.values(woState().emtime)[0].full]),[true,null,false]);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
