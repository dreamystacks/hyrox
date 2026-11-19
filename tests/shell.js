// v156 Direction E shell: node tests/shell.js
// 4 tabs (Today, Plan, Progress, Health) in an ink pill with an accent capsule, accent themes and tinted ground (light and dark),
// greeting on Today (time of day sets, the athlete's name), Health tab with the body weight tile and the Garmin note, 390 and 360.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(n,g,w)=>{const a=JSON.stringify(g),b=JSON.stringify(w),ok=a===b;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+n+(ok?'':`\n     got  ${a}\n     want ${b}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const open=async(w,h,init)=>{const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(i=>{localStorage.setItem('hrx_active_athlete',i.who||'fred');localStorage.setItem('hrx_migrated','1');localStorage.setItem('hrx_studio_v1','1');localStorage.setItem('hrx_studio_will_v1','1');if(i.acc)localStorage.setItem('hrx_acc',i.acc);if(i.mode)localStorage.setItem('hrx_mode',i.mode)},init||{});
 await p.clock.install({time:new Date('2026-11-17T21:55:00')});await p.goto(URL);await p.clock.runFor(4000);return p};
for(const [w,h] of [[390,844],[360,640]]){
 let p=await open(w,h);
 check(w+': four tabs in order',await p.evaluate(()=>[...document.querySelectorAll('.bottombar .tab')].map(t=>t.dataset.view+':'+t.textContent.trim())),['today:Today','plan:Plan','bench:Progress','health:Health']);
 check(w+': app opens on Today, top bar title empty (the greeting is the title)',await p.evaluate(()=>[document.querySelector('.view.active').id,document.getElementById('pgTitle').textContent]),['today','']);
 const g=await p.evaluate(()=>document.querySelector('.tg-t').textContent);
 check(w+': evening greeting names Fred',/^(Hi Fred, late workout\?|Evening Fred, finish the day strong|Fred, one more session in you\?)$/.test(g),true);
 check(w+': greeting sets by hour',await p.evaluate(()=>[greetSet(8,'Will')[0],greetSet(14,'Will')[0],greetSet(20,'Will')[0]]),["Good morning Will, let's kill it today",'Hi Will, ready to roll?','Hi Will, late workout?']);
 const bar=await p.evaluate(()=>{const bb=document.querySelector('.bottombar'),a=document.querySelector('.bottombar .tab.active'),cs=getComputedStyle(a),R=getComputedStyle(document.documentElement);return{barBg:getComputedStyle(bb).backgroundColor,txt:R.getPropertyValue('--text').trim(),actBg:cs.backgroundColor,acc:R.getPropertyValue('--acc').trim(),h:Math.round(bb.getBoundingClientRect().height),bottomGap:Math.round(innerHeight-bb.getBoundingClientRect().bottom)}});
 check(w+': bar is ink, active tab fills with the accent (mint default)',[bar.barBg==='rgb(28, 28, 31)',bar.actBg==='rgb(16, 176, 122)',bar.acc],[true,true,'#10b07a']);
 check(w+': bar floats above the bottom edge',bar.bottomGap>=10,true);
 await p.click('.bottombar [data-view=health]');await p.clock.runFor(400);
 check(w+': Health opens with title, weight tile and the Garmin note',await p.evaluate(()=>[document.querySelector('.view.active').id,document.getElementById('pgTitle').textContent,!!document.getElementById('hlBw'),document.querySelector('#health .hl-list .lr b').textContent]),['health','Health',true,'Recovery from your watch']);
 await p.click('#hlBw');await p.clock.runFor(500);
 check(w+': the weight tile opens the Body weight sheet over Health',await p.evaluate(()=>[document.getElementById('dashModal').classList.contains('show'),document.getElementById('dashTitle').textContent,document.querySelector('.view.active').id]),[true,'Body weight','health']);
 await p.evaluate(()=>closeDash());
 for(const v of ['plan','bench','today']){await p.click('.bottombar [data-view='+v+']');await p.clock.runFor(300)}
 check(w+': no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await p.context().close()}
// accents and tinted ground
const ACS={mint:['#e8f3ef','#07100e'],ocean:['#e8eff9','#070d17'],violet:['#eeeafb','#0d0916'],coral:['#fbeded','#160a0b'],amber:['#faf1e0','#140e05'],crimson:['#f6dcdf','#170507'],orange:['#fbe4d3','#160a03'],lime:['#e9f3cf','#0b1203'],pink:['#f9dcec','#16050f'],graphite:['#e3e5e7','#0a0b0c']};
for(const mode of ['light','dark'])for(const k of Object.keys(ACS)){const p=await open(390,844,{acc:k,mode});
 const r=await p.evaluate(()=>{const R=getComputedStyle(document.documentElement);return{bg:R.getPropertyValue('--bg').trim(),on:R.getPropertyValue('--on-acc').trim(),act:getComputedStyle(document.querySelector('.bottombar .tab.active')).backgroundColor,ac:R.getPropertyValue('--acc').trim()}});
 const hex=c=>'#'+c.match(/\d+/g).slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('');
 check(mode+' '+k+': ground tint and capsule follow the accent',[r.bg,hex(r.act)===r.ac.toLowerCase()],[ACS[k][mode==='dark'?1:0],true]);await p.context().close()}
// legacy stored value falls back to mint
{const p=await open(390,844,{acc:'yellow'});check('legacy accent yellow falls back to mint',await p.evaluate(()=>themePrefs().ac),'mint');await p.context().close()}
// settings picker lists ten swatches and changes the theme
{const p=await open(390,844);await p.evaluate(()=>{renderThemes()});check('theme list has 10 accents',await p.locator('#themeList .th-color').count(),10);
 await p.evaluate(()=>{document.querySelector('[data-acc2=violet]').click()});check('picking Violet re-tints the page',await p.evaluate(()=>[document.documentElement.style.getPropertyValue('--acc'),document.documentElement.style.getPropertyValue('--bg')]),['#7a3cf0','#eeeafb']);await p.context().close()}
// Will sees his own name
{const p=await open(390,844,{who:'will'});check('Will gets his name in the greeting',await p.evaluate(()=>document.querySelector('.tg-t').textContent.includes('Will')),true);await p.context().close()}
check('no page errors',errs,[]);{const p=await b.newPage({viewport:{width:390,height:844}});await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});await p.clock.install({time:new Date('2026-11-17T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 for(const v of ['today','plan','bench','health']){await p.click(`.bottombar [data-view=${v}]`);await p.clock.runFor(500);const vis=await p.evaluate(()=>[...document.querySelectorAll('main .view')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id));console.log(JSON.stringify(vis)===JSON.stringify([v])?'ok   ':'FAIL ','only the '+v+' page is visible '+vis);if(JSON.stringify(vis)!==JSON.stringify([v]))fails++}await p.close()}
{const p=await b.newPage({viewport:{width:390,height:844}});await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});await p.clock.install({time:new Date('2026-11-17T18:00:00')});await p.goto(URL);await p.clock.runFor(5000);
 const r=await p.evaluate(()=>{const g=s=>{const e=document.querySelector(s);return e?getComputedStyle(e):null};const a=g('#today .td-session'),b=g('#today .td-list'),t=g('#today');return{strip:a&&a.backgroundColor!=='rgba(0, 0, 0, 0)',wk:b&&b.backgroundColor!=='rgba(0, 0, 0, 0)',gap:t.rowGap}});
 check('Today session card and list card are white cards',[r.strip,r.wk],[true,true]);check('Today cards have a 6 px gap',r.gap,'6px');await p.close()}
await b.close();console.log(fails?'FAILED '+fails:'all ok');process.exit(fails?1:0)})();
