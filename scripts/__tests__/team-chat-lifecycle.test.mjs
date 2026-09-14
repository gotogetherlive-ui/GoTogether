import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import nextEnv from '@next/env';
import pg from 'pg';
import { getDatabaseSsl } from '../../src/lib/databaseSsl.js';
nextEnv.loadEnvConfig(process.cwd());
const route=readFileSync('src/app/api/chat/[tripId]/route.ts','utf8');
const expression=route.match(/(\(\(NULLIF\(t.start_date[^\n]+) AS chat_closes_at/)[1];
test('chat closes exactly seven days after final trip day in India time', {skip:!process.env.DATABASE_URL},async()=>{
 const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:getDatabaseSsl(process.env),connectionTimeoutMillis:10000});await client.connect();
 try {
  for (const [start,days,expected] of [['2026-09-14',1,'2026-09-21T18:30:00.000Z'],['2026-09-14',3,'2026-09-23T18:30:00.000Z'],['2026-12-31',1,'2027-01-07T18:30:00.000Z']]) {
   const {rows:[row]}=await client.query(`SELECT ${expression} AS closes FROM (SELECT $1::text start_date,$2::int duration_days) t`,[start,days]);
   assert.equal(row.closes.toISOString(),expected);
   const {rows:[boundary]}=await client.query('SELECT $1::timestamptz - interval \'1 millisecond\' >= $1::timestamptz AS before, $1::timestamptz >= $1::timestamptz AS at',[expected]);
   assert.equal(boundary.before,false);assert.equal(boundary.at,true);
  }
  const {rows:[row]}=await client.query(`SELECT ${expression} AS closes FROM (SELECT ''::text start_date,1 duration_days) t`);assert.equal(row.closes,null);
 } finally {await client.end();}
});
