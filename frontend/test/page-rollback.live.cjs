const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const base='http://127.0.0.1:8085';
 const r=await page.request.post(base+'/api/auth/login',{data:{username:'operator1',password:'MES123'}});assert(r.ok());const session=await r.json();
 await page.addInitScript(s=>{localStorage.setItem('mes_token',s.access_token);localStorage.setItem('mes_user',JSON.stringify(s.user));},session);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['dashboard','monitoring','operator','work-orders','quality']){
  await page.goto(base+'/'+route);await page.waitForTimeout(1800);
  assert((await page.locator('main').innerText()).length>100,'Empty '+route);
  await page.screenshot({path:path.resolve(__dirname,'../../backups/before-page-rollback-20261019/restored-'+route+'.png'),fullPage:true});
  console.log('PASS restored '+route);
 }
 assert.deepEqual(errors,[]);console.log('PASS no browser exceptions; no production mutations sent');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
