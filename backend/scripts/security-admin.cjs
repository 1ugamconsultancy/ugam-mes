// Audit is read-only by default. Never prints hashes, passwords, or connection strings.
require('dotenv').config();
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const command = process.argv[2] || 'audit';
const client = new Client({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME || 'mes_admin', password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE || 'ugam_mes' });
const option = flag => { const i=process.argv.indexOf(flag); return i<0 ? undefined : process.argv[i+1]; };
async function main() {
 await client.connect();
 if (command === 'audit') {
  const users = await client.query(`SELECT u.id,u.username,lower(btrim(u.username)) AS normalized_username,u.role,u.is_active,u.plant_id,u.organization_id,p.name AS plant_name,p.organization_id AS expected_organization_id,
   (u.password_hash NOT LIKE '%SecretPasswordHashPlaceholder%' AND u.password_hash ~ '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$') AS has_valid_hash_format
   FROM users u LEFT JOIN plants p ON p.id=u.plant_id ORDER BY u.username`);
  const duplicates = await client.query('SELECT lower(btrim(username)) AS normalized_username,count(*) FROM users GROUP BY lower(btrim(username)) HAVING count(*)>1');
  const orders = await client.query(`SELECT w.id,w.wo_number,array_remove(array_agg(DISTINCT a.plant_id),NULL) AS production_plant_candidates FROM work_orders w LEFT JOIN production_logs pl ON pl.work_order_id=w.id LEFT JOIN machines m ON m.id=pl.machine_id LEFT JOIN lines l ON l.id=m.line_id LEFT JOIN areas a ON a.id=l.area_id GROUP BY w.id,w.wo_number ORDER BY w.wo_number`);
  const inventory = await client.query('SELECT id,lot_number,product_id,location_code FROM inventory_balances ORDER BY lot_number');
  console.log(JSON.stringify({ users: users.rows, duplicateUsernames: duplicates.rows, workOrders: orders.rows, inventoryLots: inventory.rows },null,2));
 } else if (command === 'migrate' || command === 'check-migration') {
  const mappingFile = option('--mapping');
  if (!mappingFile) throw new Error('Provide --mapping with reviewed users/workOrders mappings');
  const mapping = JSON.parse(fs.readFileSync(mappingFile,'utf8'));
  await client.query('BEGIN');
  await client.query('LOCK TABLE users,work_orders IN ACCESS EXCLUSIVE MODE');
  await client.query('CREATE TEMP TABLE security_user_map(user_id uuid PRIMARY KEY,plant_id uuid,username text) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE security_order_map(work_order_id uuid PRIMARY KEY,plant_id uuid NOT NULL) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE security_inventory_map(inventory_id uuid PRIMARY KEY,plant_id uuid NOT NULL) ON COMMIT DROP');
  for (const row of mapping.inventoryLots || []) {
   const exists = await client.query('SELECT id FROM inventory_balances WHERE id=$1',[row.inventoryId]);
   if (!exists.rowCount) throw new Error('Inventory mapping references an unknown lot');
   await client.query('INSERT INTO security_inventory_map VALUES($1,$2)',[row.inventoryId,row.plantId]);
  }
  for (const row of mapping.users || []) {
   const exists = await client.query('SELECT id FROM users WHERE id=$1',[row.userId]);
   if (!exists.rowCount) throw new Error('User mapping references an unknown account');
   await client.query('INSERT INTO security_user_map VALUES($1,$2,$3)',[row.userId,row.plantId || null,row.username || null]);
  }
  for (const row of mapping.workOrders || []) {
   const exists = await client.query('SELECT id FROM work_orders WHERE id=$1',[row.workOrderId]);
   if (!exists.rowCount) throw new Error('Order mapping references an unknown work order');
   await client.query('INSERT INTO security_order_map VALUES($1,$2)',[row.workOrderId,row.plantId]);
  }
  await client.query(fs.readFileSync(path.resolve(__dirname,'../../migration_security_plant_access.sql'),'utf8'));
  if (command === 'check-migration') { await client.query('ROLLBACK'); console.log('Migration validated and rolled back; no changes saved.'); }
  else { await client.query('COMMIT'); console.log('Migration complete. All sessions revoked; reset placeholder accounts individually.'); }
 } else if (command === 'reset-password') {
  const username=option('--username'); const password=process.env.MES_RESET_PASSWORD;
  if (!username || !password || password.length<12 || Buffer.byteLength(password)>72) throw new Error('Provide --username and MES_RESET_PASSWORD (12 characters minimum; 72 bytes maximum)');
  const bcrypt=require('bcrypt'); const hash=await bcrypt.hash(password,12);
  const result=await client.query('UPDATE users SET password_hash=$1,is_active=true,session_version=session_version+1 WHERE username=$2 RETURNING id',[hash,username.trim().toLowerCase()]);
  if (result.rowCount!==1) throw new Error('Account not found');
  console.log('Password reset and existing sessions revoked.');
 } else throw new Error('Expected audit, check-migration, migrate, or reset-password');
}
main().catch(async err => { await client.query('ROLLBACK').catch(()=>{}); console.error(err.message); process.exitCode=1; }).finally(()=>client.end());
