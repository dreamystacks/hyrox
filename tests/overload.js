// v98: heavier carries and short heavy sled pushes in the plan, sled cap follows the plan, sled card shows plates + empty sled = total. node tests/overload.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});
await p.clock.install({time:new Date('2026-10-17T09:00:00')});await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
const r=await p.evaluate(()=>{const it=n=>sessionItems('Mon',rawFor(PLAN[n-1],'mon','Mon'),PLAN[n-1]).find(i=>i.emom).emom.moves;const carry=n=>wtInfo(it(n).find(m=>m.keys[0]==='carry').t).plan;
 return{c5:carry(5),c9:carry(9),c15:carry(15),c22:carry(22)===null||carry(22)===24,o9:sledOver('sledpush',9,'emom'),o15:sledOver('sledpush',15,'emom'),p15:sledOver('sledpull',15,'emom'),o22:sledOver('sledpush',22,'emom'),sim:sledOver('sledpush',15,'sim')}});
ok(r.c5===28&&r.c9===32&&r.c15===30,'carries above race weight: 28, 32, 30 kg per hand in weeks 5, 9, 15 ('+[r.c5,r.c9,r.c15]+')');
ok(r.c22,'week 22 back to race weight');
ok(r.o9===1&&r.o15===1.1&&r.p15===1.1&&r.o22===1&&r.sim===1,'sled cap: 110% in weeks 15 to 21 Monday only, race weight elsewhere');
await p.evaluate(()=>{localStorage.setItem(k('sledcfg'),JSON.stringify({sledpush:{kg:100/2.2046226218,plates:{45:2,25:2,10:1}}}))});
const h=await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=sledHTML('sledpush','lb','Mon',3);return d.querySelector('.sl-tot2').innerText.replace(/\s+/g,' ')});
ok(/Plates ?150 lb ?\+ ?Empty sled ?100 lb ?= ?Total ?250 lb/.test(h),'sled card reads plates + empty sled = total: '+h);
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
