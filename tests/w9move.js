// v214: week 9 moves by default for Fred and Will (Fri session on Wed, sim on Fri); a stored mv-9 wins; Grady untouched. node tests/w9move.js
const {chromium}=require('playwright'),path=require('path');let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,who)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));await p.addInitScript(w=>{localStorage.setItem('hrx_active_athlete',w);localStorage.setItem('hrx_migrated','1')},who);await p.clock.install({time:new Date(t)});await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.clock.runFor(4500);return p};
for(const who of ['fred','will']){
 let p=await open('2026-11-23T09:00:00',who);
 ok(await p.evaluate(w=>JSON.stringify(mvMap(9,w)),who)==='{"Fri":"Wed","Sat":"Fri"}',who+': default week 9 moves');
 await p.evaluate(()=>showView('plan'));await p.clock.runFor(400);
 const row=d=>p.locator(`.day-card[data-day=${d}] .day-head`).innerText();
 const wed=await row('Wed'),fri=await row('Fri'),sat=await row('Sat');
 ok(/Upper/.test(wed)&&/Moved from Fri/.test(wed),who+' Wednesday row: '+wed.replace(/\n/g,' | '));
 ok(/Sim/i.test(fri)&&/Moved from Sat/.test(fri),who+' Friday row: '+fri.replace(/\n/g,' | '));
 ok(/Moved to Fri/.test(sat),who+' Saturday row: '+sat.replace(/\n/g,' | '));
 ok(await p.evaluate(()=>mvMap(10,athlete)&&Object.keys(mvMap(10,athlete)).length===0),who+': week 10 has no moves');
 await p.close();
 p=await open('2026-11-25T09:00:00',who);
 const t=await p.locator('#today .td-session').first().innerText();
 ok(/Upper \+ arms/.test(await p.locator('#today .tp-name').first().innerText())&&/Moved from Fri/.test(t)&&!/EMOM \d|Finisher/.test(t),who+' Wednesday Today: upper session, no EMOM · '+t.replace(/\n/g,' | ').slice(0,160));
 await p.close();
 p=await open('2026-11-27T13:00:00',who);
 const t2=await p.locator('#today .td-session').first().innerText();
 ok(/Sim/i.test(t2)&&/Moved from Sat/.test(t2),who+' Friday Today: the sim · '+t2.replace(/\n/g,' | ').slice(0,120));
 await p.evaluate(()=>mvStore(9,'Sat',''));
 ok(await p.evaluate(()=>JSON.stringify(mvMap(9,athlete)))==='{"Fri":"Wed"}',who+': Move it back on the sim keeps the other move');
 await p.evaluate(()=>{mvStore(9,'Fri','')});
 ok(await p.evaluate(()=>JSON.stringify(mvMap(9,athlete)))==='{}',who+': both moved back stays empty (stored key wins)');
 await p.close();
}
const p=await open('2026-11-23T09:00:00','grady');ok(await p.evaluate(()=>JSON.stringify(mvMap(9,'grady')))==='{}','grady: no default moves');await p.close();
ok(!errs.length,'no page errors '+errs.join(' ; '));await b.close();if(f){console.log(f+' FAILED');process.exit(1)}console.log('ALL OK')})();
