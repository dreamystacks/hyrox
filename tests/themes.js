// v127 one neutral look: any stored accent opens as studio-<mode>, the theme sheet only offers Light/Dark/Auto,
// neutrals per mode, no blue left in buttons, tabs or the race tile, green = ahead / red = behind, floating tab bar. node tests/themes.js
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const S=(id,date,tot,runs,st)=>({id,athlete:'fred',date,session:'Sat: HYROX sim',duration:40,rpe:8,stations:st,notes:`Sim week 4 · total ${tot}\nRuns: ${runs}`,savedAt:date+'T20:00:00Z',updatedAt:date+'T20:00:00Z'});
const LOGS=[S('a','2026-10-24','32:25','6:30 / 6:35 / 6:40 / 6:45','SkiErg 2:12 · Sled push 1:20 · Sled pull 2:07 · Burpee broad jumps 2:19'),S('b','2026-10-31','30:10','6:05 / 6:10 / 6:15 / 6:20','RowErg 2:35 · Farmers carry 1:18 · Sandbag lunges 2:16 · Wall balls 2:00')];
const blue=c=>{const m=String(c).match(/rgba?\((\d+), (\d+), (\d+)/);if(!m)return false;const[r,g,b]=[+m[1],+m[2],+m[3]];return b>r+40&&b>g+20};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
for(const [acc,mode] of [['volt','dark'],['gold','light'],['studio','light'],['ice','dark']]){
 const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(([a,m,lg])=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_studio_v1','1');localStorage.setItem('hrx_accent',a);localStorage.setItem('hrx_mode',m);localStorage.setItem('hrx_fred_logs_v2',JSON.stringify(lg))},[acc,mode,LOGS]);
 await p.clock.install({time:new Date('2026-11-01T09:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 const r=await p.evaluate(()=>{const R=document.documentElement,cs=getComputedStyle(R),bar=document.querySelector('.bottombar').getBoundingClientRect(),tab=getComputedStyle(document.querySelector('.bottombar .tab.active')),tile=getComputedStyle(document.querySelector('.rt-tile'));
  return{theme:R.dataset.theme,bg:getComputedStyle(document.body).backgroundColor,good:cs.getPropertyValue('--good').trim(),bad:cs.getPropertyValue('--bad').trim(),tabBg:tab.backgroundColor,tabC:tab.color,tile:tile.backgroundColor+tile.backgroundImage,gap:Math.round(innerHeight-bar.bottom),left:Math.round(bar.left),radius:parseFloat(getComputedStyle(document.querySelector('.bottombar')).borderRadius),labels:[...document.querySelectorAll('.bottombar .tab')].map(t=>t.textContent.trim())}});
 ok(r.theme==='studio-'+mode,`${acc}-${mode}: opens as ${r.theme}`);
 ok(mode==='light'?r.bg==='rgb(243, 243, 241)':r.bg==='rgb(9, 9, 10)',`${acc}-${mode}: neutral background ${r.bg}`);
 ok(r.good&&r.bad,`${acc}-${mode}: good and bad colours defined ${r.good} ${r.bad}`);
 ok(!blue(r.tabBg)&&!blue(r.tabC)&&!blue(r.tile),`${acc}-${mode}: no blue in the active tab or race tile`);
 ok(r.gap>=8&&r.left>=16&&r.radius>=30,`${acc}-${mode}: floating pill bar (gap ${r.gap}, left ${r.left}, radius ${r.radius})`);
 ok(JSON.stringify(r.labels)==='["Plan","Today","Coach"]','three labelled tabs '+r.labels);
 const btn=await p.evaluate(()=>{const s=document.querySelector('#today .start-btn,#today .primary,#today .quick-log');return s?getComputedStyle(s).backgroundColor:''});ok(!blue(btn),`${acc}-${mode}: main button is not blue ${btn}`);
 await p.click('.bottombar [data-view=bench]');await p.clock.runFor(600);
 const g=await p.evaluate(()=>{const c=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).color:null},cs=getComputedStyle(document.documentElement),rgb=v=>{const d=document.createElement('i');d.style.color=v;document.body.appendChild(d);const o=getComputedStyle(d).color;d.remove();return o};return{behind:c('.pj b.behind'),ahead:c('.pj b.ahead'),good:rgb(cs.getPropertyValue('--good')),bad:rgb(cs.getPropertyValue('--bad'))}});
 ok(g.behind===g.bad&&(!g.ahead||g.ahead===g.good),`${acc}-${mode}: projection gaps red when behind, green when ahead ${JSON.stringify(g)}`);
 if(acc==='volt'){await p.evaluate(()=>{renderThemes();themeModal.classList.add('show')});const t=await p.evaluate(()=>[document.querySelectorAll('#themeList .th-color').length,[...document.querySelectorAll('#themeList [data-mode-pick]')].map(x=>x.textContent)]);
  ok(t[0]===0&&JSON.stringify(t[1])==='["Dark","Light","Auto"]','theme sheet: no colour picker, only Dark, Light, Auto '+JSON.stringify(t));
  await p.click('#themeList [data-mode-pick=light]');ok(await p.evaluate(()=>document.documentElement.dataset.theme)==='studio-light','picking Light switches to studio-light')}
 await p.close()}
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0)})();
