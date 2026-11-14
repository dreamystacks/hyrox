// v139 leg endurance (Fred, Nov 7: burpee broad jumps and sandbag lunges kill his legs, then the next run). For everyone:
// Monday weeks 7 to 21 DB walking lunges replace hack squat / RDL (12 kg per hand to week 11, 15 kg from week 13, 2 sets in deloads and week 11);
// Tuesday intervals in weeks 7, 9, 10, 14, 17, 21, 22, 23 add burpee broad jumps before rep 2 and sandbag lunges before rep 4;
// station volume Fridays (7, 10, 14, 17, 22) add 100 m sandbag lunges. node tests/legs.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,who='fred')=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(w=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1');localStorage.setItem(`hrx_${w}_unit_v2`,JSON.stringify('lb'))},who);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-11-09T08:00:00');
const d=await p.evaluate(()=>PLAN0.map(w=>({n:w.week,mon:w.mon,tue:w.tue,fri:w.fri})));
const W=n=>d[n-1];
ok(d.filter(x=>x.n>=7&&x.n<=21).every(x=>/DB walking lunges 1[25] kg per hand [23] x 20 m\./.test(x.mon)&&!/Hack squat|RDL/.test(x.mon)),'Mondays 7 to 21: DB walking lunges, no hack squat or RDL');
ok(/Hack squat/.test(W(6).mon)&&/DB walking lunges 12 kg per hand 3 x 20 m/.test(W(7).mon)&&/12 kg per hand 2 x 20 m/.test(W(8).mon)&&/12 kg per hand 3 x 20 m/.test(W(11).mon)&&/15 kg per hand 3 x 20 m/.test(W(15).mon)&&/15 kg per hand 2 x 20 m/.test(W(20).mon),'loads and sets by week (deloads 2 sets; week 11 back to 3, v146 no Nashville race)');
const TW=[7,9,10,14,17,21,22,23];ok(d.every(x=>/\nLegs: 10 burpee broad jumps before rep 2, 20 m sandbag lunges before rep 4\n/.test(x.tue)===TW.includes(x.n)),'Tuesday legs line only in weeks '+TW);
const FW=[7,10,14,17,22];ok(d.every(x=>/\nStation volume: sandbag lunges 100 m with (20|25) kg in 4 pieces\.$/.test(x.fri)===FW.includes(x.n))&&/25 kg/.test(W(17).fri)&&/20 kg/.test(W(22).fri),'station volume Fridays add 100 m lunges (25 kg in week 17)');
// parsing
const it=await p.evaluate(()=>({mon:sessionItems('Mon',PLAN[6].mon,PLAN[6]).map(i=>[i.title,i.keys[0],(parseSets(i)||{}).n]),tue:sessionItems('Tue',PLAN[6].tue,PLAN[6]).map(i=>[i.title,i.legsAt]),ws:wtInfo('DB walking lunges 12 kg per hand 3 x 20 m'),nm:exName('dblunge'),sub:daySub('Mon',PLAN[6].mon,PLAN[6],sessionItems('Mon',PLAN[6].mon,PLAN[6]))}));
ok(JSON.stringify(it.mon[1])==='["DB walking lunges 12 kg per hand 3 x 20 m","dblunge",3]','Monday item 2 is DB walking lunges, 3 sets, own key');
ok(it.tue.length===5&&it.tue[0][1][2]==='10 burpee broad jumps'&&it.tue[0][1][4]==='20 m sandbag lunges'&&!it.tue.some(x=>/Legs/.test(x[0])),'Tuesday: legs attached to the intervals, no extra item');
ok(it.ws.plan===12&&it.ws.clean==='DB walking lunges 3 x 20 m'&&it.nm==='DB walking lunge','plan weight 12 kg, clean title, Loads name');
ok(/Lunges/.test(it.sub),'Monday subtitle names Lunges: '+it.sub);
// Today Monday
const td=await p.locator('#today .td-session').innerText();ok(/DB walking lunges[\s\S]{0,40}25 lb[\s\S]{0,10}3×20 m/.test(td),'Today Monday row: name, 25 lb, 3×20 m');
// workout Monday
await p.evaluate(()=>startWorkout(7,0,'2026-11-09'));await p.clock.runFor(600);
const wl=await p.evaluate(()=>{const e=[...document.querySelectorAll('#workout .wo-item.sets')].find(x=>/DB walking/.test(x.innerText));return{v:e.querySelector('[data-wt]').value,ph:!!e.querySelector('.wt-ph'),rows:e.querySelectorAll('.st-r[data-row]').length,t:e.innerText}});
ok(wl.v==='25'&&wl.ph&&wl.rows===3&&/1:00/.test(wl.t),'workout: 25 lb per hand, 3 rows, 1:00 rest');
const notes=await p.evaluate(()=>{window.__p=null;const o=openFinish;openFinish=x=>{window.__p=x};finishWorkout();openFinish=o;return window.__p.notes});
ok(/DB walking lunge 25/.test(notes),'Loads line writes DB walking lunge 25');
await p.evaluate(()=>{closeWorkout();localStorage.removeItem('hrx_fred_workout_v2')});await p.close();
// Tuesday
p=await open('2026-11-10T08:00:00');
ok(/Tired legs: 10 burpee broad jumps before rep 2, 20 m sandbag lunges before rep 4/.test(await p.locator('#today .td-session').innerText()),'Today Tuesday row shows the tired legs line');
await p.evaluate(()=>startWorkout(7,1,'2026-11-10'));await p.clock.runFor(600);
ok(await p.locator('#workout .wo-legs').count()===1,'workout Tuesday: legs line on the intervals');
ok(await p.evaluate(()=>{const x=woState();x.autoNext={parent:'w7-Tue-0',n:2,total:5,rest:90};woSave(x);return restNextTxt()})==='Now: 10 burpee broad jumps · rep 2 of 5 starts by itself','rest card before rep 2 says do the burpees');
ok(await p.evaluate(()=>{const x=woState();x.autoNext={parent:'w7-Tue-0',n:3,total:5,rest:90};woSave(x);return restNextTxt()})==='Rep 3 of 5 starts by itself','rest card before rep 3 unchanged');
await p.evaluate(()=>{closeWorkout();localStorage.removeItem('hrx_fred_workout_v2');currentWeek=7;showView('plan')});await p.clock.runFor(400);
await p.locator('.day-card[data-day=Tue] .day-head').click();await p.clock.runFor(300);ok(/Tired legs/.test(await p.locator('.day-card[data-day=Tue] .day-body').innerText()),'Plan Tuesday sheet shows the legs line');
await p.evaluate(()=>daySheetClose());await p.locator('.day-card[data-day=Fri] .day-head').click();await p.clock.runFor(300);
ok(/Sandbag lunges 100 m/.test(await p.locator('.day-card[data-day=Fri] .day-body').innerText()),'Plan Friday sheet lists the lunge block');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');
await p.close();
p=await open('2026-11-10T08:00:00','will');ok(/Tired legs/.test(await p.locator('#today').innerText()),'Will gets it too');await p.close();
const pr=fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8');ok(/DB walking lunge/.test(pr)&&/Legs:/.test(pr),'coach prompt explains v139');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
