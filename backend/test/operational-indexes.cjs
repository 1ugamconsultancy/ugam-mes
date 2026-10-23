// All synthetic rows and catalog fault injection are confined to a disposable database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { migrate, developmentConfig, catalog, manifest } = require('../scripts/operational-indexes.cjs');
const database = `opidx_test_${Date.now()}`;
const admin = new Client(developmentConfig());
let client;
const report = { database, rowsPerTable: 100000, checks: [], queries: {} };
const uuid = n => `md5((${n})::text)::uuid`;
const queries = {
  order: `SELECT * FROM production_logs WHERE work_order_id=${uuid(42)} ORDER BY timestamp,id`,
  machine: `SELECT * FROM production_logs WHERE machine_id=${uuid(42)} AND evidence_verified=true ORDER BY timestamp`,
  batch: `SELECT sum(quantity) FROM material_inventory WHERE material_batch_id=${uuid(42)}`,
  plant: `SELECT i.id FROM warehouses w JOIN storage_locations l ON l.warehouse_id=w.id JOIN material_inventory i ON i.storage_location_id=l.id WHERE w.plant_id=${uuid(42)}`,
};
async function plans(stage) {
  for (const [name, sql] of Object.entries(queries)) {
    const results = [];
    for (let i=0;i<3;i++) results.push((await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`)).rows[0]['QUERY PLAN'][0]);
    report.queries[name] ||= {};
    report.queries[name][stage] = results[2];
    const rows = (await client.query(sql)).rows;
    if (stage === 'before') report.queries[name].rows = rows;
    else assert.deepEqual(rows, report.queries[name].rows);
  }
}
async function writes(stage) {
  const times=[];
  for (let run=0;run<5;run++) {
    await client.query('BEGIN');
    const start=performance.now();
    await client.query(`INSERT INTO production_logs(id,work_order_id,machine_id,timestamp,evidence_verified)
      SELECT ${uuid('g+1000000')},${uuid(42)},${uuid(42)},now(),true FROM generate_series(1,1000) g`);
    // Representative stock deduction + linked record writes, rolled back after timing.
    for (let g=1;g<=50;g++) {
      await client.query(`UPDATE material_inventory SET quantity=quantity-1 WHERE id=${uuid(g)} AND quantity>=1`);
      await client.query(`INSERT INTO dispensing_records(id,work_order_id) VALUES(${uuid(g+1000000)},${uuid(42)})`);
      await client.query(`INSERT INTO material_consumptions(id,work_order_id,consumed_at) VALUES(${uuid(g+1000000)},${uuid(42)},now())`);
    }
    times.push(performance.now()-start);
    await client.query('ROLLBACK');
  }
  report[stage+'WriteMs']=times.sort((a,b)=>a-b)[2];
}
async function main() {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${database}`);
  client=new Client({...developmentConfig(),database}); await client.connect();
  await client.query('CREATE TABLE operational_migrations(version text PRIMARY KEY,applied_at timestamptz DEFAULT now())');
  const tables=new Map();
  for(const spec of manifest.indexes) {
    if(!tables.has(spec.table)) tables.set(spec.table,new Set(['id']));
    for(const col of spec.columns) tables.get(spec.table).add(col);
  }
  tables.get('production_logs').add('evidence_verified');
  tables.get('material_inventory').add('quantity');
  const type=c=>c==='evidence_verified'?'boolean':c==='quantity'?'numeric(12,4)':c.endsWith('_at')||c==='timestamp'?'timestamptz':'uuid';
  for(const [table,cols] of tables) {
    await client.query(`CREATE TABLE ${table} (${[...cols].map(c=>`"${c}" ${type(c)}${c==='id'?' PRIMARY KEY':''}`).join(',')})`);
    const value=c=>c==='id'?uuid('g'):c==='quantity'?'1000':c==='evidence_verified'?'g%2=0':type(c)==='timestamptz'?`'2026-01-01'::timestamptz+g*interval '1 second'`:uuid('g%10000');
    await client.query(`INSERT INTO ${table} SELECT ${[...cols].map(value).join(',')} FROM generate_series(1,100000) g`);
    await client.query(`ANALYZE ${table}`);
  }
  await plans('before'); await writes('before');
  await client.query('CREATE INDEX preexisting_warehouse_plant ON warehouses(plant_id)');
  await migrate(client,'apply'); await migrate(client,'apply');
  assert.equal((await client.query('SELECT count(*) FROM operational_index_journal')).rows[0].count,'13');
  report.checks.push('apply, repeat apply, equivalent existing index reused');
  await plans('after'); await writes('after');
  await migrate(client,'rollback');
  assert((await catalog(client,'public')).some(i=>i.name==='preexisting_warehouse_plant'));
  assert.equal((await client.query('SELECT count(*) FROM operational_migrations')).rows[0].count,'0');
  report.checks.push('rollback preserves existing index and removes completion record');
  await client.query('CREATE INDEX opidx_20261019_01 ON production_logs(machine_id)');
  await assert.rejects(migrate(client,'apply'),/Conflicting index definition/);
  await client.query('DROP INDEX opidx_20261019_01');
  report.checks.push('conflicting named index rejected');
  await migrate(client,'apply');
  // Superuser catalog fault injection only in this disposable database.
  await client.query("UPDATE pg_index SET indisvalid=false WHERE indexrelid='opidx_20261019_01'::regclass");
  await assert.rejects(migrate(client,'apply'),/Invalid index/);
  await migrate(client,'rollback'); await migrate(client,'apply'); await migrate(client,'verify');
  report.checks.push('invalid index rejected, explicit rollback and retry succeed');
  for(const q of Object.values(report.queries)) delete q.rows;
  const output=path.join(__dirname,'../../backups/operational-indexes-validation.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks,readMs:Object.fromEntries(Object.entries(report.queries).map(([k,v])=>[k,{before:v.before['Execution Time'],after:v.after['Execution Time']}])),beforeWriteMs:report.beforeWriteMs,afterWriteMs:report.afterWriteMs,report:output},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if(client)await client.end();
  try{await admin.query(`DROP DATABASE IF EXISTS ${database}`);}finally{await admin.end();}
});
