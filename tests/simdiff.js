// v207: a sim compared to one with different stations never shows a raw % faster
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});let bad=0;const ok=(c,m)=>{console.log((c?'OK ':'FAIL ')+m);if(!c)bad++};
await p.clock.install({time:new Date('2026-11-22T14:50:00-05:00')});
const A={id:'1795400000000',athlete:'fred',date:'2026-11-22',week:8,session:'Sat: HYROX sim',duration:60,rpe:8,stations:'SkiErg 2:23 · Sled push 1:24 · Sled pull 2:14 · Burpee broad jumps 2:55',notes:'Sim week 8 · total 34:12\nRuns: 5:49 / 6:10 / 6:38 / 6:38\nLoads (lb): Sled push 280 (1/1) · Sled pull 190 (1/1)',savedAt:'2026-11-22T19:00:00Z',updatedAt:'2026-11-22T19:00:00Z'};
const B={id:'1794081206085',athlete:'fred',date:'2026-11-07',week:6,session:'Sat: HYROX sim',duration:110,rpe:8,stations:'SkiErg 2:22 · Sled push 1:11 · Sled pull 1:52 · Burpee broad jumps 3:02 · RowErg 2:31 · Farmers carry 1:31 · Sandbag lunges 2:56 · Wall balls 2:55',notes:'Sim week 6 · total 1:11:10\nRuns: 6:14 / 6:10 / 6:29 / 6:45 / 6:50 / 6:56 / 6:20 / 6:56\nLoads (lb): Sled push 250 (1/1) · Sled pull 170 (1/1)',savedAt:'2026-11-07T19:53:26Z',updatedAt:'2026-11-07T20:40:00Z'};
await p.addInitScript(([a,c])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_fred_logs_v2',JSON.stringify([a,c]))},[A,B]);
await p.goto('file:///home/claude/hyrox/index.html');await p.waitForTimeout(4000);
const r=await p.evaluate(([a,c])=>{const x=simParse(a),y=simParse(c);return simSame(x,y)},[A,B]);
ok(r.scale&&r.why.includes('different stations'),'different stations means scaled compare');
await p.click('#today [data-simcmp]');await p.waitForTimeout(1200);
const t=await p.evaluate(()=>document.querySelector('#simCmpModal').innerText);
ok(!/% faster|% slower/.test(t),'no raw percent in the sheet');ok(/different stations/.test(t),'sheet says different stations');
await b.close();console.log(bad?bad+' FAILED':'ALL OK');process.exit(bad?1:0)})();
