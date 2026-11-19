// Plan tab in the E design (v161): header on the ground, stacked season bars, stats on the ground, list rows. node tests/grid.js
// Clock pinned to Wed Nov 18 2026 (week 8, day 3). Replaces the v157 bar tests and tests/header.js.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
// week 7: Mon, Tue, Fri, Sat done (hockey missed); week 6: all 5; week 8: Mon done at RPE 9 for 70 min, Tue rest day
const LOGS=[L('a','2026-11-09','Mon: Lower + sled'),L('b','2026-11-10','Tue: Run + arms A',{distance:5}),L('c','2026-11-13','Fri: Upper + erg + arms B'),L('d','2026-11-14','Sat: HYROX sim',{distance:4}),
 L('e','2026-11-02','Mon: Lower + sled'),L('f','2026-11-03','Tue: Run + arms A'),L('g','2026-11-05','Thu: Hockey'),L('h','2026-11-06','Fri: Upper + erg + arms B'),L('i','2026-11-07','Sat: HYROX sim'),
 L('j','2026-11-16','Mon: Lower + sled',{duration:70,rpe:9}),L('k','2026-11-17','Rest day',{duration:0,rpe:null})];
let fails=0;const ok=(c,n)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+n)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w=390,logs=LOGS)=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},logs);
 await p.clock.install({time:new Date('2026-11-18T10:00:00')});await p.goto(URL);await p.clock.runFor(4500);await p.evaluate(()=>showView('plan'));await p.clock.runFor(400);return p};
