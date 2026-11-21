// v189: reps box focus with a mocked visualViewport. The overlay must not chase every viewport scroll (bounce loop), the fitted height must clear when the keyboard goes down, a box left focused with the keyboard down gets blurred, and the box text is selected on focus.
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});let errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{const l={};window.__vv={offsetTop:0,height:innerHeight,addEventListener:(t,f)=>{(l[t]=l[t]||[]).push(f)}};window.__vvFire=t=>(l[t]||[]).forEach(f=>f());Object.defineProperty(window,'visualViewport',{value:window.__vv,configurable:true});localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-10-20T18:00:00')});
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.clock.runFor(5000);
let ok=true;const t=(c,m)=>{console.log((c?'ok  ':'FAIL')+' '+m);if(!c)ok=false};
await p.evaluate(()=>startWorkout(4,1,'2026-10-20'));await p.clock.runFor(800);
const has=await p.$('#workout .st-rp');t(!!has,'workout has a reps box');
if(has){await has.focus();
 const sel=await p.evaluate(()=>{const a=document.activeElement;return a.selectionStart===0&&a.selectionEnd===a.value.length});t(sel,'reps text selected on focus');
 await p.evaluate(()=>{__vv.height=420;__vvFire('resize')});await p.clock.runFor(700);
 const h1=await p.evaluate(()=>document.getElementById('workout').style.height);t(h1==='420px','overlay fitted to keyboard: '+h1);
 // iOS pans repeatedly: top may move at most twice
 const tops=[];for(let i=1;i<=8;i++){await p.evaluate(i=>{__vv.offsetTop=i*20;__vvFire('scroll')},i);await p.clock.runFor(250);tops.push(await p.evaluate(()=>document.getElementById('workout').style.top))}
 t(new Set(tops).size<=2,'overlay top moved at most twice: '+tops.join(','));
 // keyboard goes down, box still focused
 await p.evaluate(()=>{__vv.offsetTop=0;__vv.height=844;__vvFire('resize')});await p.clock.runFor(800);
 const st=await p.evaluate(()=>{const W=document.getElementById('workout');return {h:W.style.height,top:W.style.top,ae:document.activeElement.tagName,lock:!!document.body.dataset.woLock}});
 t(st.h===''&&st.top==='','fitted size cleared after keyboard down: '+JSON.stringify(st));t(st.ae!=='INPUT','box blurred');t(!st.lock,'body unlocked');}
t(!errs.length,'no page errors '+errs.join('|'));console.log(ok?'ALL OK':'FAILED');await b.close();process.exit(ok?0:1)})();
