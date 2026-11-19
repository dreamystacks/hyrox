// v162 Today in the E design: greeting and date line, readiness slot, weigh in first then greyed at the bottom,
// session card (tags, Change, title, rows, Start, Garmin, Edit session and rest day), list card (to do days, Brisbane, This week, next session). node tests/today162.js
// Replaces tests/today85.js.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const L=(id,d,s,x={})=>({id,date:d,session:s,duration:60,rpe:7,notes:'',savedAt:d+'T20:00:00Z',updatedAt:d+'T20:00:00Z',...x});
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const open=async(vw,bench)=>{const p=await b.newPage({viewport:{width:vw,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;
 await p.clock.install({time:new Date('2026-11-18T08:00:00')});
 await p.addInitScript(([lg,bn])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));if(bn)localStorage.setItem('hrx_fred_bench_v2',JSON.stringify(bn));localStorage.setItem('hrx_fred_pick_v2',JSON.stringify({date:'2026-11-18',idx:1}))},[[L('a','2026-11-16','Mon: Lower + sled',{duration:70,rpe:9})],bench||null]);
 await p.goto(URL);await p.clock.runFor(5000);return p};
for(const vw of [390,360]){const p=await open(vw);
 const g=await p.evaluate(()=>({t:document.querySelector('.tg-t').textContent,d:document.querySelector('#today .td-date').textContent,kids:[...document.querySelectorAll('#today>*')].map(e=>e.className.split(' ').slice(0,2).join(' '))}));
 ok(/Fred/.test(g.t)&&g.d==='Wednesday, Nov 18 · Week 8 · Base',vw+': greeting and one date line with week and phase '+g.d);
 ok(/^rdy/.test(g.kids[1])&&/td-bw/.test(g.kids[2])&&/td-session/.test(g.kids[3])&&g.kids.some(k=>/td-list/.test(k)),vw+': order greeting, readiness, weigh in, session, list '+g.kids.join(' > '));
 ok(/Arrives with your Garmin data|Set up sync/.test(await p.locator('.rdy').innerText()),vw+': readiness placeholder until watch data');
 ok(await p.locator('.rt-tile,.ts-wrap,.nd-card,.td-wk').count()===0,vw+': old race tile, season strip, Needs you and week block are gone');
 const c=await p.evaluate(()=>{const s=document.querySelector('#today .td-session');return{name:s.querySelector('.tp-name').textContent,tags:[...s.querySelectorAll('.ts-tags>*')].map(x=>x.textContent),chg:!!s.querySelector('.ts-chg[data-chg]'),start:!!s.querySelector('.start-btn'),edit:!!s.querySelector('[data-tpe]'),rest:!!s.querySelector('[data-restday]'),rows:s.querySelectorAll('.exercise').length}});
 ok(c.name==='Run + Arms'&&c.tags[0]==='Making up Tue'&&/\d+ min/.test(c.tags[1]||'')&&c.chg,vw+': making up Tuesday tag, duration tag, Change '+JSON.stringify(c.tags));
 ok(c.start&&c.edit&&c.rest&&c.rows>=4,vw+': Start, Edit session, rest day and one row per exercise');
 const li=await p.evaluate(()=>[...document.querySelectorAll('#today .td-list>.lr')].map(r=>r.className.replace('lr ','')+' | '+r.innerText.replace(/\s+/g,' ')));
 ok(li.length===3&&/lr-race/.test(li[0])&&/Brisbane · Apr 3 136 days to go/.test(li[0])&&/td-wkrow/.test(li[1])&&/1 of 5 sessions · 0 \/ \d+(\.\d)? km/.test(li[1])&&/td-next/.test(li[2]),vw+': list rows: Brisbane, This week, next session '+JSON.stringify(li));
 await p.click('[data-toplan]');await p.clock.runFor(500);ok(await p.evaluate(()=>document.getElementById('plan').classList.contains('active')),vw+': This week opens Plan');
 await p.evaluate(()=>showView('today'));await p.clock.runFor(300);
 await p.click('[data-tpe]');await p.clock.runFor(300);ok(await p.evaluate(()=>document.getElementById('peModal').classList.contains('show')&&/Tuesday/.test(document.getElementById('peTitle').textContent)),vw+': Edit session opens the editor for the made up Tuesday');
 await p.click('#closePe');await p.clock.runFor(200);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),vw+': no horizontal scroll');
 await p.click('#today [data-chg]');await p.clock.runFor(300);{const t=await p.evaluate(()=>[document.getElementById('pickModal').classList.contains('show'),[...document.querySelectorAll('#pickList .lr b')].map(b=>b.textContent)]);ok(t[0]&&t[1].includes('Run + Arms')&&t[1].includes('Rest day'),vw+': Change opens the session picker sheet '+JSON.stringify(t[1]))}
 await p.locator('#pickList .lr',{hasText:'Upper'}).first().click();await p.clock.runFor(400);ok(/Upper/.test(await p.locator('#today .tp-name').textContent()),vw+': picking a session switches the card');
 ok(!p.errs.length,vw+': no page errors '+p.errs.join('|'));await p.close()}
