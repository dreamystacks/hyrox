// v110: biceps block. Tue incline curls 4x8-12 (3x8-12 deload) from week 5, Fri arms block B adds Bayesian cable curls
// and hammer curls 3x10-12 from week 4. Plan text, Today rows, Plan card, workout rows, guide, Loads line, suggestion, coach prompt.
// node tests/biceps.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs=[])=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(([lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_unit_v2',JSON.stringify('lb'));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},[logs]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-10-23T07:00:00');
const pl=await p.evaluate(()=>PLAN.map(w=>[w.week,(w.tue.match(/incline DB curls ([\dx-]+)/)||[])[1],/Bayesian cable curls 3x10-12, hammer curls 3x10-12/.test(w.fri)]));
ok(pl.filter(x=>x[0]<=3).every(x=>x[1]==='3x10'&&!x[2]),'weeks 1 to 3 unchanged (history)');
ok(pl.filter(x=>x[0]>=5&&x[0]<=24).every(x=>x[1]===([8,12,16,20].includes(x[0])?'3x8-12':'4x8-12')),'Tuesday incline curls 4x8-12, 3x8-12 in deloads, weeks 5 to 24');
ok(pl.filter(x=>x[0]>=4&&x[0]<=24).every(x=>x[2]),'Friday adds Bayesian and hammer curls, weeks 4 to 24');
ok(pl.filter(x=>x[0]>=25).every(x=>!x[2]),'taper weeks 25 to 27 unchanged');
// Today Friday
const td=await p.locator('#today').innerText();ok(/Bayesian cable curls\s*3×10-12/.test(td)&&/Hammer curls\s*3×10-12/.test(td),'Today Friday rows show both curls');
// Plan card
await p.evaluate(()=>{currentWeek=4;showView('plan')});await p.clock.runFor(400);
const fr=await p.locator('.day-card[data-day=Fri]').evaluate(c=>c.textContent);ok(/6 lifts \+ EMOM 12′/.test(fr),'Plan Friday sheet structure line: 6 lifts + EMOM 12′');
await p.locator('.day-card[data-day=Fri] .day-head').click();await p.clock.runFor(300);ok(/Bayesian cable curls/i.test(await p.locator('.day-card[data-day=Fri]').textContent()),'Plan open Friday card lists the Bayesian curl');
// guide
await p.evaluate(()=>showView('today'));await p.clock.runFor(300);
ok(await p.evaluate(()=>{const it=sessionItems('Fri',rawFor(PLAN[3],'fri','Fri'),PLAN[3]).find(i=>/Bayesian/.test(i.title));return it.keys[0]==='bayescurl'&&!!GUIDES.bayescurl&&guideKeys(it.title).includes('bayescurl')}),'Bayesian curl maps to its guide');
// workout
await p.evaluate(()=>startWorkout(4,4,'2026-10-23'));await p.clock.runFor(600);
const rows=await p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#workout .wo-item.sets')].map(e=>[e.querySelector('b').textContent,e.querySelectorAll('.st-r[data-row]').length])));
ok(rows['Bayesian cable curls']===3&&rows['Hammer curls']===3,'workout: both curls have 3 set rows '+JSON.stringify(rows));
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');
const bi=p.locator('#workout .wo-item.sets',{hasText:'Bayesian'});await bi.locator('input[data-wt]').fill('30');await p.clock.runFor(200);for(let n=0;n<3;n++){await p.locator('#workout .wo-item.sets',{hasText:'Bayesian'}).locator('button.st-ck[data-set]').nth(n).evaluate(b=>b.click());await p.clock.runFor(300)}
const notes=await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return window.__p.notes});
ok(/Bayesian cable curl 30/.test(notes),'Loads line writes Bayesian cable curl 30 · '+(notes.match(/Loads[^\n]*/)||[''])[0]);
await p.close();
// next Friday suggestion builds on it
p=await open('2026-10-30T07:00:00',[{id:'f4',athlete:'fred',date:'2026-10-23',week:4,session:'Fri: Upper + erg + arms B',duration:60,rpe:7,notes:'Loads (lb): Bayesian cable curl 30 (3/3 · RIR 2) · Hammer curl 30 (3/3 · RIR 2)',updatedAt:'2026-10-23T20:00:00Z',savedAt:'2026-10-23T20:00:00Z'}]);
const sg=await p.evaluate(()=>[suggestLoad('bayescurl',5),suggestLoad('hammercurl',5)].map(x=>x&&x.kg));
ok(sg[0]>30&&sg[1]>30,'week 5 suggests more on both curls after RIR 2: '+JSON.stringify(sg));
ok(/Bayesian cable curls/.test(await p.locator('#today').innerText()),'Today week 5 Friday still lists it');await p.close();
// Tuesday week 5
p=await open('2026-10-27T07:00:00');await p.evaluate(()=>startWorkout(5,1,'2026-10-27'));await p.clock.runFor(600);
ok(await p.evaluate(()=>{const it=[...document.querySelectorAll('#workout .wo-item.sets')].find(e=>/Incline/i.test(e.innerText));return it.querySelectorAll('.st-r[data-row]').length})===4,'Tuesday week 5 incline curls 4 sets');await p.close();
ok(/Biceps block \(plan change Oct 20/.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains the biceps block');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
