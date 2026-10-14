// v81: an extra workout logged on a plan day shows as "Extra workout", and Fred's Oct 12 push day is moved off the Monday plan session. node tests/offplan.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-14T14:00:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([
{id:'m1',date:'2026-10-12',week:3,session:'Mon: Lower + sled',duration:50,rpe:6,notes:'Extra push + biceps day. Echo bike 100 cal, smith incline, shoulder press, hammer curls\nLoads (lb): Hammer curl 30',savedAt:'2026-10-12T22:00:00Z',updatedAt:'2026-10-12T22:00:00Z'},
{id:'t1',date:'2026-10-13',week:3,session:'Mon: Lower + sled',duration:45,rpe:7,notes:'Workout 45:00\nLoads (lb): Trap-bar deadlift 225 (3/3)',savedAt:'2026-10-13T22:00:00Z',updatedAt:'2026-10-13T22:00:00Z'}]))});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
const L=await p.evaluate(()=>getLogs('fred'));ok(L.find(x=>x.id==='m1').session==='Other','Oct 12 push day moved to Other');ok(L.find(x=>x.id==='t1').session==='Mon: Lower + sled','Tuesday legs log untouched');
ok(await p.evaluate(()=>Object.keys(load(DIRTY,{})).some(k=>k==='logs|fred|m1')),'fix is queued for sync');
await p.evaluate(()=>showView('plan'));await p.clock.runFor(800);
const cards=await p.evaluate(()=>[...document.querySelectorAll('.day-card')].slice(0,2).map(c=>c.querySelector('.day-head').innerText.replace(/\s+/g,' ')));
ok(/Extra workout/.test(cards[0])&&/Planned: Legs lift \+ EMOM/.test(cards[0])&&/moved to Tue/.test(cards[0]),'Monday card: Extra workout, Planned: Legs lift + EMOM · moved to Tue: '+cards[0]);
ok(/Legs lift \+ EMOM/.test(cards[1])&&/Planned: Run \+ Arms/.test(cards[1]),'Tuesday card: Legs lift + EMOM, Planned: Run + Arms: '+cards[1]);
const opt=await p.evaluate(()=>[...document.querySelectorAll('#session option')].map(o=>o.text));ok(opt.includes('Extra workout (not in the plan)')&&opt.includes('Mon plan: Legs lift + EMOM'),'log form options use plan names and offer Extra workout');
await p.screenshot({path:OUT+'/offplan.png'});ok(!errs.length,'no page errors '+errs.join('|'));
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
