// Explicit, one-time development reset. Run with --development-reset ugam_mes.
// Uses the backend's DB_* environment; never changes account activation or scope.
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const assert = require('node:assert/strict');
const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE });
async function main() {
  if (process.argv[2] !== '--development-reset' || process.argv[3] !== 'ugam_mes' || process.env.DB_DATABASE !== 'ugam_mes') throw new Error('Explicit development database acknowledgement required');
  await db.connect();
  await db.query('BEGIN');
  await db.query('LOCK TABLE users IN EXCLUSIVE MODE');
  const before = (await db.query('SELECT * FROM users ORDER BY id')).rows;
  assert.ok(before.length, 'No accounts found');
  for (const user of before) {
    const hash = await bcrypt.hash('MES123', 12);
    await db.query('UPDATE users SET password_hash=$1, session_version=session_version+1 WHERE id=$2', [hash, user.id]);
  }
  const after = (await db.query('SELECT * FROM users ORDER BY id')).rows;
  assert.equal(after.length, before.length);
  assert.equal(new Set(after.map(u => u.password_hash)).size, after.length);
  for (let i = 0; i < after.length; i++) {
    const { password_hash, session_version, ...unchanged } = after[i];
    const { password_hash: oldHash, session_version: oldVersion, ...original } = before[i];
    assert.deepEqual(unchanged, original);
    assert.equal(session_version, oldVersion + 1);
    assert.ok(await bcrypt.compare('MES123', password_hash));
    assert.equal(await bcrypt.compare('incorrect-password', password_hash), false);
  }
  await db.query('COMMIT');
  console.log(`Reset and verified ${after.length} accounts; activation, roles and assignments preserved; sessions revoked.`);
}
main().catch(async error => {
  await db.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => db.end());
