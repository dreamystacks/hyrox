// v185 body weight big chart: tapping the small chart (or Expand) opens a full screen chart; the readout sits in its own strip above
// the plot and never covers a dot; it starts on the latest weigh-in; touch or drag picks the nearest dot (bigger, guide line);
// Recent zooms to the weeks with data, To Brisbane shows weeks 1 to 27 with the goal line; X closes. node tests/bwpop.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const T='2026-11-20T12:00:00Z',BW={bw_7:{v:'157.0 lb',t:T},bw_7d1:{v:'157.6 lb',t:T},bw_7b:{v:'158.0 lb',t:T},bw_8:{v:'163.0 lb',t:T},bw_8d1:{v:'158.2 lb',t:T},bw_8d2:{v:'157.4 lb',t:T},bw_8b:{v:'156.0 lb',t:T},bw_8d4:{v:'157.4 lb',t:T}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
for(const w of [390,360]){const p=await b.newPage({viewport:{width:w,height:844},hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(bw=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bw))},BW);
 await p.clock.install({time:new Date('2026-11-20T10:40:00')});await p.goto(URL);await p.clock.runFor(5000);
 await p.evaluate(()=>showView('health'));await p.clock.runFor(500);await p.click('#hlBw');await p.clock.runFor(600);
 ok(await p.locator('#bwWrap .bw-exp').count()===1,w+': small chart has an Expand button');
 await p.click('#bwWrap .bw-exp');await p.clock.runFor(300);
 ok(await p.evaluate(()=>{const m=document.getElementById('bwBig');return m&&getComputedStyle(m).display==='flex'&&m.getBoundingClientRect().height>=innerHeight-1}),w+': Full screen opens the full screen chart');
 const r0=await p.evaluate(()=>document.querySelector('#bwBig .bwb-read').innerText.replace(/\s+/g,' '));ok(/^157\.4 lb Fri, Nov 20 vs previous \+1\.4$/.test(r0),w+': starts on the latest weigh-in: '+r0);
 ok(await p.evaluate(()=>{const r=document.querySelector('#bwBig .bwb-read').getBoundingClientRect();return [...document.querySelectorAll('#bwBig .bwb-pt')].every(c=>c.getBoundingClientRect().top>=r.bottom)}),w+': readout strip sits above every dot');
 ok(await p.evaluate(()=>{const s=document.querySelector('#bwBig .bwb-svg').getBoundingClientRect();return s.height>=200}),w+': chart is tall (≥ 200 px)');
 const n8=await p.evaluate(()=>document.querySelectorAll('#bwBig .bwb-pt').length);ok(n8===8,w+': Recent shows all 8 weigh-ins '+n8);
 const xs=await p.evaluate(()=>[...document.querySelectorAll('#bwBig .bwb-pt')].map(c=>c.getBoundingClientRect().x).sort((a,b)=>a-b));ok(Math.min(...xs.slice(1).map((v,i)=>v-xs[i]))>=10,w+': 8 weeks spreads the dots (min gap '+Math.round(Math.min(...xs.slice(1).map((v,i)=>v-xs[i])))+' px)');
 const d=await p.evaluate(()=>{const c=[...document.querySelectorAll('#bwBig .bwb-pt')].find(e=>e.dataset.i==='3').getBoundingClientRect();return{x:c.x+c.width/2,y:c.y+c.height/2}});
 await p.dispatchEvent('#bwBig .bwb-svg','pointerdown',{clientX:d.x,clientY:d.y+40,pointerType:'touch',pointerId:1,buttons:1});await p.waitForTimeout(100);
 const r1=await p.evaluate(()=>[document.querySelector('#bwBig .bwb-read').innerText.replace(/\s+/g,' '),document.querySelectorAll('#bwBig .bwb-pt.sel').length,document.querySelector('#bwBig .bw-guide').classList.contains('on')]);
 ok(/^163\.0 lb Mon, Nov 16 vs previous \+5\.0$/.test(r1[0])&&r1[1]===1&&r1[2],w+': touch below a dot picks it by x: '+r1[0]);
 const d0=await p.evaluate(()=>{const c=document.querySelector('#bwBig .bwb-pt').getBoundingClientRect();return{x:c.x+c.width/2,y:c.y}});
 await p.dispatchEvent('#bwBig .bwb-svg','pointermove',{clientX:d0.x,clientY:d0.y,pointerType:'touch',pointerId:1,buttons:1});await p.waitForTimeout(100);
 ok(/^157\.0 lb Mon, Nov 9 vs previous First$/.test(await p.evaluate(()=>document.querySelector('#bwBig .bwb-read').innerText.replace(/\s+/g,' '))),w+': drag to the first dot');
 if(w===390)await p.screenshot({path:'/tmp/bwbig.png'});
 await p.click('#bwBig [data-bwr=all]');await p.clock.runFor(200);
 ok(await p.evaluate(()=>!!document.querySelector('#bwBig .bw-goal')&&/W25|W22|W26/.test(document.querySelector('#bwBig .bwb-svg').textContent)),w+': To Brisbane shows the goal line and later weeks');
 if(w===390)await p.screenshot({path:'/tmp/bwbig-all.png'});
 await p.click('#bwBig [data-bwbx]');await p.clock.runFor(200);ok(await p.evaluate(()=>getComputedStyle(document.getElementById('bwBig')).display==='none'),w+': X closes it');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),w+': no overflow');await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
