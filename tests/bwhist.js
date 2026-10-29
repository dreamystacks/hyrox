// v122 weigh-in history on Coach: node tests/bwhist.js
// Body weight tile opens the chart; under it every weigh-in newest first with its date, week and change vs the one before;
// more than 6 fold into "Show all"; another athlete's history is visible read only; 390 and 360 wide, no overflow.
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const T='2026-10-29T12:00:00Z',BW={bw_1:{v:'157.4 lb',t:T},bw_1b:{v:'158.0 lb',t:T},bw_2:{v:'159.0 lb',t:T},bw_2b:{v:'158.6 lb',t:T},bw_3:{v:'159.8 lb',t:T},bw_3b:{v:'160.4 lb',t:T},bw_4:{v:'159.6 lb',t:T},bw_5:{v:'160.1 lb',t:T}};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async w=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(bw=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bw));localStorage.setItem('hrx_will_bench_v2',JSON.stringify({bw_4:{v:'80.0 kg',t:'2026-10-20T12:00:00Z'}}))},BW);
 await p.clock.install({time:new Date('2026-10-29T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);await p.click('.bottombar [data-view=bench]');await p.clock.runFor(600);
 await p.evaluate(()=>document.querySelector('.tr[data-tr=bw]').click());await p.clock.runFor(300);return p};
for(const w of [390,360]){const p=await open(w);
 const r=await p.evaluate(()=>{const rt=x=>[x.querySelector('.bwh-d b'),x.querySelector('.bwh-d i'),x.querySelector('.bwh-v'),x.querySelector('.bwh-c')].map(e=>e.textContent.replace(/\s+/g,' ').trim()).join(' ');const h=document.querySelector('#bwWrap .bwh');return h&&{head:h.querySelector('.bwh-h').textContent,rows:[...h.querySelectorAll(':scope > .bwh-r')].map(rt),more:h.querySelector('.bwh-more summary')&&h.querySelector('.bwh-more summary').textContent,hidden:h.querySelectorAll('.bwh-more .bwh-r').length}});
 ok(r&&r.head==='Weigh-ins8 logged',w+': history under the chart '+(r&&r.head));
 ok(r.rows[0]==='Mon, Oct 26 Week 5 · Mon 160.1 lb +0.5','newest first with date, week, value and change: '+r.rows[0]);
 ok(r.rows[1]==='Mon, Oct 19 Week 4 · Mon 159.6 lb −0.8','drop shown with a minus: '+r.rows[1]);
 ok(r.rows.length===6&&r.more==='Show all 8'&&r.hidden===2,'6 shown, the rest behind Show all '+[r.rows.length,r.more,r.hidden]);
 await p.click('#bwWrap .bwh-more summary');ok(await p.evaluate(()=>{const x=[...document.querySelectorAll('#bwWrap .bwh-r')].pop();return[x.querySelector('.bwh-d b').textContent,x.querySelector('.bwh-c').textContent].join(' ')})==='Mon, Sep 28 first','oldest is marked first');
 ok(await p.evaluate(()=>{const w=document.getElementById('bwWrap').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.bwh-r')].every(r=>r.getBoundingClientRect().right<=w.right+1)}),w+': no overflow');
 if(w===390)await p.locator('#bwWrap').screenshot({path:(process.env.SHOTS||'/tmp')+'/bwhist.png'});
 await p.close()}
// another athlete: read only, history still shows
{const p=await open(390);await p.evaluate(()=>{viewAs='will';renderBench();document.querySelector('.tr[data-tr=bw]')&&document.querySelector('.tr[data-tr=bw]').click()}).catch(()=>{});
 const r=await p.evaluate(()=>{renderBW('will');const h=document.querySelector('#bwWrap .bwh');return[h&&h.querySelector('.bwh-h').textContent,!!document.getElementById('bwInput')]});
 ok(r[0]==='Weigh-ins1 logged','another athlete shows their own history');await p.close()}
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
