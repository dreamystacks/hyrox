// v136 (Fred, Nov 2): EMOM rest left in 5 s steps (0 to 30+, Missed), per move fine tune, Loads line "(15s)", and the
// Monday sled builds toward race weight from week 5 (sim weight floor, no feel = step up, ramp to 100% by week 9). node tests/emfeel.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
const L=(id,date,session,notes)=>({id,athlete:'fred',date,session,duration:60,rpe:7,knee:0,notes,savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z'});
const FRED=[L('m4','2026-10-20','Mon: Lower + sled','Loads (lb): Sled push 190 (emom) · Farmers carry 53 (emom)'),L('s5','2026-10-24','Sat: HYROX sim','Loads (lb): Sled push 250 (1/1) · Sled pull 170 (1/1)')];
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(t,logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_unit_v2',JSON.stringify('lb'));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));localStorage.setItem('hrx_fred_sledcfg_v2',JSON.stringify({sledpush:{kg:45.36,plates:{}},sledpull:{kg:45.36,plates:{}}}))},[logs]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
let p=await open('2026-11-02T17:00:00',FRED);
const sg=await p.evaluate(()=>{const a=sledSuggest('sledpush',6,'Mon');return[Math.round(a.total),a.why]});
ok(sg[0]===250&&/sim weight/.test(sg[1]),'week 6 Monday sled push: 190 for weeks, sim 250 → suggests 250 (sim floor) '+JSON.stringify(sg));
ok(await p.evaluate(()=>feelCat('25s')==='20+'&&feelCat('15s')==='10-20'&&feelCat('5s')==='low'&&feelCat('missed')==='missed'),'feelCat maps seconds');
// workout: EMOM done, dock asks seconds
await p.evaluate(()=>startWorkout(6,0,'2026-11-02'));await p.clock.runFor(600);
const key=await p.evaluate(()=>{const its=woItems(woState()).items,i=its.findIndex(x=>x.emom);const k=`w6-Mon-${i}`;woPatch(y=>{});setCheck(k,true);renderWorkout();return k});await p.clock.runFor(300);
const dock=await p.locator('#woDock, .dock, [class*=dock]').first().innerText().catch(()=>'');
ok(/0[\s\S]*5[\s\S]*10[\s\S]*30\+[\s\S]*Missed/.test(dock),'dock offers 0 to 30+ in 5 s steps and Missed: '+dock.replace(/\n/g,' '));
await p.locator(`#workout [data-feel="${key}|15s"]`).first().evaluate(b=>b.click());await p.clock.runFor(300);
ok(await p.locator('#workout .fl-mv .fl-r').count()>=2,'per move rows appear after the tap');
const first=p.locator('#workout .fl-mv .fl-r').first();await first.locator('[data-fmv$="|5"]').evaluate(b=>b.click());await p.clock.runFor(200);await p.locator('#workout .fl-mv .fl-r').first().locator('[data-fmv$="|5"]').evaluate(b=>b.click());await p.clock.runFor(200);
ok(/25 s/.test(await p.locator('#workout .fl-mv .fl-r').first().innerText()),'first move +5 +5 = 25 s');
ok(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no overflow at 390');await p.locator('#workout .em-feel').scrollIntoViewIfNeeded();await p.screenshot({path:(process.env.SHOTS||'/tmp')+'/emfeel.png'});
const notes=await p.evaluate(()=>{window.__p=null;openFinish=x=>{window.__p=x};finishWorkout();return (window.__p.notes.match(/Loads[^\n]*/)||[''])[0]});
ok(/Sled push \d+ \(25s\)/.test(notes)&&/Farmers carry [\d.]+ \(15s\)/.test(notes),'Loads line: per move seconds · '+notes);
await p.close();
// next week builds from seconds
p=await open('2026-11-09T07:00:00',[L('m6','2026-11-02','Mon: Lower + sled','Loads (lb): Sled push 250 (25s) · Farmers carry 62 (15s)'),...FRED]);
const s2=await p.evaluate(()=>{const a=sledSuggest('sledpush',7,'Mon');return[a.total,a.why]});ok(s2[0]>250&&/25 s left|race weight/.test(s2[1]),'25 s left → sled goes up next week '+JSON.stringify(s2));
const s4=await p.evaluate(()=>{window.__l=null;return 1});
const s3=await p.evaluate(()=>suggestLoad('carry',7,28,1));ok(s3.why!=='up','carry 15 s left does not go up by the old rule '+JSON.stringify(s3.why));
const hold=await p.evaluate(()=>{const lg=getLogs('fred');lg.unshift({id:'m7',athlete:'fred',date:'2026-11-08',week:6,session:'Mon: Lower + sled',notes:'Loads (lb): Sled push 235 (5s)',updatedAt:'2026-11-08T20:00:00Z',savedAt:'2026-11-08T20:00:00Z'});localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg));const a=sledSuggest('sledpush',7,'Mon');return[Math.round(a.total),a.why]});
ok(hold[0]===235&&/hold/.test(hold[1]),'5 s left holds 235 (no ramp, no sim floor) '+JSON.stringify(hold));
await p.close();
ok(/rest left in seconds/i.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains seconds');
ok(!errs.length,'no page errors '+errs.join(' | '));
await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
