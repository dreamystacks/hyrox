// v147: the Today card and Plan sheet without duplicate text (no raw plan paragraph, EMOM chips carry weights, short meta line, names without plan weight, coach note clamped)
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++};
for(const W of [390,360]){const p=await b.newPage({viewport:{width:W,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-11-16T19:00:00')});await p.goto('file://'+__dirname+'/../index.html');await p.clock.runFor(5000);
await p.evaluate(()=>{window.COACH={week:7,athletes:{fred:{headline:'x',tweaks:[{day:'Mon',text:'Your EMOM rule stands: keep lunges at 44 lb until you log 10 s or more. The app will offer 250 lb on the sled; if round 1 leaves you 0 to 5 s, hold that weight for the whole EMOM and log the seconds.'}]}}};refreshViews()});await p.clock.runFor(400);
const r=await p.evaluate(()=>{const c=document.querySelector('#today .td-session');const em=[...c.querySelectorAll('.exercise')].find(e=>/EMOM/.test(e.querySelector('.ex-name').textContent));const lu=[...c.querySelectorAll('.ex-name')].find(e=>/walking lunges/i.test(e.textContent));const ct=c.querySelector('[data-ctw]');return{src:c.querySelectorAll('.src-d').length,det:c.querySelectorAll('[data-details]').length,chips:[...em.querySelectorAll('.chips > *')].map(x=>x.textContent),meta:(em.querySelector('.ex-meta')||{}).textContent,exd:em.querySelectorAll('.ex-d').length,lu:lu.textContent,luChip:lu.parentElement.querySelector('.ld').textContent,ctH:ct.getBoundingClientRect().height,ow:document.documentElement.scrollWidth>innerWidth}});
ok(r.src===0,W+' no raw plan text on Today');ok(r.det===0,W+' no Show details when nothing is hidden');
ok(r.chips.some(c=>/Lunges 10\/leg · 22 lb/.test(c))&&r.chips.some(c=>/Farmers carry .* · 2×62 lb/.test(c)),W+' EMOM chips carry weight '+r.chips.join(' | '));
ok(r.exd===0&&/^4 rounds · moderate/.test(r.meta)&&!/:|1\)/.test(r.meta),W+' EMOM meta short: '+r.meta);
ok(r.lu==='DB walking lunges'&&/ \/ hand/.test(r.luChip),W+' lunges title clean, chip '+r.luChip);
ok(r.ctH<70,W+' coach note clamped '+r.ctH);
await p.click('#today [data-ctw]');const h2=await p.evaluate(()=>document.querySelector('#today [data-ctw]').getBoundingClientRect().height);ok(h2>r.ctH,W+' coach note expands');
ok(!r.ow,W+' no overflow');
await p.click('[data-view=plan]');await p.clock.runFor(500);await p.locator('.day-card.dr[data-day=Mon]').first().click();await p.clock.runFor(600);
const s=await p.evaluate(()=>{const c=document.querySelector('.day-card.open');return{src:c.querySelectorAll('.src-d').length,txt:c.textContent}});
ok(s.src===0&&!/Plan text:/.test(s.txt),W+' no Plan text paragraph in the sheet');ok(/22 lb/.test(s.txt)&&/ \/ hand/.test(s.txt),W+' sheet shows weights once');
ok(errs.length===0,W+' no errors '+errs.join(';'));await p.close()}
await b.close();console.log(fail?'FAILED '+fail:'ALL PASS');process.exit(fail?1:0)})();
