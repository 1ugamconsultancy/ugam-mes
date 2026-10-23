const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.DISPLAY_TEST_URL||'http://127.0.0.1:5188';
async function main(){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let mode='production',equipmentError=0,writeStatus=200,writes=0,delay=0,detailDelay=0;
 const stamp=new Date().toISOString();
 const recorded={sourceKind:'RECORDED',availability:'AVAILABLE',observedAt:stamp};
 let machines=[{id:'m1',code:'M1',name:'Recorded machine',status:'IDLE',produced:0,scrap:null,
 statusProvenance:recorded,countProvenance:{...recorded,reportingPeriod:{start:stamp,end:stamp}},calibrationStatus:'Unavailable',qualificationType:'Unavailable'}];
 await page.addInitScript(()=>{localStorage.setItem('mes_token','browser-test');localStorage.setItem('mes_user',JSON.stringify({id:'u',username:'operator1',role:'OPERATOR',plantId:'p'}));});
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),p=url.pathname.replace('/api','');
  const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(p==='/auth/runtime')return send({appMode:mode},mode==='offline'?503:200);
  if(p==='/auth/profile')return send({role:'OPERATOR'});
  if(p==='/equipment/status')return send(equipmentError?{message:'Offline'}:machines,equipmentError||200);
  if(p==='/work-orders')return send([{id:'o1',woNumber:'ORDER-1',status:'RELEASED',targetQuantity:10,completedQuantity:0,scrapQuantity:0},{id:'o2',woNumber:'ORDER-2',status:'RELEASED'}]);
  if(p==='/work-orders/o1'){if(detailDelay)await new Promise(r=>setTimeout(r,detailDelay));return send({id:'o1',recipeId:'r1',releasedRecipe:{id:'r1',code:'R1',version:'2',instructions:['Recorded instruction']}});}
  if(p==='/work-orders/o2')return send({id:'o2',recipeId:'r2',releasedRecipe:{id:'r2',code:'R2',version:'1',instructions:['Second recorded instruction']}});
  if(route.request().method()==='PATCH'){
   writes++;if(delay)await new Promise(r=>setTimeout(r,delay));
   if(writeStatus===200){machines=machines.map(m=>({...m,status:JSON.parse(route.request().postData()).status}));return send({id:'m1',status:machines[0].status,lastStatusChange:stamp});}
   if(writeStatus===0)return route.abort();
   return send({message:'Rejected write'},writeStatus);
  }
  return send([]);
 });
 const refresh=async()=>{await page.getByRole('button',{name:'Refresh / retry'}).click();await page.getByRole('button',{name:'Refresh / retry'}).waitFor();};
 await page.goto(base+'/monitoring');await page.getByText('M1 · Recorded machine').waitFor();
 assert.match(await page.locator('main').count()?await page.locator('main').innerText():await page.locator('body').innerText(),/Good: 0 · Scrap: Unavailable/);
 assert.equal(await page.getByText(/SIMULATED · Demonstration/).count(),0);
 delay=600;await page.getByLabel('Status for M1').selectOption('RUNNING');
 await page.getByText('Awaiting server confirmation…').waitFor();
 assert.equal(await page.getByLabel('Status for M1').isDisabled(),true);
 await page.getByText('Recorded status: RUNNING',{exact:true}).waitFor();delay=0;
 for(const status of [422,403,500,0]){
  writeStatus=status;await page.getByLabel('Status for M1').selectOption('IDLE');
  await page.getByText(/Status was not confirmed/).waitFor();
  await page.waitForFunction(()=>!document.querySelector('select[aria-label="Status for M1"]').disabled);
  assert.equal(await page.getByText('Recorded status: RUNNING',{exact:true}).count(),1);
 }
 equipmentError=503;await refresh();await page.getByText(/Previous records, if shown, are stale/).waitFor();
 assert.equal(await page.getByLabel('Status for M1').isDisabled(),true);
 equipmentError=0;machines=[];await refresh();await page.getByText('No equipment recorded for this plant.').waitFor();
 await page.goto(base+'/operator');await page.getByLabel('Select order').selectOption('o1');await page.getByText(/Recorded instruction/).waitFor();
 for(const name of ['Start / pause step','Verify component scan','Sign off step'])assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true);
 const before=writes;mode='demo';await page.reload();await page.getByText(/SIMULATED · Demonstration/).waitFor();await page.getByRole('button',{name:'Start illustration'}).click();assert.equal(writes,before);
 mode='offline';await page.reload();await page.getByText(/Runtime mode unavailable. Demonstrations/).waitFor();assert.equal(await page.getByRole('button',{name:'Start illustration'}).count(),0);
 mode='production';await page.reload();await page.getByLabel('Select order').selectOption('o1');await page.getByText(/Recorded instruction/).waitFor();
 fs.mkdirSync(path.resolve(__dirname,'../../backups/display-review'),{recursive:true});
 for(const mobile of [false,true])for(const dark of [false,true]){
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1440,height:1000});
  const isDark=await page.evaluate(()=>document.documentElement.classList.contains('dark'));
  if(isDark!==dark)await page.getByTitle(isDark?'Switch to Bright Mode':'Switch to Dark Mode').click();
  await page.waitForTimeout(600);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:path.resolve(__dirname,`../../backups/display-review/operator-${mobile?'mobile':'desktop'}-${dark?'dark':'light'}.png`),fullPage:true});
 }
 detailDelay=700;await page.getByLabel('Select order').selectOption('');await page.getByLabel('Select order').selectOption('o1');await page.getByLabel('Select order').selectOption('o2');await page.getByText(/Second recorded instruction/).waitFor();await page.waitForTimeout(800);assert.equal(await page.getByText('R1 � Version 2',{exact:true}).count(),0);
 equipmentError=401;await refresh().catch(()=>{});await page.waitForURL('**/login');
 console.log('PASS selection-race isolation, expired-session logout, recorded zero/null, confirmed writes, duplicate prevention, 422/403/500/network failures, stale/empty responses, recipe snapshot, disabled production controls, isolated demo, unavailable runtime, responsive light/dark layouts');
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

