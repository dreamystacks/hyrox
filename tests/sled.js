// Sled suggestions check: node tests/sled.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Two contexts: Monday EMOM (progression from the last EMOM load, feel 20+ / 10-20 / missed, deload 80%, coach override) and
// Saturday sim (percent of race weight from the plan text). Builds use an empty sled of 100 lb plus 45, 25 and 10 lb plates.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
const L=(id,date,session,extra={})=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes:'',savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z',...extra});
const MON=(st,lb=190)=>L('m','2026-09-28','Mon: Lower + sled',{notes:`Workout 45:00\nLoads (lb): Sled push ${lb} (${st})`});
const SAT=L('s','2026-10-03','Sat: HYROX sim',{notes:'Workout 60:00\nLoads (lb): Sled push 250 (1/1) · Sled pull 170 (1/1)'});
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async({t,logs=[],cfg,mode='dark',w=390}={})=>{const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.addInitScript(([lg,cf,m])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_mode',m);localStorage.setItem('hrx_fred_unit_v2',JSON.stringify('lb'));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_sledcfg_v2',JSON.stringify(cf))},[logs,cfg||{sledpush:{kg:45.36,plates:{45:1}},sledpull:{kg:45.36,plates:{}}},mode]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
const start=async(p,wk,idx,ds)=>{await p.evaluate(([a,b2,c])=>startWorkout(a,b2,c),[wk,idx,ds]);await p.clock.runFor(600)};
const chip=async(p,sel)=>({sug:(await p.locator(sel+' .sl-sug span').first().innerText()).replace(/\s+/g,' '),why:(await p.locator(sel+' .sl-why').first().innerText()).trim()});
// ---------- Monday EMOM ----------
let p=await open({t:'2026-10-05T07:00:00',logs:[MON('20+')]});await start(p,2,0,'2026-10-05');
check('Monday: last EMOM 190 lb with 20+ s left goes up to the next achievable build, 215 lb',await chip(p,'.emom'),{sug:'Suggested 215 lb · 2 x 45 + 25',why:'last EMOM: 20+ s left'});
check('Monday: the remembered plates were 1 x 45, Use sets 2 x 45 + 25 and the total follows',await p.evaluate(()=>{const before=sledTotal('sledpush','lb');document.querySelector('.emom [data-sluse]').click();return[before,sledTotal('sledpush','lb'),[45,25,10].map(x=>sledCfg('sledpush').plates[x]).join()]}),[145,215,'2,1,0']);
check('Monday: after Use the chip says In use and the plates can still be changed',await p.evaluate(()=>{const inuse=document.querySelector('.emom .sl-sug em')?.textContent;document.querySelector('.emom [data-pl="sledpush|10|1"]').click();return[inuse,sledTotal('sledpush','lb')]}),['In use',225]);
await p.evaluate(()=>{document.querySelector('.emom [data-pl="sledpush|10|-1"]').click()});
check('Monday: the logged total matches sledTotal',await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return[sledTotal('sledpush','lb'),((window.__p.notes.match(/Loads \(lb\): ([^\n]+)/)||[])[1]||'').split(' · ')[0]]}),[215,'Sled push 215 (emom)']);
await p.close();
// ---------- context separation ----------
p=await open({t:'2026-10-05T07:00:00',logs:[MON('20+'),SAT]});await start(p,2,0,'2026-10-05');
check('a logged Saturday sled load never becomes the Monday base (still 215)',await chip(p,'.emom'),{sug:'Suggested 215 lb · 2 x 45 + 25',why:'last EMOM: 20+ s left'});
await p.close();
p=await open({t:'2026-10-05T07:00:00',logs:[MON('10-20')]});await start(p,2,0,'2026-10-05');
check('10 to 20 s left holds the load',await chip(p,'.emom'),{sug:'Suggested 190 lb · 2 x 45',why:'last EMOM: 10 to 20 s left'});await p.close();
p=await open({t:'2026-10-05T07:00:00',logs:[MON('missed')]});await start(p,2,0,'2026-10-05');
check('missed minutes go one increment down (165 lb)',await chip(p,'.emom'),{sug:'Suggested 165 lb · 45 + 2 x 10',why:'last EMOM: missed minutes'});await p.close();
p=await open({t:'2026-10-19T07:00:00',logs:[MON('20+')]});await start(p,4,0,'2026-10-19');
check('deload week: 80% of the last EMOM load, closest without going over',await chip(p,'.emom'),{sug:'Suggested 150 lb · 2 x 25',why:'deload week: 80% of last EMOM load'});await p.close();
p=await open({t:'2026-10-05T07:00:00',logs:[]});await start(p,2,0,'2026-10-05');
check('no EMOM history: sled + 2 x 45',await chip(p,'.emom'),{sug:'Suggested 190 lb · 2 x 45',why:'first time: sled + 2 x 45'});await p.close();
// ---------- Saturday sim ----------
p=await open({t:'2026-10-03T07:00:00',logs:[MON('20+')]});await start(p,1,5,'2026-10-03');
check('Saturday week 1 (75%): push about 245 lb (250 achievable) and pull 170 lb',await p.evaluate(()=>[...document.querySelectorAll('.sim-sled')].map(c=>[c.querySelector('.sl-sug span').textContent.replace(/\s+/g,' '),c.querySelector('.sl-why').textContent])),[['Suggested 250 lb · 2 x 45 + 2 x 25 + 10','75% of race weight'],['Suggested 170 lb · 45 + 25','75% of race weight']]);
check('sim sleds have their own remembered plates, the EMOM config is untouched',await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('hrx_fred_sledcfg_v2'));return[Object.keys(m).sort(),m.sledpush.plates]}),[['sledpull','sledpull:sim','sledpush','sledpush:sim'],{45:1}]);
check('sim sleds were pre-filled from the suggestion (no plates remembered yet)',await p.evaluate(()=>[sledTotal('sledpush:sim','lb'),sledTotal('sledpull:sim','lb')]),[250,170]);
check('the logged sim totals match sledTotal',await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return(window.__p.notes.match(/Loads \(lb\): ([^\n]+)/)||[''])[1]}),'Sled push 250 (0/1) · Sled pull 170 (0/1)');
await p.close();
// ---------- coach override: Monday only ----------
p=await open({t:'2026-10-05T07:00:00',logs:[MON('20+')]});await p.evaluate(()=>{window.COACH={week:1,athletes:{fred:{loads:{sledpush:100,sledpull:60},unit:'kg'}}}});await start(p,2,0,'2026-10-05');
check('coach override applies to the Monday EMOM',await chip(p,'.emom'),{sug:'Suggested 220 lb · 45 + 3 x 25',why:'coach suggestion'});
await p.evaluate(()=>{closeWorkout&&closeWorkout();localStorage.removeItem('hrx_fred_workout_v2')});await p.close();
p=await open({t:'2026-10-03T07:00:00',logs:[]});await p.evaluate(()=>{window.COACH={week:1,athletes:{fred:{loads:{sledpush:100,sledpull:60},unit:'kg'}}}});await start(p,1,5,'2026-10-03');
check('coach override never applies to the sim',await p.evaluate(()=>[...document.querySelectorAll('.sim-sled .sl-why')].map(x=>x.textContent)),['75% of race weight','75% of race weight']);
await p.close();
// ---------- empty sled missing, race cap, screenshot-ready layout ----------
p=await open({t:'2026-10-05T07:00:00',logs:[MON('20+')],cfg:{}});await start(p,2,0,'2026-10-05');
check('no empty sled weight: ask for it, no suggestion chip',await p.evaluate(()=>[document.querySelector('.emom .sl-need')?.textContent,!!document.querySelector('.emom .sl-sug')]),['Enter the empty sled weight to get a suggestion.',false]);
check('never above race weight',await p.evaluate(()=>[plateBuild(100,900,'le',335).total,plateBuild(100,900,'ge',335).total,plateBuild(100,900,'near',227).total]),[335,335,225]);
check('390: no horizontal scroll in the workout',await p.evaluate(()=>{const w=document.getElementById('workout');return w.scrollWidth<=w.clientWidth+1}),true);
await p.close();
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
