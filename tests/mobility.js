// Mobility routine check: node tests/mobility.js  (daily 3 on Today, full 9 on Wednesday, ticks persist in checks, streak, guide drawings, Plan Wed card, no log written)
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
async function open(date,w=390){const p=await b.newPage({viewport:{width:w,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.clock.install({time:new Date(date)});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);p.errs=errs;return p}
// Friday: daily 3
let p=await open('2026-10-02T09:00:00');
ok(await p.locator('#mobCard .mob-row').count()===3,'Friday shows 3 moves');
ok((await p.locator('#mobCard .mob-ti small').textContent()).includes('4 min'),'Friday header says 4 min');
ok(await p.locator('#mobCard.open').count()===0,'Friday starts collapsed');ok(await p.locator('#mobCard').boundingBox().then(b=>b.height<90),'collapsed card is one slim row');await p.screenshot({path:OUT+'/mob-today-collapsed.png'});
await p.click('[data-mobtoggle]');ok(await p.locator('#mobCard.open').count()===1,'tap expands');await p.screenshot({path:OUT+'/mob-today.png'});
await p.locator('[data-mobck=ankle]').click();
ok(await p.locator('#mobCard .mob-n').innerText()==='1/3','tick updates count');
const chk=await p.evaluate(()=>load(checkKey(),{}));ok(chk['mob-2026-10-02']==='ankle','checks hold mob-2026-10-02=ankle');
ok(!(await p.evaluate(()=>getLogs().length)),'no log written by ticking');
await p.locator('[data-mobck=couch]').click();await p.locator('[data-mobck=chin]').click();
ok(await p.locator('#mobCard.all').count()===1,'all 3 done marks card');
await p.screenshot({path:OUT+'/mob-today-done.png'});
ok(await p.evaluate(()=>mobStreak(new Date())===1),'streak 1 after first full day');
await p.locator('#mobCard .mob-t').first().click();
ok(await p.locator('#modal .gx-mob svg').count()===2,'guide shows start and finish drawings');
await p.screenshot({path:OUT+'/mob-guide.png'});
await p.evaluate(()=>closeModal.click());
ok(!(await p.evaluate(()=>getLogs().some(x=>/ankle|mobility/i.test(x.session)))),'still no log');
ok(!p.errs.length,'no page errors Friday '+JSON.stringify(p.errs));await p.close();
// Wednesday: full 9
p=await open('2026-09-30T09:00:00');
ok(await p.locator('#mobCard.open').count()===1,'Wednesday opens by default');ok(await p.locator('#mobCard .mob-row').count()===9,'Wednesday shows 9 moves');
ok(await p.locator('#mobCard .mob-s').count()===3,'3 stars on Wednesday');
ok((await p.locator('#mobCard .mob-ti small').textContent()).includes('12 min'),'Wednesday header says 12 min');
await p.locator('#mobCard').scrollIntoViewIfNeeded();await p.screenshot({path:OUT+'/mob-wed.png',fullPage:true});
ok(!p.errs.length,'no page errors Wednesday');await p.close();
// streak across days
p=await open('2026-10-03T09:00:00');
await p.evaluate(()=>{const o={};['2026-10-01','2026-10-02','2026-10-03'].forEach(d=>o['mob-'+d]='ankle,couch,chin');store(checkKey(),o);renderToday()});
ok(await p.evaluate(()=>mobStreak(new Date())===3),'3 day streak');
ok((await p.locator('#mobCard .mob-ti small').innerText()).includes('3 day'),'streak text');
await p.close();
// Plan Wednesday card + 360 + light theme
p=await open('2026-09-30T09:00:00',360);
await p.evaluate(()=>showView('plan'));await p.clock.runFor(300);
const wed=p.locator('#plan .day-card, #plan .day').filter({hasText:'Mobility'}).first();
ok(await wed.count()>0,'Plan has a Wednesday card with Mobility');
await p.evaluate(()=>document.documentElement.setAttribute('data-theme','volt-light'));
await p.evaluate(()=>showView('today'));await p.locator('#mobCard').scrollIntoViewIfNeeded();
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'no horizontal overflow at 360');
await p.screenshot({path:OUT+'/mob-light360.png'});await p.close();
console.log(fails?fails+' FAILED':'ALL OK');await b.close();process.exit(fails?1:0)})();
