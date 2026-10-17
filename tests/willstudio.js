// v91: Will is moved to Studio light once, then keeps whatever he picks. node tests/willstudio.js
const {chromium}=require('playwright'),path=require('path');const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}});
await p.clock.install({time:new Date('2026-10-17T09:00:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');localStorage.setItem('hrx_accent','gold');localStorage.setItem('hrx_mode','dark');localStorage.setItem('hrx_active_athlete','will')});
await p.goto(URL);await p.clock.runFor(5000);
ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='studio-light','Will opens on Studio light');
await p.evaluate(()=>{localStorage.setItem('hrx_accent','ember');localStorage.setItem('hrx_mode','dark')});await p.reload();await p.clock.runFor(4000);
ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='ember-dark','his own pick sticks after that');
const q=await b.newPage();await q.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');localStorage.setItem('hrx_accent','ice');localStorage.setItem('hrx_mode','dark');localStorage.setItem('hrx_active_athlete','grady')});await q.goto(URL);await q.waitForTimeout(1500);
ok(await q.evaluate(()=>document.documentElement.dataset.theme)==='ice-dark','Grady keeps his theme');
await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