// weigh in done: greyed card at the bottom
{const p=await open(390,{bw_8:'156.6 lb',bw_8d2:'156.2 lb'});
 const r=await p.evaluate(()=>{const k=[...document.querySelectorAll('#today>*')];const d=document.querySelector('#today .td-bwdone');return{last:k[k.length-1]===d,txt:d&&d.innerText.replace(/\s+/g,' '),due:!!document.querySelector('#today .td-bw')}});
 ok(r.last&&!r.due&&/Weighed in ✓ 156.2 lb/.test(r.txt)&&/−0.4 vs Mon/.test(r.txt),'logged weigh in moves to the bottom, greyed, with the change '+r.txt);
 await p.click('[data-bwopen]');await p.clock.runFor(400);ok(await p.evaluate(()=>document.getElementById('dashModal').classList.contains('show')),'tapping it opens the body weight sheet');await p.close()}
// a planned day not logged yet in this week: To do row at the top of the list, opens Plan on that day
{const p=await b.newPage({viewport:{width:390,height:844}});await p.clock.install({time:new Date('2026-11-17T18:00:00')});
 await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2','[]')});await p.goto(URL);await p.clock.runFor(5000);
 const t=await p.locator('#today .td-list .lr').first().innerText();ok(/Legs lift \+ EMOM · Mon/.test(t)&&/To do/.test(t),'unlogged Monday is a To do row '+t.replace(/\n/g,' | '));
 await p.locator('[data-ndjump]').first().click();await p.clock.runFor(600);
 ok(await p.evaluate(()=>document.getElementById('plan').classList.contains('active')&&!!document.querySelector('#days .day-card.open[data-day=Mon]')),'tapping it opens Plan on that day');await p.close()}
{const p=await open(390);await p.evaluate(()=>{window.COACH={week:8,athletes:{fred:{plan:{'8':{tue:{text:'4 x 1 km @ 10k pace of about 5:45/km, 90 s rest\nLegs: 10 burpee broad jumps before rep 2, 20 m sandbag lunges before rep 4\nThen arms block A: Lateral raises 4x12-15, incline DB curls 4x8-12, overhead triceps ext 3x10, hanging leg raises 3x10-12',why:'test'}}}}}};refreshViews()});await p.clock.runFor(300);const r=await p.evaluate(()=>{const e=document.querySelector('#today .td-session .exercise'),x={name:e.querySelector('.ex-name').textContent,chips:[...e.querySelectorAll('.chips>*')].map(c=>c.textContent)};const card=document.querySelector('#today .td-session').getBoundingClientRect(),rows=[...document.querySelectorAll('#today .td-session .exercise .ex-st,#today .td-session .exercise .ibtn')].map(e=>e.getBoundingClientRect());return{name:x.name,chips:x.chips,inside:rows.every(q=>q.left>=card.left+8&&q.right<=card.right-8),g:(()=>{const g=document.querySelector('#today .td-gimp');return g?Math.round(g.getBoundingClientRect().width):0})(),cw:Math.round(card.width)}});
 ok(!/of|about/i.test(r.name)&&r.chips.includes('5:45/km'),'coach text "of about 5:45/km" becomes a pace chip, not the name '+r.name+' '+JSON.stringify(r.chips));
 ok(r.inside,'tick circles and info buttons stay inside the card');await p.close()}
{const p=await open(390);await p.evaluate(()=>showView('plan'));await p.clock.runFor(400);await p.locator('#days .day-card[data-day=Wed] .day-head').click();await p.clock.runFor(300);await p.locator('#days .day-card[data-day=Wed] [data-other]').click();await p.clock.runFor(400);
 const t=await p.evaluate(()=>[document.getElementById('pickModal').classList.contains('show'),[...document.querySelectorAll('#pickList .lr b')].map(b=>b.textContent),document.getElementById('log').classList.contains('active')]);
 ok(t[0]&&!t[2]&&t[1].includes('Hockey')&&t[1].includes('Run')&&t[1].includes('Rest day')&&t[1].includes('Upper + EMOM')&&!t[1].includes('Legs lift + EMOM')===false,'Log something else opens the picker (presets, Hockey, Run, Rest), not the form '+JSON.stringify(t[1]));
 await p.locator('#pickList .lr',{hasText:/^Run/}).last().click();await p.clock.runFor(400);
 ok(await p.evaluate(()=>!$('finish').hidden&&!$('finRunWrap').hidden&&finPayload.session==='Other'),'Run asks for distance and time in the finish sheet');
 await p.click('#finBack');await p.clock.runFor(200);await p.click('#addSession');await p.clock.runFor(400);ok(await p.evaluate(()=>document.getElementById('pickModal').classList.contains('show')),'+ Add session opens the same picker');await p.close()}
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
