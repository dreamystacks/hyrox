// v211: Fred's week 9 (staff party Friday): Friday session without the finisher EMOM, notes, coach override gone, Will unchanged
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});
let ok=true;const f=(c,m)=>{if(!c){ok=false;console.log('FAIL',m)}else console.log('ok',m)};
await p.clock.install({time:new Date('2026-11-25T12:00:00-05:00')});
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.click('[data-who=fred]');await p.clock.runFor(5000);
const r=await p.evaluate(()=>{const w=PLAN[8];return {live:w.fri,items:sessionItems('Fri',w.fri,w).map(x=>x.title),fa:PLAN_ATH.fred[9],wi:PLAN_ATH.will[9]||null,base:PLAN0[8].fri}});
f(r.fa&&!/Finisher/.test(r.fa.fri),'Fred week 9 Friday has no finisher');
f(r.fa&&/Wall ball technique 2 x 10/.test(r.fa.fri),'technique sets kept');
f(r.fa&&/OHP 3 x 5/.test(r.fa.fri)&&/hammer curls/.test(r.fa.fri),'lifts and arms kept');
f(r.fa&&/Staff party/.test(r.fa.notes),'notes explain the moves');
f(!r.wi,'Will week 9 untouched');
f(!/Finisher/.test(r.live)&&!r.items.some(t=>/EMOM/i.test(t)),'live Friday plan for Fred has no EMOM item: '+r.items.join(' | '));
f(!errs.length,'no page errors '+errs.join(';'));
f(/Finisher: EMOM/.test(r.base),'base plan keeps the finisher');
const cj=require('../coach.json');f(!(cj.athletes.fred.plan['9']||{}).fri,'coach Friday override removed');
await b.close();if(!ok)process.exit(1)})();
