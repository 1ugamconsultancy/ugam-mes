// Uses an isolated schema in the local development database; no application rows are modified.
process.env.NODE_ENV='test';
// Windows checkout contains Linux bcrypt binary. Mock only the hash boundary; database and transactions are real.
const Module=require('node:module'),originalLoad=Module._load;
Module._load=function(name,...args){if(name==='bcrypt')return {compare:async (password,hash)=>password==='MES123' && typeof hash==='string'};return originalLoad.call(this,name,...args);};
const {Pool}=require('pg');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {WorkflowService}=require('../.security-build/work-orders/workflow.service');
const {DispensingService,decimalQuantity}=require('../.security-build/materials/dispensing.service');
const {accessStorage}=require('../.security-build/auth/access-context');
const {assertTransition}=require('../.security-build/work-orders/workflow-policy');
const yaml=fs.readFileSync(path.join(__dirname,'../../docker-compose.yml'),'utf8');
const config={host:'127.0.0.1',port:5434,user:'mes_admin',password:yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1],database:'ugam_mes'};
const admin=new Pool(config);const schema='operational_test_'+Date.now();let pool;let fault=null;let passed=0;
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
async function main(){
 await admin.query(`CREATE SCHEMA ${schema}`);
 const tables=(await admin.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;
 for(const {tablename} of tables){if(!/^[a-z0-9_]+$/.test(tablename))throw Error('Unexpected table name');await admin.query(`CREATE TABLE ${schema}.${tablename} (LIKE public.${tablename} INCLUDING ALL)`);}
 for(const t of ['plants','users','products','batch_recipes','areas','lines','machines','warehouses','storage_locations','material_master','material_batches','material_inventory']) await admin.query(`INSERT INTO ${schema}.${t} SELECT * FROM public.${t}`);
 pool=new Pool({...config,options:`-c search_path=${schema},public`});
 await pool.query(fs.readFileSync(path.join(__dirname,'../migrations/20261018_operational_integrity.sql'),'utf8'));
 await pool.query(fs.readFileSync(path.join(__dirname,'../migrations/20261018_reviewed_warehouse_assignment.sql'),'utf8'));
 await test('prepared reconciliation corrects batch totals only and rejects repeat application',async()=>{
  const c=await pool.connect();
  try {
   const before=(await c.query('SELECT * FROM material_inventory ORDER BY id')).rows;
   const sql=fs.readFileSync(path.join(__dirname,'../migrations/20261018_prepared_balance_reconciliation.sql'),'utf8');
   await c.query(sql);
   assert.deepEqual((await c.query('SELECT * FROM material_inventory ORDER BY id')).rows,before);
   assert.equal(Number((await c.query('SELECT count(*) FROM inventory_balance_reconciliation_audit')).rows[0].count),8);
   assert.equal((await c.query('SELECT b.id FROM material_batches b LEFT JOIN material_inventory i ON i.material_batch_id=b.id GROUP BY b.id HAVING b.quantity<>COALESCE(sum(i.quantity),0)')).rows.length,0);
   await assert.rejects(c.query(sql),/already applied/);await c.query('ROLLBACK');
  } finally {await c.query('ROLLBACK');c.release();}
 });
 const query=async(c,sql,args)=>{if(fault&&sql.includes(fault))throw Error('Injected failure');return(await c.query(sql,args)).rows;};
 const db={manager:{query:(s,a)=>query(pool,s,a)},transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn({query:(s,a)=>query(c,s,a)});await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};
 const workflow=new WorkflowService(db),dispensing=new DispensingService(db,workflow);
 const users=(await pool.query("SELECT * FROM users WHERE is_active=true AND username IN ('admin','manager','supervisor','operator1')")).rows;
 const user=name=>users.find(u=>u.username===name);const plant=user('operator1').plant_id;
 const as=(name,fn)=>{const u=user(name);return accessStorage.run({sub:u.id,username:u.username,role:u.role,plantId:u.plant_id,organizationId:u.organization_id},fn);};
 const [machine]=(await pool.query('SELECT m.id FROM machines m JOIN lines l ON l.id=m.line_id JOIN areas a ON a.id=l.area_id WHERE a.plant_id=$1 LIMIT 1',[plant])).rows;
 const [product]=(await pool.query('SELECT id FROM products LIMIT 1')).rows;
 const recipeId=randomUUID();await pool.query("INSERT INTO batch_recipes(id,product_id,recipe_code,recipe_name,version,bom,process_instructions,status,evidence_requirements) VALUES($1,$2,$3,'Test process','1','[]','[]','ACTIVE',$4)",[recipeId,product.id,'TEST-'+recipeId,JSON.stringify([{id:'clearance',kind:'MANUAL',phase:'PRE_START',label:'Clearance'},{id:'production',kind:'PRODUCTION',phase:'EXECUTION',label:'Production log'}])]);
 const createOrder=async(status='DRAFT')=>{const id=randomUUID();await pool.query("INSERT INTO work_orders(id,plant_id,wo_number,product_id,target_quantity,planned_start,planned_end,status) VALUES($1,$2,$3,$4,10,now(),now()+interval '1 day',$5)",[id,plant,'TEST-'+id,product.id,status]);return id;};
 const revision=async id=>(await pool.query('SELECT revision FROM work_orders WHERE id=$1',[id])).rows[0].revision;
 const transition=async(name,id,action,extra={})=>as(name,async()=>workflow.transition(id,{action,expectedRevision:await revision(id),reason:'Integration test recorded action',password:'MES123',...extra}));
 await test('transition matrix rejects status jumps and wrong roles',async()=>{
  const allowed={PLAN:['DRAFT','PRODUCTION_MANAGER'],RELEASE:['PLANNED','PRODUCTION_MANAGER'],START:['RELEASED','OPERATOR'],PAUSE:['IN_PROGRESS','SUPERVISOR'],RESUME:['PAUSED','OPERATOR'],COMPLETE:['IN_PROGRESS','OPERATOR'],REVIEW:['COMPLETED','SUPERVISOR'],CLOSE:['REVIEWED','PRODUCTION_MANAGER']};
  for(const [action,[status,role]] of Object.entries(allowed)){assert.doesNotThrow(()=>assertTransition(action,status,role));assert.throws(()=>assertTransition(action,'CLOSED',role));assert.throws(()=>assertTransition(action,status,'QUALITY_ENGINEER'));}
  for(const x of [0,-1,'1.00001','Infinity','1e2',NaN])assert.throws(()=>decimalQuantity(x));assert.equal(decimalQuantity('1.0001'),'1.0001');
 });
 const order=await createOrder();
 await test('release snapshot, prestart gate and stale revision',async()=>{
  await transition('manager',order,'PLAN');await assert.rejects(transition('operator1',order,'RELEASE',{recipeId}));await transition('manager',order,'RELEASE',{recipeId});
  await assert.rejects(transition('operator1',order,'START'));
  await as('operator1',async()=>workflow.recordEvidence(order,{expectedRevision:await revision(order),requirementId:'clearance',outcome:'RECORDED',notes:'Recorded physical clearance check'}));
  await as('operator1',()=>assert.rejects(workflow.transition(order,{action:'START',expectedRevision:0,reason:'stale'}),{status:409}));
  await transition('operator1',order,'START');
 });
 await test('shortfall requires approval; independent review and closure',async()=>{
  await as('operator1',()=>workflow.counts(order,8,1,machine.id));await assert.rejects(transition('operator1',order,'COMPLETE'));
  await transition('supervisor',order,'APPROVE_SHORTFALL');await transition('operator1',order,'COMPLETE');
  await assert.rejects(transition('operator1',order,'REVIEW'));await transition('supervisor',order,'REVIEW');
  await as('supervisor',async()=>workflow.recordEvidence(order,{expectedRevision:await revision(order),requirementId:'clearance',outcome:'RECORDED',notes:'Correction invalidates review'}));
  assert.equal((await pool.query('SELECT status FROM work_orders WHERE id=$1',[order])).rows[0].status,'COMPLETED');await assert.rejects(transition('manager',order,'CLOSE'));
  await transition('supervisor',order,'REVIEW');await transition('manager',order,'CLOSE');
  await as('operator1',()=>assert.rejects(workflow.counts(order,1,0,machine.id)));
  await assert.rejects(pool.query("INSERT INTO order_evidence VALUES($1,$2,'clearance','RECORDED','{}',$3,now())",[randomUUID(),order,user('operator1').id]));
 });
 const dispenseOrder=await createOrder();await transition('manager',dispenseOrder,'PLAN');await transition('manager',dispenseOrder,'RELEASE',{recipeId});
 const [stock]=(await pool.query('SELECT i.*,b.uom FROM material_inventory i JOIN material_batches b ON b.id=i.material_batch_id JOIN storage_locations l ON l.id=i.storage_location_id JOIN warehouses w ON w.id=l.warehouse_id WHERE w.plant_id=$1 LIMIT 1',[plant])).rows;
 await pool.query("UPDATE material_batches SET status='RELEASED',expiry_date=CURRENT_DATE+30,quantity=10 WHERE id=$1",[stock.material_batch_id]);
 await pool.query('UPDATE material_inventory SET quantity=10,allocated_quantity=0 WHERE id=$1',[stock.id]);
 const payload={workOrderId:dispenseOrder,inventoryId:stock.id,materialBatchId:stock.material_batch_id,uom:stock.uom,dispensedQuantity:'6.0000',requestedQuantity:'6.0000'};
 await test('concurrent dispensing cannot overconsume',async()=>{
  const results=await Promise.allSettled([as('operator1',()=>dispensing.dispense(payload,randomUUID())),as('operator1',()=>dispensing.dispense(payload,randomUUID()))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(Number((await pool.query('SELECT quantity FROM material_inventory WHERE id=$1',[stock.id])).rows[0].quantity),4);
 });
 await test('inconsistent legacy balances cannot be consumed',async()=>{
  await pool.query('UPDATE material_batches SET quantity=quantity+1 WHERE id=$1',[stock.material_batch_id]);
  await as('operator1',()=>assert.rejects(dispensing.dispense({...payload,dispensedQuantity:'1'},randomUUID()),{status:409}));
  await pool.query('UPDATE material_batches SET quantity=quantity-1 WHERE id=$1',[stock.material_batch_id]);
 });
 await test('concurrent identical retries deduct exactly once; mismatched retry conflicts',async()=>{
  const key=randomUUID(),p={...payload,dispensedQuantity:'1',requestedQuantity:'1'};
  const results=await Promise.all([as('operator1',()=>dispensing.dispense(p,key)),as('operator1',()=>dispensing.dispense(p,key))]);assert.equal(results[0].id,results[1].id);
  await as('operator1',()=>assert.rejects(dispensing.dispense({...p,dispensedQuantity:'2'},key),{status:409}));
  assert.equal(Number((await pool.query('SELECT quantity FROM material_inventory WHERE id=$1',[stock.id])).rows[0].quantity),3);
 });
 await test('every failed dispensing write rolls back balances, records and retry key',async()=>{
  for(const point of ['UPDATE material_batches','INSERT INTO dispensing_records','INSERT INTO material_transactions','INSERT INTO material_consumptions','INSERT INTO order_transition_history','UPDATE dispensing_requests']){
   const before=(await pool.query('SELECT quantity FROM material_inventory WHERE id=$1',[stock.id])).rows[0].quantity;
   const count=(await pool.query('SELECT count(*) FROM dispensing_records')).rows[0].count;
   fault=point;await as('operator1',()=>assert.rejects(dispensing.dispense({...payload,dispensedQuantity:'1',requestedQuantity:'1'},randomUUID())));fault=null;
   assert.equal((await pool.query('SELECT quantity FROM material_inventory WHERE id=$1',[stock.id])).rows[0].quantity,before);assert.equal((await pool.query('SELECT count(*) FROM dispensing_records')).rows[0].count,count);
  }
 });
 await test('reserved stock and unassigned warehouses cannot be consumed',async()=>{
  await pool.query('UPDATE material_inventory SET allocated_quantity=quantity WHERE id=$1',[stock.id]);await as('operator1',()=>assert.rejects(dispensing.dispense({...payload,dispensedQuantity:'1'},randomUUID())));
  await pool.query('UPDATE material_inventory SET allocated_quantity=0 WHERE id=$1',[stock.id]);await pool.query('UPDATE warehouses SET plant_id=NULL');await as('operator1',()=>assert.rejects(dispensing.dispense({...payload,dispensedQuantity:'1'},randomUUID())));
 });
 await test('final reports require verified closure and preserve frozen evidence',async()=>{
  const {EbrService}=require('../.security-build/ebr/ebr.service');const ebr=new EbrService(db,workflow);
  await as('manager',()=>assert.rejects(ebr.generateEbrPdf(dispenseOrder,true),{status:400}));
  const dossier=await as('manager',()=>ebr.getOrCreateEbr(order));assert.equal(dossier.status,'FINAL');assert.equal(dossier.counts.good,8);
  assert.ok(dossier.signatures.some(s=>s.action==='CLOSE'));assert.equal(dossier.equipmentUsed.length,1);
  if(process.env.WRITE_REPORT_FIXTURES==='1'){
   const out=path.join(__dirname,'../../tmp/pdfs');fs.mkdirSync(out,{recursive:true});
   fs.writeFileSync(path.join(out,'verified-final.pdf'),await as('manager',()=>ebr.generateEbrPdf(order,true)));
   fs.writeFileSync(path.join(out,'incomplete-draft.pdf'),await as('manager',()=>ebr.generateEbrPdf(dispenseOrder,false)));
  }
 });
 console.log(`${passed} PostgreSQL integration groups passed`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(pool)await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();});
