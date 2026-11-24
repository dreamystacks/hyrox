// v221 tired legs in the workout and on the report card (Fred, Nov 24): checklist under the intervals (before rep 2 and 4, Swap, skip),
// rest card text follows a swap, finish line `Legs done:`, report card rows between the runs, the line hidden from notes, Fred's Nov 24 fix. node tests/legs2.js
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');const URL='file://'+path.resolve(__dirname,'../index.html');
let f=0;const ok=(c,m)=>{if(!c){f++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const LOG={id:'1795900000000',date:'2026-11-24',session:'Tue: Run + arms A',duration:80,rpe:8,knee:0,distance:6,pace:'5:39',stations:'',notes:'Workout 80:00 · 6/6 exercises done\nRuns: 5:46 / 5:39 / 5:41 / 5:46 / 5:45 / 5:14',updatedAt:'2026-11-24T22:00:00Z'};
const open=async(t,logs)=>{const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(lg=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},logs||[]);
 await p.clock.install({time:new Date(t)});await p.goto(URL);await p.clock.runFor(5000);return p};
// workout week 10 Tuesday
let p=await open('2026-12-01T17:00:00');await p.evaluate(()=>startWorkout(10,1,'2026-12-01'));await p.clock.runFor(600);
const rows=()=>p.evaluate(()=>[...document.querySelectorAll('#workout .wo-legs2 .wl-r')].map(r=>r.className.replace('wl-r ','')+'|'+r.innerText.replace(/\s+/g,' ').trim()));
let r=await rows();ok(r.length===2&&/^todo\|Before rep 2 10 burpee broad jumps/.test(r[0])&&/^todo\|Before rep 4 20 m sandbag lunges/.test(r[1]),'checklist rows before reps 2 and 4: '+JSON.stringify(r));
await p.click('#workout [data-lgsw$="|2"]');await p.clock.runFor(200);r=await rows();ok(/Before rep 2 20 m sandbag lunges/.test(r[0]),'Swap turns burpees into lunges: '+r[0]);
const chk=await p.evaluate(()=>{const c=load(checkKey(),{});return Object.keys(c).filter(k=>/^w10-Tue-0/.test(k)&&c[k]).length});ok(chk===0,'Swap does not tick the intervals item or a set');
await p.click('#workout [data-lgsk$="|4"]');await p.clock.runFor(200);r=await rows();ok(/^skip\|/.test(r[1]),'tap the status marks rep 4 skipped');
await p.click('#workout [data-lgsk$="|4"]');await p.clock.runFor(200);r=await rows();ok(/^todo\|/.test(r[1]),'tap again undoes the skip');
const ln=await p.evaluate(()=>{const y=woState(),{items}=woItems(y),key='w10-Tue-0';y.times={[key]:[340000,330000]};woSave(y);return legsLine(woState(),items[0],key)});
ok(ln==='Legs done: before rep 2 20 m sandbag lunges · before rep 4 not reached (20 m sandbag lunges)','finish line: '+ln);
const rt=await p.evaluate(()=>{const y=woState();y.autoNext={parent:'w10-Tue-0',n:2,total:7,rest:90};woSave(y);return restNextTxt()});ok(/^Now: 20 m sandbag lunges · rep 2 of 7/.test(rt),'rest card follows the swap: '+rt);
await p.close();
// report card and the Nov 24 fix
p=await open('2026-11-24T17:30:00',[LOG]);await p.clock.runFor(800);
const st=await p.evaluate(()=>{const x=load(k('logs'),[]).find(l=>l.id==='1795900000000');return x&&x.notes});ok(/\nLegs done: before rep 2 20 m sandbag lunges · before rep 4 20 m sandbag lunges$/.test(st||''),'Nov 24 fix adds the Legs done line once');
const rc=await p.evaluate(()=>{const c=document.querySelector('#today .rc-runs');return c?[...c.children].map(e=>e.className.split(' ')[0]+':'+e.innerText.replace(/\s+/g,' ').trim()):null});
ok(rc&&/^rc-leg:↳ ?20 m sandbag lunges$/.test(rc[1])&&rc[0].startsWith('rc-run')&&rc[2].startsWith('rc-run')&&/^rc-leg/.test(rc[4]),'report card rows before runs 2 and 4: '+JSON.stringify(rc&&rc.slice(0,6)));
ok(!/Legs done/.test(await p.locator('#today').innerText()),'Legs done line hidden from the notes');
await p.reload();await p.clock.runFor(5000);ok(await p.evaluate(()=>(load(k('logs'),[]).find(l=>l.id==='1795900000000').notes.match(/Legs done/g)||[]).length)===1,'fix applies once');
await p.close();
ok(/Legs done: /.test(fs.readFileSync(path.resolve(__dirname,'../coach/PROMPT.md'),'utf8')),'coach prompt explains the Legs done line');
ok(!errs.length,'no page errors '+errs.join(' | '));await b.close();console.log(f?f+' FAILED':'all ok');process.exit(f?1:0)})();
