// Set table in workout mode (v80): header, one row per set, load column follows the weight input, tap and dock still work, fits at 360. node tests/settable.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
for(const vw of [390,360]){const p=await b.newPage({viewport:{width:vw,height:800}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-12T17:00:00')});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
await p.evaluate(()=>startWorkout(3,0,'2026-10-12'));await p.clock.runFor(600);
const t0=p.locator('.st-tbl').first();
ok(/SET\s+LB\s+REPS\s+REST/i.test((await t0.locator('.st-h').innerText()).replace(/\n/g,' ')),vw+': header SET LB REPS REST');
ok(await t0.locator('.st-r').count()===3,vw+': trap bar has 3 rows');
ok((await t0.locator('.st-r').nth(0).innerText()).replace(/\s+/g,' ').trim()==='1 — 5 3:00',vw+': row 1 reads 1 — 5 3:00');
const inp=p.locator('#workout [data-wt]').first();await inp.fill('205');await p.clock.runFor(100);
ok(await t0.locator('.st-r').nth(1).locator('[data-lbc]').innerText()==='205',vw+': LB column follows the weight input');
await inp.dispatchEvent('change');await t0.locator('.st-r').nth(0).click();await p.clock.runFor(300);
ok(await p.evaluate(()=>document.querySelector('.st-tbl .st-r').classList.contains('done')),vw+': tapping row 1 marks set 1 done');
ok(/Skip rest/.test(await p.locator('.wo-dock').innerText()),vw+': rest starts after the row tap');
await p.clock.runFor(1300);await p.click('.dk-b');await p.clock.runFor(1400);await p.click('.dk-b');await p.clock.runFor(300);
ok(await p.evaluate(()=>document.querySelectorAll('.st-tbl')[0].querySelectorAll('.st-r.done').length===2),vw+': dock tap marks set 2 in the table');
ok(await p.evaluate(()=>{const W=document.getElementById('workout');return W.scrollWidth<=W.clientWidth+1}),vw+': no horizontal overflow');
await t0.scrollIntoViewIfNeeded();await p.screenshot({path:OUT+`/settable-${vw}.png`});
ok(!errs.length,vw+': no page errors '+errs.join('|'));await p.close()}
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
