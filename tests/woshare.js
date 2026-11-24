// v223 shareable report card (Fred, Nov 24): Share report card button on non sim sessions, 1080x1920 image, Share hands a png,
// Calories section has no duplicate total pill, sims keep the Sim report button. node tests/woshare.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const LOG={id:'1795900000000',date:'2026-11-24',session:'Tue: Run + arms A',duration:80,rpe:8,knee:0,distance:6,pace:'5:39',stations:'',notes:'Workout 80:00 · 6/6 exercises done\nRuns: 5:46 / 5:39 / 5:41 / 5:46 / 5:45 / 5:14\nLegs done: before rep 2 24 m sandbag lunges (2×12 m) · before rep 4 24 m sandbag lunges (2×12 m)\nLoads (lb): EZ bar preacher curl 45 (4/4 · RIR 2) · Lateral raise 20 (3/3) · Triceps pushdown 50 (3/3)\nGarmin: 111+222 · Strength + Indoor Running · avg HR 142 · max HR 178 · 733 kcal · 80 min',updatedAt:'2026-11-24T22:00:00Z'};
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_gcal_v2',JSON.stringify({111:131,222:602}));localStorage.setItem('hrx_fred_gmin_v2',JSON.stringify({111:34,222:46}))},[LOG]);
await p.addInitScript(()=>{window.__shared=null;navigator.canShare=()=>true;navigator.share=d=>{window.__shared=d.files[0]&&d.files[0].type+'|'+d.files[0].name;return Promise.resolve()}});
await p.clock.install({time:new Date('2026-11-24T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);
const cal=await p.evaluate(()=>{const s=[...document.querySelectorAll('#today .rc-sec')].find(e=>/Calories/.test(e.querySelector('.rc-sh')?.innerText||''));return s?s.querySelector('.rc-sh').innerText.replace(/\s+/g,' ').trim():null});
ok(cal==='Calories','Calories section head has no duplicate total: '+cal);
ok(await p.locator('#today [data-woshare]').count()===1,'Today report card has Share report card');
await p.click('#today [data-woshare]');await p.clock.runFor(1500);
ok(await p.evaluate(()=>$('simCmpModal').classList.contains('show')&&$('simCmpTitle').textContent==='Report card'),'sheet opens titled Report card');
const dim=await p.evaluate(()=>simCmpCur.cv&&[simCmpCur.cv.width,simCmpCur.cv.height]);ok(dim&&dim[0]===1080&&dim[1]>=1920,'image 1080 wide, at least 1920 tall: '+dim);
await p.click('#simShare');await p.clock.runFor(500);await p.waitForFunction(()=>window.__shared,null,{timeout:3000}).catch(()=>{});ok(/^image\/png\|hyrox-2026-11-24\.png$/.test(await p.evaluate(()=>window.__shared)||''),'Share hands a png: '+await p.evaluate(()=>window.__shared));
const png=await p.evaluate(()=>simCmpCur.cv.toDataURL('image/png'));fs.writeFileSync('/tmp/woshare.png',Buffer.from(png.split(',')[1],'base64'));
// sims keep the sim report, not the share button
const sim=await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=reportCard({id:'9',date:'2026-11-21',session:'Sat: HYROX sim',duration:50,notes:'Sim week 9 · total 34:12\nRuns: 6:00 / 6:10'},{mine:true});return[!!d.querySelector('[data-simcmp]'),!!d.querySelector('[data-woshare]')]});
ok(sim[0]&&!sim[1],'sim card keeps Sim report, no extra share');
const rest=await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=reportCard({id:'8',date:'2026-11-23',session:'Rest day',duration:0,notes:''},{mine:true});return!!d.querySelector('[data-woshare]')});ok(!rest,'no share on a rest day');
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