let p=await open();
const order=await p.evaluate(()=>[...document.querySelectorAll('#plan>*')].filter(e=>!e.classList.contains('modal')&&getComputedStyle(e).display!=='none').map(e=>e.id));
ok(JSON.stringify(order)==='["seasonBar","weekTrack","days","addSession"]','Plan order: header and bars, stats, day list, add session '+order);
ok(await p.locator('.week-nav').isHidden()&&await p.locator('.td-strip').count()===0,'no week pills and no horizontal week strip on the page');
const h=await p.evaluate(()=>({w:document.querySelector('.pv-w').textContent,ph:document.querySelector('.pv-ph').textContent,bg:getComputedStyle(document.getElementById('seasonBar')).backgroundColor}));
ok(h.w==='Week 8 / 27'&&h.ph==='Base phase'&&/rgba\(0, 0, 0, 0\)|transparent/.test(h.bg),'header on the ground: Week 8 / 27, Base phase '+JSON.stringify(h));
const sum=await p.evaluate(()=>{const S=seasonSum(seasonWeeks('fred'));return{S,t:document.querySelector('.pv-sum').textContent}});
ok(sum.S.pl===35&&sum.S.dn===9&&sum.S.miss===26&&/26%/.test(sum.t)&&!/of 35/.test(sum.t)&&/26 missed/.test(sum.t),'summary counts only ended weeks: 9 of 35, 26%, 26 missed '+sum.t);
const cols=await p.evaluate(()=>[...document.querySelectorAll('.pv-stk .sb-wk')].map(c=>[c.querySelectorAll('.sd').length,c.querySelectorAll('.sm').length,c.querySelectorAll('.su').length,c.className.replace('sb-wk ','')]));
ok(cols.length===27,'27 week columns');
ok(JSON.stringify(cols[5].slice(0,3))==='[5,0,0]'&&JSON.stringify(cols[6].slice(0,3))==='[4,1,0]','week 6 five done, week 7 four done and one missed '+JSON.stringify(cols.slice(5,7)));
ok(cols[7][0]===1&&cols[7][1]===0&&cols[7][2]===4&&/cur/.test(cols[7][3]),'current week never shows missed: 1 done, 4 to do (Tue rest stays to do) '+JSON.stringify(cols[7]));
ok(/fut/.test(cols[10][3])&&/fin/.test(cols[26][3]),'future stubs and the Brisbane bar');
{const t=await p.locator('.pv-fl').innerText(),d=await p.evaluate(()=>raceDays(RACES[0]));ok(t.replace(/\s+/g,' ').trim()===d+' days to Brisbane','countdown above the Brisbane bar: '+t)}
// stats on the ground
const st=await p.evaluate(()=>[...document.querySelectorAll('#weekTrack .pstx>div')].map(d=>d.innerText.replace(/\s+/g,' ').trim()));
ok(st.length===3&&/^Sessions 1 \/ 5 1 behind$/.test(st[0])&&/^Run 0 \/ \d+(\.\d)? km Behind$/.test(st[1])&&/^Load i 630 \/ [\d.]+k (On track|Light)$/.test(st[2]),'Sessions, Run, Load with status tags '+JSON.stringify(st));
ok(await p.evaluate(()=>getComputedStyle(document.getElementById('weekTrack')).backgroundColor)==='rgba(0, 0, 0, 0)','stats sit on the background, no white card');
await p.click('[data-linfo]');await p.clock.runFor(300);
const li=await p.evaluate(()=>({show:document.getElementById('infoModal').classList.contains('show'),t:document.getElementById('infoTitle').textContent,rows:[...document.querySelectorAll('#infoBody .ld-r')].map(r=>r.innerText.replace(/\s+/g,' '))}));
ok(li.show&&li.t==='How load works'&&/Mon Legs lift \+ EMOM 70 min × RPE 9 630/.test(li.rows[0])&&li.rows.some(r=>/Run \+ Arms .*still to do/.test(r))&&li.rows.some(r=>/^Thu Hockey/.test(r)),'Load info sheet shows the rule and each day '+JSON.stringify(li.rows));
await p.click('#closeInfo');await p.clock.runFor(200);
await p.click('[data-sinfo]');await p.clock.runFor(200);ok(/Sessions done/.test(await p.locator('#infoTitle').textContent())&&/same week counts as done/.test(await p.locator('#infoBody').innerText()),'sessions info explains the count and the make up rule');await p.click('#closeInfo');
// week notes sheet holds the week picker
await p.click('[data-wknotes]');await p.clock.runFor(300);
ok(await p.evaluate(()=>document.getElementById('wkModal').classList.contains('show')&&/deload moved/.test(document.getElementById('weekHero').textContent)&&!!document.querySelector('#wkModal #weekJump')),'Week notes opens the week sheet with focus, notes and the week picker');
await p.evaluate(()=>document.getElementById('nextWeek').click());await p.clock.runFor(300);
ok(await p.locator('.pv-w').textContent()==='Week 9 / 27','arrows in the sheet change week');
await p.evaluate(()=>document.getElementById('wkModal').classList.remove('show'));
// tap a bar, back to this week
await p.click('.pv-stk .sb-wk[data-wk="6"]');await p.clock.runFor(300);
ok(await p.locator('.pv-w').textContent()==='Week 6 / 27'&&await p.locator('[data-wkback]').count()===1,'tapping a bar opens that week and shows Back to this week');
ok(/Complete/.test(await p.locator('#weekTrack').innerText()),'an ended full week says Complete');
await p.click('.pv-stk .sb-wk[data-wk="7"]');await p.clock.runFor(300);
ok(await p.locator('#days .day-card[data-day=Thu] .dr-st').textContent()==='Missed'&&/1 missed/.test(await p.locator('#weekTrack').innerText()),'ended week: hockey row Missed, Sessions 1 missed');
await p.click('[data-wkback]');await p.clock.runFor(300);ok(await p.locator('.pv-w').textContent()==='Week 8 / 27','Back to this week');
// rows
const rows=await p.evaluate(()=>[...document.querySelectorAll('#days .day-card')].map(c=>[c.dataset.day,c.classList.contains('past'),c.classList.contains('istoday'),c.querySelector('.dr-st').textContent]));
ok(rows[0][1]&&rows[1][1]&&!rows[2][1]&&rows[2][2]&&!rows[3][1],'Mon and Tue greyed as past, Wed marked today '+JSON.stringify(rows));
ok(rows[0][3]==='Done'&&rows[1][3]==='Rest','status words without pills');
await p.waitForTimeout(500);const bgs=await p.evaluate(()=>['Mon','Wed','Thu'].map(d=>getComputedStyle(document.querySelector(`#days .day-card[data-day=${d}]`)).backgroundColor));
ok(bgs[0]!==bgs[2]&&bgs[1]!==bgs[2],'past and today rows have their own backgrounds '+bgs);
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');await p.close();
// make up: Monday's session logged on Wednesday counts for the week
p=await open(390,[L('m','2026-11-18','Mon: Lower + sled')]);
ok(/^Sessions 1 \/ 5 1 behind/.test((await p.locator('#weekTrack .pstx>div').first().innerText()).replace(/\s+/g,' ')),'a session made up on another day of the week counts as done (Tue still due)');
ok(await p.locator('#days .day-card[data-day=Mon] .dr-st').textContent()==='Moved','Monday row says Moved');await p.close();
p=await open(360);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=360),'no overflow at 360');await p.close();
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(fails?fails+' failed':'ALL OK');process.exit(fails?1:0)})();
