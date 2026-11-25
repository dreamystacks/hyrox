// v225 (Fred, Nov 25): first full sim moved from week 9 to week 11 (Sat Dec 12). Week 9 (done Friday Nov 27) is a half sim at race weight,
// stations 1 to 4 at full distance. Fred's Nashville week 11 override is gone. node tests/sim9.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(who,t)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(w=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1')},who);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
for(const who of ['fred','will']){
 const p=await open(who,'2026-11-27T13:00:00');
 const r=await p.evaluate(()=>{const w=PLAN[8];return{sat:w.sat,segs:simSegments(w).map(s=>s.name).join('|'),pct:simPct(w),notes:w.notes,w11:PLAN[10].sat,n11:PLAN[10].notes,lock:[adjLocked(9,'sat'),adjLocked(11,'sat')]}});
 ok(/^Half sim at race weight: 4 x \(1 km \+ stations 1 to 4 full volume\)/.test(r.sat)&&r.segs==='Run 1|SkiErg|Run 2|Sled push|Run 3|Sled pull|Run 4|Burpee broad jumps'&&r.pct===100,who+' week 9 sim: 4 x 1 km + stations 1 to 4, race weight '+r.segs);
 ok(/HALF SIM at race weight Friday/.test(r.notes)&&/Sat Dec 12/.test(r.notes),who+' week 9 notes');
 ok(/^FULL SIM at 85%/.test(r.w11)&&/Dec 12/.test(r.n11)&&r.lock.join()==='true,true',who+' week 11 full sim, both Saturdays locked');
 const td=await p.locator('#today .td-session').innerText();
 ok(/Moved from Sat/.test(td)&&/Full · Stations 1–4/.test(td)&&/Sled push\nFull · 48 m/.test(td)&&/Sled pull\nFull · 48 m/.test(td)&&/Race 1000 m/.test(td)&&/Full · 80 m/.test(td),who+' Today Friday card: full distances, lane rounded sleds');
 await p.close()}
const p=await open('fred','2026-12-12T09:00:00');
const d=await p.evaluate(()=>({sat:PLAN[10].sat,sun:PLAN[10].sun,km:PLAN[10].runKm,segs:simSegments(PLAN[10]).length,td:document.querySelector('#today .td-session')?.innerText||''}));
ok(/^FULL SIM/.test(d.sat)&&/^Easy run/.test(d.sun)&&d.km===21&&d.segs===16&&!/Nashville/.test(d.td),'Fred Dec 12: full sim, 16 parts, no Nashville '+d.segs);
await p.close();
const pr=fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8');ok(/v225/.test(pr)&&/weeks 11, 19, 21, 24/.test(pr),'coach prompt explains the move');
const cj=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../coach.json'),'utf8'));ok(cj.athletes.fred.plan['9'].runKm===17&&cj.athletes.will.plan['9'].runKm===16&&cj.athletes.will.tweaks.some(t=>t.week===11&&t.day==='Sat'),'coach.json week 9 km and Will tweak on week 11');
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
