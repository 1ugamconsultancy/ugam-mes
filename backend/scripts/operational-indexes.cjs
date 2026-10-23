const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const manifest = require('../migrations/20261019_operational_indexes.cjs');
const quote = s => '"' + s.replaceAll('"', '""') + '"';
const normalize = s => (s || '').replace(/[()\s"]/g, '').replace(/=true$/, '');
function developmentConfig() {
  const yaml = fs.readFileSync(path.join(__dirname, '../../docker-compose.yml'), 'utf8');
  return { host: '127.0.0.1', port: 5434, user: 'mes_admin', database: 'ugam_mes',
    password: yaml.match(/POSTGRES_PASSWORD:\s*(\S+)/)[1] };
}
async function catalog(client, schema) {
  return (await client.query(`SELECT x.oid::text AS oid,x.relname AS name,t.relname AS table,
    i.indisvalid AS valid,i.indisready AS ready,am.amname AS method,
    i.indisunique AS unique,i.indnkeyatts=i.indnatts AS no_includes,
    pg_get_expr(i.indpred,i.indrelid) AS predicate,
    ARRAY(SELECT pg_get_indexdef(i.indexrelid,k,true) FROM generate_series(1,i.indnkeyatts) k) AS columns
    FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_am am ON am.oid=x.relam
    WHERE n.nspname=$1`, [schema])).rows;
}
function equivalent(actual, spec) {
  return actual.table === spec.table && actual.method === 'btree' && !actual.unique && actual.no_includes &&
    JSON.stringify(actual.columns.map(normalize)) === JSON.stringify(spec.columns.map(normalize)) &&
    normalize(actual.predicate) === normalize(spec.predicate);
}
async function migrate(client, action = 'verify', schema = 'public') {
  if (!['apply', 'rollback', 'verify'].includes(action)) throw Error('Expected apply, rollback or verify');
  const ns = quote(schema), journal = `${ns}.operational_index_journal`;
  // Session lock survives individual concurrent DDL statements. Fail rather than queue indefinitely.
  const locked = (await client.query('SELECT pg_try_advisory_lock(20261019,hashtext($1)) AS ok', [schema])).rows[0].ok;
  if (!locked) throw Error('Another operational-index migration is running');
  try {
    await client.query("SET lock_timeout='5s'");
    await client.query("SET statement_timeout='10min'");
    if (action !== 'verify') await client.query(`CREATE TABLE IF NOT EXISTS ${journal} (
      version text NOT NULL, index_name text NOT NULL, definition jsonb NOT NULL,
      index_oid oid, PRIMARY KEY(version,index_name))`);
    let all = await catalog(client, schema);
    // Check every name and invalid equivalent before making any index changes.
    for (const spec of manifest.indexes) {
      const named = all.find(i => i.name === spec.name);
      if (named && !equivalent(named, spec)) throw Error(`Conflicting index definition: ${spec.name}`);
      const invalid = all.find(i => equivalent(i, spec) && (!i.valid || !i.ready));
      if (invalid && action !== 'rollback') throw Error(`Invalid index ${invalid.name}; inspect and explicitly roll back owned indexes before retrying`);
    }
    if (action === 'rollback') {
      const owned = (await client.query(`SELECT * FROM ${journal} WHERE version=$1`, [manifest.version])).rows;
      for (const row of owned) {
        const spec = manifest.indexes.find(s => s.name === row.index_name);
        const actual = all.find(i => i.name === row.index_name);
        if (!spec || row.definition.name !== spec.name || row.definition.table !== spec.table ||
            JSON.stringify(row.definition.columns) !== JSON.stringify(spec.columns) || row.definition.predicate !== spec.predicate)
          throw Error(`Journal definition mismatch: ${row.index_name}`);
        if (actual && (!equivalent(actual, spec) || (row.index_oid && String(row.index_oid) !== actual.oid)))
          throw Error(`Owned index was replaced: ${row.index_name}`);
        if (actual) await client.query(`DROP INDEX CONCURRENTLY ${ns}.${quote(row.index_name)}`);
        await client.query(`DELETE FROM ${journal} WHERE version=$1 AND index_name=$2`, [manifest.version, row.index_name]);
      }
      await client.query(`DELETE FROM ${ns}.operational_migrations WHERE version=$1`, [manifest.version]);
      return { action, removed: owned.map(r => r.index_name) };
    }
    for (const spec of manifest.indexes) {
      const found = all.find(i => equivalent(i, spec) && i.valid && i.ready);
      if (found) continue;
      if (action === 'verify') throw Error(`Missing index for ${spec.table} (${spec.columns.join(', ')})`);
      // Durable ownership intent permits recovery after a failed concurrent index build.
      await client.query(`INSERT INTO ${journal}(version,index_name,definition) VALUES($1,$2,$3)
        ON CONFLICT(version,index_name) DO NOTHING`, [manifest.version, spec.name, spec]);
      await client.query(`CREATE INDEX CONCURRENTLY ${quote(spec.name)} ON ${ns}.${quote(spec.table)}
        (${spec.columns.map(quote).join(',')})${spec.predicate ? ` WHERE ${spec.predicate}` : ''}`);
      all = await catalog(client, schema);
      await client.query(`UPDATE ${journal} SET index_oid=$3 WHERE version=$1 AND index_name=$2`,
        [manifest.version, spec.name, all.find(i => i.name === spec.name).oid]);
    }
    all = await catalog(client, schema);
    const verified = manifest.indexes.map(spec => {
      const actual = all.find(i => equivalent(i, spec) && i.valid && i.ready);
      if (!actual) throw Error(`Verification failed: ${spec.name}`);
      return { table: spec.table, index: actual.name, valid: true };
    });
    if (action === 'apply') {
      for (const table of new Set(manifest.indexes.map(i => i.table))) await client.query(`ANALYZE ${ns}.${quote(table)}`);
      await client.query(`INSERT INTO ${ns}.operational_migrations(version) VALUES($1) ON CONFLICT DO NOTHING`, [manifest.version]);
    }
    return { action, version: manifest.version, indexes: verified };
  } finally {
    await client.query('RESET lock_timeout');
    await client.query('RESET statement_timeout');
    await client.query('SELECT pg_advisory_unlock(20261019,hashtext($1))', [schema]);
  }
}
module.exports = { migrate, developmentConfig, catalog, manifest };
if (require.main === module) {
  const action = process.argv[2] || 'verify';
  if (action !== 'verify' && !process.argv.includes('--development')) throw Error('Explicit --development acknowledgement required');
  const client = new Client(developmentConfig());
  (async () => { try { await client.connect(); console.log(JSON.stringify(await migrate(client, action), null, 2)); }
    finally { await client.end(); } })().catch(e => { console.error(e.message); process.exitCode = 1; });
}
