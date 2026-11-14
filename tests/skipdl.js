// v142: Fred's week 8 is a normal week (week 7 was his deload: sick Mon and Tue). Will keeps the deload. node tests/skipdl.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,who)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(w=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1');localStorage.setItem(`hrx_${w}_unit_v2`,JSON.stringify('lb'));localStorage.setItem(`hrx_${w}_logs_v2`,JSON.stringify([{id:'t1',athlete:w,date:'2026-11-02',week:6,session:'Mon: Lower + sled',duration:50,rpe:8,notes:'Loads (lb): Trap-bar deadlift 225 (3/3 · RIR 1)',updatedAt:'2026-11-02T20:00:00Z',savedAt:'2026-11-02T20:00:00Z'}]))},who);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-11-16T08:00:00','fred');
const d=await p.evaluate(()=>({dl:isDl(8),dl12:isDl(12),f:PLAN[7].focus,mon:PLAN[7].mon===PLAN0[6].mon,tue:PLAN[7].tue===PLAN0[6].tue,fri:PLAN[7].fri,sat:PLAN[7].sat,km:PLAN[7].runKm,segs:simSegments(PLAN[7]).filter(s=>s.kind!=='run').map(s=>s.name||s.label),will:(()=>{viewAthlete='will';const r=[isDl(8),PLAN[7].sat===PLAN0[7].sat];viewAthlete=null;return r})()}));
ok(!d.dl&&d.dl12,'Fred: week 8 not a deload, week 12 still is');
ok(d.mon&&d.tue,'Fred week 8 Monday and Tuesday are week 7 (missed)');
ok(/^Weighted pull ups 3 x 5, DB bench 3 x 8\./.test(d.fri)&&!/80%/.test(d.fri)&&/Wall ball technique 2 x 10\.\nFinisher: EMOM 16 min/.test(d.fri),'Fred week 8 Friday: normal loads, technique sets, EMOM 16');
ok(/stations 1 to 4/.test(d.sat)&&d.segs.join()==='SkiErg,Sled push,Sled pull,Burpee broad jumps'&&d.km===15,'Fred week 8 Saturday: stations 1 to 4, 15 km');
ok(d.will[0]&&d.will[1],'viewing Will: deload kept');
const td=await p.locator('#today .td-session').innerText();ok(/Heavy/.test(td)&&!/80% of last/.test(td)&&/EMOM 16/.test(td),'Today Monday: heavy, EMOM 16');
{const sg=await p.evaluate(()=>suggestLoad('trap',8,null));ok(sg&&sg.kg>=225,'trap bar suggestion builds on 225, no 80% deload: '+JSON.stringify(sg))}
await p.evaluate(()=>{currentWeek=8;showView('plan')});await p.clock.runFor(400);
const wh=await p.locator('#weekHero').innerText();ok(/deload moved/.test(wh)&&!/Deload\n|Benchmark retest/.test(wh),'Plan week 8 header: new focus, no Deload or Benchmark badge');
await p.close();
p=await open('2026-11-16T08:00:00','will');ok(/80% of last/.test(await p.locator('#today .td-session').innerText()),'Will Monday: deload');await p.close();
ok(/DL_SKIP|week 8 is a normal week/i.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains it');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
