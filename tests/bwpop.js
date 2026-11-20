// v184 body weight chart pop up: touching the chart picks the nearest weigh-in (dots are crowded), shows a bubble with the value,
// the date and week and the change vs the weigh-in before, a guide line and a bigger dot; dragging moves it; it hides on its own. node tests/bwpop.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const T='2026-11-20T12:00:00Z',BW={bw_7:{v:'157.0 lb',t:T},bw_7d1:{v:'157.6 lb',t:T},bw_7b:{v:'158.0 lb',t:T},bw_8:{v:'159.0 lb',t:T},bw_8d1:{v:'158.2 lb',t:T},bw_8d2:{v:'157.4 lb',t:T},bw_8b:{v:'156.0 lb',t:T},bw_8d4:{v:'157.4 lb',t:T}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
for(const w of [390,360]){const p=await b.newPage({viewport:{width:w,height:844},hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(bw=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bw))},BW);
 await p.clock.install({time:new Date('2026-11-20T10:40:00')});await p.goto(URL);await p.clock.runFor(5000);
 await p.evaluate(()=>{showView('health')});await p.clock.runFor(500);await p.click('#hlBw');await p.clock.runFor(600);
 const sv=p.locator('#bwWrap .bw-cv svg');ok(await sv.count()===1,w+': chart sits in the pop up wrapper');
 const last=await p.evaluate(()=>{const c=[...document.querySelectorAll('#bwWrap .bw-pt')].pop().getBoundingClientRect();return{x:c.x+c.width/2,y:c.y+c.height/2}});
 await p.dispatchEvent('#bwWrap .bw-cv svg','pointerdown',{clientX:last.x+1,clientY:last.y,pointerType:'touch',pointerId:1,buttons:1});await p.waitForTimeout(150);
 const t=await p.evaluate(()=>{const e=document.querySelector('#bwWrap .bw-pop');return{on:e.classList.contains('on'),t:e.innerText.replace(/\s+/g,' '),sel:document.querySelectorAll('#bwWrap .bw-pt.sel').length,g:document.querySelector('#bwWrap .bw-guide').classList.contains('on')}});
 ok(t.on&&/^157\.4 lb Fri, Nov 20 · Week 8 \+1\.4 vs Thu$/.test(t.t)&&t.sel===1&&t.g,w+': touch on the last dot shows value, date, week and change: '+t.t);
 const first=await p.evaluate(()=>{const c=document.querySelector('#bwWrap .bw-pt').getBoundingClientRect();return{x:c.x+c.width/2,y:c.y}});
 await p.dispatchEvent('#bwWrap .bw-cv svg','pointermove',{clientX:first.x,clientY:first.y,pointerType:'touch',pointerId:1,buttons:1});await p.waitForTimeout(150);
 const t2=await p.evaluate(()=>document.querySelector('#bwWrap .bw-pop').innerText.replace(/\s+/g,' '));ok(/^157\.0 lb Mon, Nov 9 · Week 7$/.test(t2),w+': dragging to the first dot moves the bubble, first weigh-in has no change: '+t2);
 ok(await p.evaluate(()=>{const e=document.querySelector('#bwWrap .bw-pop').getBoundingClientRect(),c=document.querySelector('#bwWrap .bw-cv').getBoundingClientRect();return e.left>=c.left-1&&e.right<=c.right+1}),w+': bubble stays inside the chart width');
 if(w===390){await p.dispatchEvent('#bwWrap .bw-cv svg','pointermove',{clientX:last.x-30,clientY:last.y,pointerType:'touch',pointerId:1,buttons:1});await p.waitForTimeout(150);await p.locator('#bwWrap .bwg ~ *').first().screenshot({path:'/tmp/bwpop.png'}).catch(()=>{});await p.locator('#bwWrap').screenshot({path:'/tmp/bwpop-all.png'})}
 await p.dispatchEvent('#bwWrap .bw-cv svg','pointerup',{pointerType:'touch',pointerId:1});await p.clock.runFor(4500);
 ok(await p.evaluate(()=>!document.querySelector('#bwWrap .bw-pop').classList.contains('on')&&!document.querySelector('#bwWrap .bw-pt.sel')),w+': hides by itself 4 s after lifting the finger');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),w+': no overflow');await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
