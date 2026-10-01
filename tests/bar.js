// Bottom bar realign check: node tests/bar.js  (needs playwright; Chromium at /opt/pw-browsers/chromium in Claude's cloud sandbox)
// Fakes visualViewport to reproduce the iOS quirk (layout viewport shorter than the visual one, so the fixed bar floats up).
// A focused select or date input (Log form) is not a keyboard, so the bar must still be pushed down. A text input with the keyboard up must not.
const {chromium}=require('playwright'),path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
let fails=0;const check=(name,got,want)=>{const g=JSON.stringify(got),w=JSON.stringify(want),ok=g===w;if(!ok)fails++;console.log((ok?'ok   ':'FAIL ')+name+(ok?'':`\n     got  ${g}\n     want ${w}`))};
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const errs=[];
const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1');const vv=new EventTarget();vv.height=innerHeight;vv.offsetTop=0;Object.defineProperty(window,'visualViewport',{value:vv,configurable:true})});
await p.goto(URL);await p.waitForTimeout(800);
const bar=()=>p.evaluate(()=>document.querySelector('.bottombar').style.transform);
const shrink=async h=>{await p.evaluate(h=>{visualViewport.height=innerHeight+h;visualViewport.dispatchEvent(new Event('resize'))},h);await p.waitForTimeout(150)};
await p.evaluate(()=>showView('plan'));await shrink(30);
check('Plan, nothing focused: bar pushed down by the gap',await bar(),'translateY(30px)');
await p.evaluate(()=>{showView('log')});await p.waitForTimeout(200);
await p.focus('#session');await shrink(31);
check('Log form, session select focused: bar still pushed down',await bar(),'translateY(31px)');
await p.focus('#date');await shrink(32);
check('Log form, date input focused: bar still pushed down',await bar(),'translateY(32px)');
await p.focus('#notesRoll summary').catch(()=>{});await p.evaluate(()=>{document.getElementById('notesRoll').open=true});await p.focus('#notes');await shrink(33);
check('Log form, notes textarea focused (keyboard up): bar left alone',await bar(),'');
await p.evaluate(()=>document.activeElement.blur());await shrink(34);await p.waitForTimeout(450);
check('keyboard closed: bar back at the bottom',await bar(),'translateY(34px)');
await p.selectOption('#session','Other');await p.waitForTimeout(1200);
check('after picking an option the select is released and the bar stays correct',await p.evaluate(()=>[document.activeElement===document.getElementById('session'),document.querySelector('.bottombar').style.transform]),[false,'translateY(34px)']);
// short pages fill the screen
for(const v of ['today','log','guides']){await p.evaluate(v=>showView(v),v);await p.waitForTimeout(150);check('document is at least as tall as the screen on '+v+', no scrollbar for it',await p.evaluate(()=>[document.documentElement.scrollHeight>=innerHeight,document.documentElement.scrollHeight-innerHeight<=2||document.documentElement.scrollHeight>innerHeight]),[true,true])}
// no event fires (short pages such as Today): the periodic realign still catches the gap
await p.evaluate(()=>{showView('today');visualViewport.height=innerHeight+41});await p.waitForTimeout(700);
check('Today, viewport changed without any event: bar corrected within 700 ms',await bar(),'translateY(41px)');
await p.evaluate(()=>{visualViewport.height=innerHeight});await p.waitForTimeout(700);
check('viewport back to normal: transform cleared',await bar(),'');
check('no page errors',errs.join('|'),'');
await b.close();console.log(fails?fails+' FAILED':'ALL OK');process.exit(fails?1:0)})();
