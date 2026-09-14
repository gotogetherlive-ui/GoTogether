import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import pg from 'pg';
import { getDatabaseSsl } from '../src/lib/databaseSsl.js';

nextEnv.loadEnvConfig(process.cwd());
const files = [
  '20260908_public_page_performance.sql',
  '20260909_payment_reliability.sql',
  '20260911_admin_crm.sql',
  '20260912_buddy_group_travel.sql',
  '20260912_business_introductions.sql',
  '20260912_feedback_love_rating.sql',
  '20260914_buddy_member_removal.sql',
  '20260916_preserve_legacy_buddy_duration.sql',
  '20260916_server_chat_encryption.sql',
  '20260916_feature_table_rls.sql',
];
const hash = value => createHash('sha256').update(value).digest('hex');
const plan = files.map(filename => {
  const sql = fs.readFileSync(path.join('db/migrations', filename), 'utf8');
  return { filename, sql, checksum: hash(sql) };
});
const planHash = hash(JSON.stringify(plan.map(({ filename, checksum }) => ({ filename, checksum }))));
const quote = name => '"' + name.replaceAll('"', '""') + '"';

async function main() {
  const rehearse = process.argv.includes('--rehearse');
  const apply = process.argv.includes('--apply');
  if (!rehearse && !apply) throw new Error('Use --rehearse (isolated local restore) or --apply (configured database).');
  if (rehearse && apply) throw new Error('Choose one mode.');
  const backupArg = process.argv.find(arg => arg.startsWith('--backup='));
  if (!backupArg) throw new Error('A verified --backup=directory is required.');
  const backup = backupArg.slice(9);
  const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'));
  if (hash(fs.readFileSync(path.join(backup, 'application.dump'))) !== manifest.sha256) throw new Error('Backup checksum mismatch.');
  const rehearsalDatabase = process.argv.find(arg => arg.startsWith('--rehearsal-database='))?.slice(21) || 'gotogether_audit';
  if (!/^gotogether_[a-z_]+$/.test(rehearsalDatabase)) throw new Error('Invalid isolated rehearsal database name.');
  const connectionString = rehearse ? `postgresql://postgres@127.0.0.1:55439/${rehearsalDatabase}` : process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const target = new URL(connectionString);
  if (apply) {
    if (target.hostname !== manifest.host) throw new Error('Backup does not match the target host.');
    const receipt = JSON.parse(fs.readFileSync(path.join(backup, 'rehearsal.json'), 'utf8'));
    if (receipt.planHash !== planHash || receipt.backupHash !== manifest.sha256) throw new Error('Run a successful rehearsal for this exact migration plan and backup first.');
  }
  const client = new pg.Client({ connectionString, ssl: rehearse ? false : getDatabaseSsl(process.env), connectionTimeoutMillis: 15000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'; SET LOCAL statement_timeout = '60s'; SET LOCAL timezone = 'UTC'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gotogether_release_migration'))");
    const tables = (await client.query(`SELECT n.nspname AS schema, c.relname AS name,
      array_agg(a.attname::text ORDER BY a.attnum) AS columns
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
      WHERE c.relkind='r' AND n.nspname IN ('public','payments','migration_archive_20260713')
      GROUP BY n.nspname,c.relname ORDER BY 1,2`)).rows;
    // Block concurrent writes briefly so comparisons cannot hide lost or changed rows.
    await client.query('LOCK TABLE ' + tables.map(t => quote(t.schema)+'.'+quote(t.name)).join(',') + ' IN SHARE ROW EXCLUSIVE MODE');
    const fingerprintSql = tables.map((t, index) => `SELECT ${index} AS table_index, count(*)::text AS count,
      md5(COALESCE(string_agg(digest, '' ORDER BY digest),'')) AS digest
      FROM (SELECT md5(row_to_json(original)::text) AS digest FROM
        (SELECT ${t.columns.map(quote).join(',')} FROM ${quote(t.schema)}.${quote(t.name)}) original) rows`).join(' UNION ALL ') + ' ORDER BY table_index';
    const before = (await client.query(fingerprintSql)).rows;
    const existing = (await client.query('SELECT filename,checksum FROM public.schema_migrations')).rows;
    const applied = [];
    for (const item of plan) {
      const recorded = existing.find(row => row.filename === item.filename || row.filename === 'db/migrations/'+item.filename);
      if (recorded && recorded.checksum !== item.checksum) throw new Error('Recorded migration checksum differs: '+item.filename);
      if (recorded) continue;
      await client.query(item.sql);
      applied.push(item);
    }
    const after = (await client.query(fingerprintSql)).rows;
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Existing table data changed; rolling back every migration.');
    for (const item of applied) await client.query('INSERT INTO public.schema_migrations(filename,checksum) VALUES($1,$2)', [item.filename,item.checksum]);
    await client.query('COMMIT');
    const result = { at: new Date().toISOString(), planHash, backupHash: manifest.sha256,
      applied: applied.map(item => item.filename), tablesVerified: tables.length,
      existingRowsVerified: before.reduce((sum, row) => sum+Number(row.count),0), existingDataUnchanged: true };
    fs.writeFileSync(path.join(backup, rehearse ? 'rehearsal.json' : 'migration-result.json'), JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
