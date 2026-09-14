import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { loadEnvConfig } from '@next/env';
import { getDatabaseSsl } from '../src/lib/databaseSsl.js';
import { setupFixtures, loginFixture } from './helpers';

loadEnvConfig(process.cwd());
test('chat messages, presence, popups, reports, removal and expiry work together', async ({ browser, request }) => {
  test.setTimeout(120000);
  await setupFixtures(request);
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: getDatabaseSsl(process.env) });
  await db.connect();
  const tripId = randomUUID();
  const ownerContext = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', extraHTTPHeaders: { origin: 'http://127.0.0.1:3100' } });
  const memberContext = await browser.newContext({ baseURL: 'http://127.0.0.1:3100', extraHTTPHeaders: { origin: 'http://127.0.0.1:3100' } });
  try {
    const { rows } = await db.query("SELECT id, email FROM users WHERE email IN ('e2e.alpha@goto.local','e2e.beta@goto.local')");
    const owner = rows.find(row => row.email === 'e2e.alpha@goto.local').id;
    const member = rows.find(row => row.email === 'e2e.beta@goto.local').id;
    await db.query("INSERT INTO trips(id,organizer_id,title,description,destination,duration_days,duration_nights,start_date,trip_type) VALUES($1,$2,'Audit chat trip','Isolated automated test','Goa',1,2,CURRENT_DATE::text,'buddy')",[tripId,owner]);
    await db.query("INSERT INTO trip_requests(id,trip_id,requester_id,candidate_details,status) VALUES($1,$2,$3,'{}','accepted')",[randomUUID(),tripId,member]);
    await db.query('INSERT INTO trip_participants(id,trip_id,user_id) VALUES($1,$2,$3)',[randomUUID(),tripId,member]);
    const ownerPage = await ownerContext.newPage();
    const memberPage = await memberContext.newPage();
    await loginFixture(ownerPage,'alpha'); await loginFixture(memberPage,'beta');
    await memberPage.goto(`/chat/${tripId}`);
    await expect(memberPage.getByLabel('Chat message', {exact:true})).toBeVisible();
    const initial = await ownerPage.request.get(`/api/chat/${tripId}`);
    expect(initial.status()).toBe(200);
    expect((await initial.json()).chat.members.find((item: {id:string})=>item.id===member).is_online).toBe(true);
    await memberPage.goto('/about');
    await ownerPage.goto(`/chat/${tripId}`);
    await ownerPage.getByLabel('Chat message', {exact:true}).fill('Audit hello from organizer');
    await ownerPage.locator('button[type="submit"]').click();
    const toast = memberPage.getByRole('complementary',{name:'New chat messages'});
    await expect(toast).toContainText('Encrypted message received',{timeout:15000});
    await toast.getByRole('button',{name:/New trip message/}).click();
    await expect(memberPage.getByText('Audit hello from organizer', {exact:true})).toBeVisible();
    await expect(memberPage.locator('time[datetime]').first()).toBeVisible();
    await expect(memberPage.getByText('Messages are encrypted',{exact:true})).toHaveCount(1);
    await expect(memberPage.getByLabel('Chat password',{exact:true})).toHaveCount(0);
    const anotherDevice = await browser.newContext({baseURL:'http://127.0.0.1:3100'});
    try {
      const anotherPage = await anotherDevice.newPage();
      await loginFixture(anotherPage,'beta');
      await anotherPage.goto(`/chat/${tripId}`);
      await expect(anotherPage.getByText('Audit hello from organizer',{exact:true})).toBeVisible();
      await expect(anotherPage.getByLabel('Chat password',{exact:true})).toHaveCount(0);
    } finally {await anotherDevice.close();}
    const stored = (await db.query('SELECT message FROM messages WHERE trip_id=$1',[tripId])).rows[0].message;
    expect(stored).toContain('gtchat:v2:');
    expect(stored).not.toContain('Audit hello');
    const encryptedPayload = {message:'Cannot send now'};
    expect((await ownerPage.request.post(`/api/chat/${tripId}`, {data:null})).status()).toBe(400);
    const report = await ownerPage.request.post(`/api/chat/${tripId}/members/${member}`,{data:{action:'report',reason:'Automated audit report, not a real concern'}});
    expect(report.status()).toBe(200);
    expect((await memberPage.request.get('/api/admin/traveler-reports')).status()).toBe(403);
    expect((await ownerPage.request.post(`/api/chat/${tripId}/members/${member}`,{data:{action:'remove',reason:'Automated test completed'}})).status()).toBe(200);
    expect((await memberPage.request.get(`/api/chat/${tripId}`)).status()).toBe(403);
    expect((await memberPage.request.post(`/api/chat/${tripId}`,{data:encryptedPayload})).status()).toBe(403);
    const interests = await memberPage.request.get('/api/buddy?view=interests');
    expect(await interests.text()).toContain('removed');
    await db.query("UPDATE trips SET start_date=(CURRENT_DATE - 10)::text WHERE id=$1",[tripId]);
    expect((await ownerPage.request.post(`/api/chat/${tripId}`,{data:encryptedPayload})).status()).toBe(410);
    await ownerPage.reload();
    await expect(ownerPage.getByLabel('Chat message', {exact:true})).toBeDisabled();
  } finally {
    await ownerContext.close(); await memberContext.close();
    for(const table of ['reports','user_chat_reads','messages','trip_participants','trip_requests']) {
      await db.query(`DELETE FROM ${table} WHERE ${table==='reports'?'reported_trip_id':'trip_id'}=$1`,[tripId]);
    }
    await db.query('DELETE FROM trips WHERE id=$1',[tripId]); await db.end();
  }
});
