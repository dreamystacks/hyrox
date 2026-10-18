// v85 Today: Studio theme for Fred, race tile, days trained strip, Needs you list. node tests/today85.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
for(const vw of [390,360]){const p=await b.newPage({viewport:{width:vw,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-15T09:00:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');const L=[];const add=(d,s)=>L.push({id:d+s,date:d,week:3,session:s,duration:45,rpe:7,notes:'',savedAt:d+'T20:00:00Z',updatedAt:d+'T20:00:00Z'});
['2026-10-05','2026-10-09','2026-10-10'].forEach(d=>add(d,'Other'));add('2026-10-13','Tue: Run + arms A');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(L))});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='studio-light',vw+': Fred lands on Studio light');
const tile=await p.locator('.rt-tile').innerText();ok(/Nashville/.test(tile)&&/56/.test(tile)&&/Brisbane/.test(tile)&&/170/.test(tile),vw+': race tile shows both races: '+tile.replace(/\n/g,' | '));
const ts=await p.locator('.ts-wrap').innerText();ok(/4 trained/.test(ts),vw+': 4 days trained: '+ts.replace(/\n/g,' | '));
ok(await p.locator('.ts-bars i').count()===18,vw+': one bar per day since Sep 28 (18 so far)');
ok(await p.locator('.ts-bars i.now').count()===1,vw+': today is marked');
const nd=await p.locator('.nd-card').innerText();ok(/Weigh-in due/.test(nd)&&/Legs lift \+ EMOM not logged/.test(nd),vw+': Needs you has weigh-in and the missed Monday: '+nd.replace(/\n/g,' | '));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),vw+': no horizontal scroll');
const th=await p.evaluate(()=>{const r=document.querySelector('.rt-tile').getBoundingClientRect(),q=document.querySelector('.ts-wrap').getBoundingClientRect();return Math.round(r.height+q.height)});ok(th<230,vw+': tile + strip stay compact ('+th+' px)');
await p.screenshot({path:OUT+'/today85-'+vw+'.png'});
await p.locator('[data-ndjump]').first().click();await p.clock.runFor(600);
ok(await p.evaluate(()=>document.getElementById('plan').classList.contains('active')&&!!document.querySelector('#days .day-card.open[data-day=Mon]')),vw+': tapping the missed day opens Plan on that day');
ok(!errs.length,vw+': no page errors '+errs.join('|'));await p.close()}
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
