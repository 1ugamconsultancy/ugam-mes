// Local development only. Audit is read-only; apply requires explicit --development acknowledgement.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const root=path.resolve(__dirname,'../..'),yaml=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
const client=new Client({host:'127.0.0.1',port:5434,user:'mes_admin',database:'ugam_mes',password:yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1]});
async function main(){
 await client.connect();
 const audit={
  invalidInventory:(await client.query('SELECT id,quantity,allocated_quantity FROM material_inventory WHERE quantity<0 OR allocated_quantity<0 OR allocated_quantity>quantity')).rows,
  negativeBatches:(await client.query('SELECT id,quantity FROM material_batches WHERE quantity<0')).rows,
  balanceDifferences:(await client.query('SELECT b.id,b.batch_number,b.quantity AS batch_quantity,COALESCE(sum(i.quantity),0) AS inventory_quantity FROM material_batches b LEFT JOIN material_inventory i ON i.material_batch_id=b.id GROUP BY b.id HAVING b.quantity<>COALESCE(sum(i.quantity),0)')).rows,
  orders:(await client.query('SELECT status,count(*) FROM work_orders GROUP BY status')).rows,
  warehouses:(await client.query('SELECT id,code,name FROM warehouses ORDER BY code')).rows,
  legacyReports:(await client.query('SELECT status,count(*) FROM electronic_batch_records GROUP BY status')).rows
 };console.log(JSON.stringify(audit,null,2));
 if(process.argv[2]!=='apply')return;
 if(process.argv[3]!=='--development')throw Error('Explicit --development acknowledgement required');
 if(audit.invalidInventory.length||audit.negativeBatches.length)throw Error('Resolve invalid balances before enabling constraints');
 for(const file of ['20261018_operational_integrity.sql','20261018_reviewed_warehouse_assignment.sql'])await client.query(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
 console.log('Operational migration and reviewed WH-AUT mapping applied. Legacy records remain unverified.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>client.end());
