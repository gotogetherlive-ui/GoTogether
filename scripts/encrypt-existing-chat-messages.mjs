import nextEnv from '@next/env';
import pg from 'pg';
import { getDatabaseSsl } from '../src/lib/databaseSsl.js';
import { encryptStoredChatMessage, decryptStoredChatMessage } from '../src/lib/chatServerEncryption.js';

nextEnv.loadEnvConfig(process.cwd());
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: getDatabaseSsl(process.env), connectionTimeoutMillis: 10000 });
await client.connect();
try {
  if (process.argv.includes('--check')) {
    console.log((await client.query('SELECT encryption_version, COUNT(*)::int AS messages FROM messages GROUP BY encryption_version ORDER BY encryption_version')).rows);
  } else {
    let total = 0;
    while (true) {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT id, trip_id, sender_id, message FROM messages WHERE encryption_version = 0 ORDER BY id LIMIT 100 FOR UPDATE');
      for (const row of rows) {
        const ciphertext = encryptStoredChatMessage(row.message, row);
        if (decryptStoredChatMessage(ciphertext, row) !== row.message) throw new Error('Encryption verification failed');
        await client.query('UPDATE messages SET message=$1, encryption_version=2 WHERE id=$2 AND encryption_version=0', [ciphertext, row.id]);
      }
      await client.query('COMMIT');
      total += rows.length;
      if (!rows.length) break;
    }
    console.log(`Encrypted and verified ${total} existing messages. Previous end-to-end encrypted messages were preserved.`);
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally { await client.end(); }
