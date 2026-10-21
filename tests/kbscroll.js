// v109: focusing a box in workout mode must not scroll the whole screen. Mocked visualViewport (keyboard = 390x420).
// Body locked while typing, window stays at 0, the overlay fits the visual viewport, the field is scrolled above the keyboard,
// blur unlocks and restores the page scroll. node tests/kbscroll.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{const l={};window.__vv={offsetTop:0,height:innerHeight,addEventListener:(t,f)=>{(l[t]=l[t]||[]).push(f)},fire:t=>(l[t]||[]).forEach(f=>f())};Object.defineProperty(window,'visualViewport',{value:window.__vv,configurable:true});localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-10-20T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);
await p.evaluate(()=>{showView('plan');window.scrollTo(0,600)});await p.clock.runFor(300);const y0=await p.evaluate(()=>scrollY);
await p.evaluate(()=>startWorkout(4,1,'2026-10-20'));await p.clock.runFor(600);
// focus a weight box low on the screen, then raise the keyboard
const sel='#workout .st-in';const n=await p.locator(sel).count();ok(n>3,'Tuesday workout has set weight boxes: '+n);
await p.evaluate(s=>{const els=[...document.querySelectorAll(s)];const el=els[els.length-1];el.scrollIntoView({block:'end'});el.focus()},sel);
await p.evaluate(()=>{__vv.height=420;__vv.offsetTop=0;__vv.fire('resize')});await p.clock.runFor(900);
const st=await p.evaluate(s=>{const el=document.activeElement,r=el.getBoundingClientRect(),W=document.getElementById('workout');return{lock:document.body.style.position,winY:scrollY,wh:W.style.height,bottom:r.bottom,top:r.top,stick:W.querySelector('.wo-sticky').getBoundingClientRect().bottom}},sel);
ok(st.lock==='fixed','body is locked while typing');ok(st.winY===0,'window stays at 0');ok(st.wh==='420px','overlay fitted to the visual viewport');
ok(st.bottom<=420&&st.top>=st.stick,'focused box sits between the clock bar and the keyboard '+JSON.stringify(st));
// iOS pans the visual viewport: overlay follows, window still 0
await p.evaluate(()=>{__vv.offsetTop=120;__vv.fire('scroll');window.scrollTo(0,120)});await p.clock.runFor(300);
ok(await p.evaluate(()=>[document.getElementById('workout').style.top,scrollY].join())==='120px,0','pan: overlay top follows offsetTop, window forced back to 0');
// blur
await p.evaluate(()=>{__vv.offsetTop=0;__vv.height=innerHeight;document.activeElement.blur();__vv.fire('resize')});await p.clock.runFor(1000);
const after=await p.evaluate(()=>({lock:document.body.style.position,top:document.getElementById('workout').style.top,h:document.getElementById('workout').style.height}));
ok(after.lock===''&&after.top===''&&after.h==='','blur unlocks the body and clears the fit');
await p.evaluate(()=>closeWorkout());await p.clock.runFor(500);ok(Math.abs(await p.evaluate(()=>scrollY)-y0)<5,'closing the workout restores the Plan scroll '+y0);
// the note box too
await p.evaluate(()=>startWorkout(4,1,'2026-10-20'));await p.clock.runFor(600);
await p.evaluate(()=>{const t=document.querySelector('#workout textarea');t.focus()});await p.clock.runFor(300);ok(await p.evaluate(()=>document.body.style.position)==='fixed','textarea focus locks too');
await p.evaluate(()=>{document.activeElement.blur();minimizeWorkout()});await p.clock.runFor(400);ok(await p.evaluate(()=>document.body.style.position)==='','minimize leaves no lock');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
