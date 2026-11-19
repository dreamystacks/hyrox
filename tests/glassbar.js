const {chromium}=require('playwright'),path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];const p=await b.newPage({viewport:{width:390,height:844},hasTouch:false});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('hrx_active_athlete','fred');localStorage.setItem('hrx_migrated','1')});
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(4500);
const bb=await p.locator('.bottombar').boundingBox();const y=bb.y+bb.height/2;
await p.screenshot({path:'/tmp/tb0.png',clip:{x:0,y:bb.y-30,width:390,height:bb.height+50}});
await p.mouse.move(bb.x+40,y);await p.mouse.down();await p.waitForTimeout(400);await p.screenshot({path:'/tmp/tb1.png',clip:{x:0,y:bb.y-30,width:390,height:bb.height+50}});
for(let i=1;i<=10;i++){await p.mouse.move(bb.x+40+i*20,y);await p.waitForTimeout(16)}
await p.screenshot({path:'/tmp/tb2.png',clip:{x:0,y:bb.y-30,width:390,height:bb.height+50}});
await p.mouse.up();await p.waitForTimeout(800);
const r1=await p.evaluate(()=>[document.querySelector('.view.active').id,document.querySelector('.tab.active').dataset.view]);if(r1.join()!=='bench,bench'){console.log('FAIL drag from Today to Progress opens Progress',r1);process.exitCode=1}else console.log('ok   drag across the bar snaps to Progress');
await p.screenshot({path:'/tmp/tb3.png',clip:{x:0,y:bb.y-30,width:390,height:bb.height+50}});
await p.click('.bottombar [data-view=health]');await p.waitForTimeout(700);{const v=await p.evaluate(()=>document.querySelector('.view.active').id);const ix=await p.evaluate(()=>{const i=document.querySelector('.tb-ind').getBoundingClientRect(),a=document.querySelector('.tab.active').getBoundingClientRect();return Math.abs(i.left-a.left)<2&&Math.abs(i.width-a.width)<2});const lo=await p.evaluate(()=>document.querySelector('.tb-lens').classList.contains('out'));if(v!=='health'||!ix||!lo){console.log('FAIL tap Health',v,ix,lo);process.exitCode=1}else console.log('ok   tap opens Health, capsule under it, lens gone')}
await p.screenshot({path:'/tmp/tb4.png',clip:{x:0,y:bb.y-30,width:390,height:bb.height+50}});
if(errs.length){console.log('FAIL page errors',errs);process.exitCode=1}else console.log('all ok');await b.close()})();
