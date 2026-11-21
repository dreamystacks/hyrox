// v193: per set heart rate. Set ticks are timed (stm in the workout state), finish writes a hidden "Set times @base:" line, an import with the watch hr5 stream adds "Set HR:" (peak from 40 s before to 15 s after each tick), and the report card shows ♥ per set under each exercise. node tests/sethr.js
const {chromium}=require('playwright'),path=require('path');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.clock.install({time:new Date('2026-11-20T19:00:00')});await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.clock.runFor(4500);
await p.evaluate(()=>startWorkout(8,4,'2026-11-20'));await p.clock.runFor(600);
// tick 3 sets of the first loaded item through the real handler path
const r=await p.evaluate(()=>{const y=woState(),{items:its,day:d2}=woItems(y);const i=its.findIndex(it=>!it.emom&&loadKey(it)&&parseSets(it));const key=`w${y.week}-${d2}-${i}`;return{key,i,name:exName(loadKey(its[i]))}});
for(let n=1;n<=3;n++){await p.evaluate(([key,n])=>{workPhase=null;restEnd=0;completeSet(key+'-s'+n,key,3,90,n)},[r.key,n]);await p.clock.runFor(150000)}
const stm=await p.evaluate(k=>woState().stm[k],r.key);ok(stm&&Object.keys(stm).length===3,'three set times stored');
await p.evaluate(()=>finishWorkout());await p.clock.runFor(300);
const notes=await p.evaluate(()=>finPayload.notes);const line=(notes.match(/^Set times @.*$/m)||[])[0]||'';
ok(new RegExp('^Set times @\\d{10}: '+r.name+' 0/150/300$').test(line),'Set times line: '+line);
// hr stream: 125 at rest, 160 around each tick
const base=+line.match(/@(\d+)/)[1],t0=base-300,v=[];for(let t=t0;t<base+600;t+=5){const near=[0,150,300].some(s=>t>=base+s-20&&t<=base+s+5);v.push(near?160:125)}
const hr5=t0+'|'+v.join(',');const sh=await p.evaluate(([n,h])=>setHRLine(n,h),[notes,hr5]);ok(sh==='Set HR: '+r.name+' 160/160/160','Set HR line: '+sh);
ok(await p.evaluate(()=>NOTE_HIDE.test('Set times @1: x')&&NOTE_HIDE.test('Set HR: x')),'both lines hidden from Notes');
// report card chip
await p.evaluate(([n,sh,nm])=>{const x={id:77,date:'2026-11-20',session:'Fri: Upper + erg + arms B',duration:60,rpe:7,notes:n.replace(/^Loads.*$/m,'')+'\nLoads (lb): '+nm+' 60 (3/3)\n'+sh,savedAt:'2026-11-20T20:00:00'};putLog(x);refreshViews()},[notes,sh,r.name]);await p.clock.runFor(400);
ok(/♥ 160 · 160 · 160/.test(await p.locator('#today .rc-shr').first().textContent().catch(()=>'')),'report card shows ♥ per set');
// merge keeps both streams
ok(await p.evaluate(()=>gimpMerge([{id:1,start:'a',hr5:'10|1,2'},{id:2,start:'b',hr5:'20|3'}]).hr5==='10|1,2;20|3'),'combined import keeps both heart rate streams');
ok(!errs.length,'no page errors '+errs.join('|'));console.log(f?f+' FAILED':'ALL OK');await b.close();process.exit(f?1:0)})();
