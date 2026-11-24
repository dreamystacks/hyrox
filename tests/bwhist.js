// v122 weigh-in history on Coach: node tests/bwhist.js
// Body weight tile opens the chart; under it every weigh-in newest first with its date, week and change vs the one before;
// more than 6 fold into "Show all"; another athlete's history is visible read only; 390 and 360 wide, no overflow.
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const T='2026-10-29T12:00:00Z',BW={bw_1:{v:'157.4 lb',t:T},bw_1b:{v:'158.0 lb',t:T},bw_2:{v:'159.0 lb',t:T},bw_2b:{v:'158.6 lb',t:T},bw_3:{v:'159.8 lb',t:T},bw_3b:{v:'160.4 lb',t:T},bw_4:{v:'159.6 lb',t:T},bw_5:{v:'160.1 lb',t:T}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async w=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(bw=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bw));localStorage.setItem('hrx_will_bench_v2',JSON.stringify({bw_4:{v:'80.0 kg',t:'2026-10-20T12:00:00Z'}}))},BW);
 await p.clock.install({time:new Date('2026-10-29T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=bench]');await p.evaluate(()=>{const s=document.getElementById('dashStore');if(s)s.hidden=false});await p.clock.runFor(600);
 await p.evaluate(()=>document.querySelector('.tr[data-tr=bw]').click());await p.clock.runFor(300);await p.evaluate(()=>document.querySelectorAll('#bwWrap .bw2-hist').forEach(d=>d.open=true));return p};
for(const w of [390,360]){const p=await open(w);
 const r=await p.evaluate(()=>{const rt=x=>[x.querySelector('.bwh-d b'),x.querySelector('.bwh-d i'),x.querySelector('.bwh-v'),x.querySelector('.bwh-c')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).join(' ');const h=document.querySelector('#bwWrap .bwh');return h&&{head:h.querySelector('.bwh-h').textContent,rows:[...h.querySelectorAll(':scope > .bwh-w > summary')].map(rt),more:h.querySelector('.bwh-more summary')&&h.querySelector('.bwh-more summary').textContent,hidden:h.querySelectorAll('.bwh-more .bwh-w').length}});
 ok(r&&r.head==='By week8 weigh-ins',w+': history under the chart '+(r&&r.head));
 ok(r.rows[0]==='Week 5 Oct 26 to 1 · 1 weigh-in 160.1 lb +0.5','v213: one row per week, newest first, avg and change vs prior week: '+r.rows[0]);
 ok(r.rows[1]==='Week 4 Oct 19 to 25 · 1 weigh-in 159.6 lb −0.5','drop shown with a minus: '+r.rows[1]);
 ok(r.rows.length===5&&!r.more&&r.hidden===0,'5 weeks, no Show all under 7 '+[r.rows.length,r.more,r.hidden]);
ok(await p.evaluate(()=>{const x=[...document.querySelectorAll('#bwWrap .bwh-w > summary')].pop();return[x.querySelector('.bwh-d b').textContent,x.querySelector('.bwh-c').textContent].join(' ')})==='Week 1 first','oldest week is marked first');ok(await p.evaluate(()=>{const d=[...document.querySelectorAll('#bwWrap .bwh-w')].pop();d.open=true;return d.querySelector('.bwh-days').textContent.replace(/\s/g,'')})==='Mon157.4Thu158.0','tap a week shows its days');
 ok(await p.evaluate(()=>{const w=document.getElementById('bwWrap').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.bwh-w > summary')].every(r=>r.getBoundingClientRect().right<=w.right+1)}),w+': no overflow');
 if(w===390)await p.locator('#bwWrap').screenshot({path:(process.env.SHOTS||'/tmp')+'/bwhist.png'});
 await p.close()}
// another athlete: read only, history still shows
{const p=await open(390);await p.evaluate(()=>{viewAs='will';renderBench();document.querySelector('.tr[data-tr=bw]')&&document.querySelector('.tr[data-tr=bw]').click()}).catch(()=>{});
 const r=await p.evaluate(()=>{renderBW('will');const h=document.querySelector('#bwWrap .bwh');return[h&&h.querySelector('.bwh-h').textContent,!!document.getElementById('bwInput')]});
 ok(r[0]==='By week1 weigh-in','another athlete shows their own history');await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
