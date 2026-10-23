// Read-only rollout smoke test apart from ordinary authentication; never changes equipment or orders.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const base='http://127.0.0.1:8085';
 const login=await page.request.post(base+'/api/auth/login',{data:{username:'operator1',password:'MES123'}});
 assert(login.ok(),'Development operator login failed');const session=await login.json();
 const headers={Authorization:`Bearer ${session.access_token}`};
 const runtime=await page.request.get(base+'/api/auth/runtime',{headers});assert.equal((await runtime.json()).appMode,'production');
 const equipment=await page.request.get(base+'/api/equipment/status',{headers});assert(equipment.ok());const machines=await equipment.json();
 for(const m of machines){assert(m.statusProvenance);assert(m.countProvenance);assert('calibrationStatus' in m);}
 await page.addInitScript(s=>{localStorage.setItem('mes_token',s.access_token);localStorage.setItem('mes_user',JSON.stringify(s.user));},session);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['monitoring','operator']) {
  await page.goto(base+'/'+route);await page.getByRole('button',{name:'Refresh / retry'}).waitFor();
  assert.equal(await page.getByText(/SIMULATED · Demonstration/).count(),0);
  assert.equal(await page.getByText('LIVE SHOPFLOOR FEED',{exact:true}).count(),0);
  if(route==='operator'){
   assert(await page.getByRole('button',{name:'Sign off step',exact:true}).isDisabled());
   const options=await page.getByLabel('Select order').locator('option').all();
   if(options.length>1){await page.getByLabel('Select order').selectOption({index:1});await page.waitForTimeout(500);}
  }
  await page.screenshot({path:path.resolve(__dirname,`../../backups/display-review/live-${route}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS deployed production mode, ${machines.length} recorded machines, provenance metadata, Monitoring/Operator rendering, no simulation, disabled step controls, no browser errors. No production mutations sent.`);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
