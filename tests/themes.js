// v87 one design language: every accent uses the same neutrals and only its own g1/g2 pair in widgets. node tests/themes.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html'),OUT=process.env.SHOTS||__dirname;
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.clock.install({time:new Date('2026-10-15T09:00:00')});
await p.addInitScript(()=>{if(localStorage.getItem('seed'))return;localStorage.setItem('seed','1');const L=[];['2026-10-05','2026-10-09','2026-10-10','2026-10-13'].forEach(d=>L.push({id:d,date:d,week:3,session:'Other',duration:45,rpe:7,notes:'',savedAt:d+'T20:00:00Z',updatedAt:d+'T20:00:00Z'}));localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(L))});
await p.goto(URL);await p.click('[data-who=fred]');await p.clock.runFor(5000);
const accents=await p.evaluate(()=>Object.keys(ACCENTS));
for(const a of accents)for(const m of ['light','dark']){
await p.evaluate(([a,m])=>{localStorage.setItem('hrx_accent',a);localStorage.setItem('hrx_mode',m);applyTheme();renderToday()},[a,m]);
const r=await p.evaluate(()=>{const cs=getComputedStyle(document.documentElement),g1=cs.getPropertyValue('--g1').trim(),g2=cs.getPropertyValue('--g2').trim();
const tile=getComputedStyle(document.querySelector('.rt-tile')).backgroundImage;const bars=[...document.querySelectorAll('.ts-bars i')].map(i=>i.style.background).filter(Boolean);
const icon=document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href')||'';return{g1,g2,tile,bars:bars.length,mix:bars.every(x=>/var\(--g1\)/.test(x)),icon,bg:getComputedStyle(document.body).backgroundColor,hard:/184, 67, 47|29, 59, 143/.test(tile)}});
ok(r.g1&&r.g2&&!r.hard,`${a}-${m}: tile uses the theme pair ${r.g1} ${r.g2}`);
ok(r.mix,`${a}-${m}: strip bars mix g1 and g2`);
ok(!r.icon||r.icon.includes(a+'-'+m),`${a}-${m}: icon ${r.icon}`);
ok(m==='light'?r.bg==='rgb(237, 236, 234)':r.bg==='rgb(11, 12, 15)',`${a}-${m}: shared neutral background ${r.bg}`);
await p.screenshot({path:`${OUT}/theme-${a}-${m}.png`,clip:{x:0,y:0,width:390,height:420}});}
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
