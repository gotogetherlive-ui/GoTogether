import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const source = fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name in mocks ? mocks[name] : require(name), console, process, Request, Response, ...globals });
  return exports;
}
const validation = load('src/lib/businessIntroduction.ts');

test('hot reload applies the new table once even when the base schema was already initialized', async () => {
  let calls = 0;
  const schema = load('src/lib/businessIntroductionSchema.ts');
  const db = load('src/lib/db.ts', {
    './businessIntroductionSchema': schema,
    './databaseSsl': {},
    './chatEncryptionSchema': load('src/lib/chatEncryptionSchema.ts'),
    './buddyModerationSchema': load('src/lib/buddyModerationSchema.ts'),
    './buddyDurationSchema': load('src/lib/buddyDurationSchema.ts'),
  }, {
    __schemaInitialized: true,
    __pgPool: { query: async sql => { assert.match(sql, /CREATE TABLE IF NOT EXISTS business_introductions/); calls++; } },
    process: { env: { NODE_ENV: 'development' } },
  });
  await Promise.all([db.ensureSchema(), db.ensureSchema()]);
  await db.ensureSchema();
  assert.equal(calls, 1);
  assert.equal(schema.BUSINESS_INTRODUCTION_SCHEMA_SQL.trim(), fs.readFileSync(new URL('../../db/migrations/20260912_business_introductions.sql', import.meta.url), 'utf8').trim());
});

test('production does not automatically execute schema DDL after hot reload', async () => {
  const db = load('src/lib/db.ts', {
    './businessIntroductionSchema': load('src/lib/businessIntroductionSchema.ts'),
    './databaseSsl': {},
    './chatEncryptionSchema': load('src/lib/chatEncryptionSchema.ts'),
    './buddyModerationSchema': load('src/lib/buddyModerationSchema.ts'),
    './buddyDurationSchema': load('src/lib/buddyDurationSchema.ts'),
  }, {
    __schemaInitialized: true,
    __pgPool: { query: async () => { throw new Error('Unexpected production DDL'); } },
    process: { env: { NODE_ENV: 'production' } },
  });
  await db.ensureSchema();
});
const details = { fullName: ' Asha Rao ', phoneNumber: '+91 98765 43210', travelName: ' Mountain Trails ' };
const request = (body, method = 'POST') => new Request('http://localhost/api/test', { method, body: JSON.stringify(body) });

function setup() {
  let user = { id: 'traveler-1', role: 'user' };
  let introduction = null;
  let existing = null;
  let adminNotifications = 0;
  const queries = [];
  const db = {
    async queryOne(sql, args) {
      queries.push(sql);
      if (sql.includes('INSERT INTO business_introductions')) {
        if (introduction) return undefined;
        introduction = { id: args[0], user_id: args[1], full_name: args[2], phone_number: args[3], travel_name: args[4], company_address: args[5], status: 'pending' };
        return { ...introduction };
      }
      if (sql.includes('UPDATE business_introductions')) {
        if (!introduction || introduction.id !== args[3] || introduction.status !== 'pending') return undefined;
        introduction = { ...introduction, status: args[0], review_note: args[1] };
        return { ...introduction };
      }
      if (sql.includes('business_introductions')) return introduction?.user_id === args[0] ? { ...introduction } : undefined;
      if (sql.includes('business_applications')) return existing;
      throw new Error(`Unexpected query: ${sql}`);
    },
    async query() { return introduction ? [introduction] : []; },
  };
  const mocks = {
    '@/lib/auth': { getSession: async () => user },
    '@/lib/admin': { isAdminUser: async current => current?.role === 'admin' },
    '@/lib/db': db,
    '@/lib/notificationEvents': { notifyAdmins: async () => { adminNotifications++; }, notifyUser: async () => {} },
    '@/lib/businessIntroduction': validation,
  };
  return {
    api: load('src/app/api/business/introduction/route.ts', mocks),
    admin: load('src/app/api/admin/business-introductions/route.ts', mocks),
    register: () => load('src/app/api/business/register/route.ts', {
      ...mocks,
      '@/lib/payments/provider-config': { parseEnabledPaymentProviders: () => [], normalizePaymentProvider: () => 'RAZORPAY' },
      '@/lib/payments/secret-manager': {},
      '@/lib/organizerAgreement': { normalizeSignerName: value => value.trim() },
    }),
    setUser: value => { user = value; },
    setExisting: value => { existing = value; },
    notifications: () => adminNotifications,
    queries,
  };
}

test('introduction validates required fields and accepts an omitted address', () => {
  const parsed = validation.parseBusinessIntroduction(details);
  assert.equal(parsed.fullName, 'Asha Rao');
  assert.equal(parsed.travelName, 'Mountain Trails');
  assert.equal(parsed.companyAddress, null);
  for (const invalid of [null, [], {}, { ...details, fullName: ' ' }, { ...details, phoneNumber: 'call me' }, { ...details, phoneNumber: '123' }, { ...details, travelName: 'x'.repeat(161) }, { ...details, companyAddress: 'x'.repeat(501) }]) {
    assert.throws(() => validation.parseBusinessIntroduction(invalid));
  }
});

test('users must authenticate and cannot review introductions', async () => {
  const app = setup();
  app.setUser(null);
  assert.equal((await app.api.GET()).status, 401);
  assert.equal((await app.api.POST(request(details))).status, 401);
  assert.equal((await app.admin.GET()).status, 403);
  app.setUser({ id: 'traveler-1', role: 'user' });
  assert.equal((await app.admin.PATCH(request({ id: 'fake', action: 'approve' }, 'PATCH'))).status, 403);
  assert.equal(app.queries.length, 0);
});

test('submission waits for admin approval, rejects duplicates, and unlocks only for the owner', async () => {
  const app = setup();
  assert.equal((await (await app.api.GET()).json()).canProceed, false);
  const submission = await app.api.POST(request(details));
  assert.equal(submission.status, 201);
  const { introduction } = await submission.json();
  assert.equal(introduction.company_address, null);
  assert.equal(app.notifications(), 1);
  assert.equal((await app.api.POST(request(details))).status, 409);
  assert.equal((await (await app.api.GET()).json()).canProceed, false);
  assert.equal((await app.register().POST(request({}))).status, 403);
  app.setUser({ id: 'admin-1', role: 'admin' });
  assert.equal((await app.admin.PATCH(request({ id: introduction.id, action: 'approve' }, 'PATCH'))).status, 200);
  assert.equal((await app.admin.PATCH(request({ id: introduction.id, action: 'reject' }, 'PATCH'))).status, 409);
  app.setUser({ id: 'traveler-1', role: 'user' });
  assert.equal((await (await app.api.GET()).json()).canProceed, true);
  // Approved users reach the original registration validation, not the approval gate.
  assert.equal((await app.register().POST(request({}))).status, 400);
  app.setUser({ id: 'traveler-2', role: 'user' });
  const other = await (await app.api.GET()).json();
  assert.equal(other.introduction, null);
  assert.equal(other.canProceed, false);
  assert.equal((await app.register().POST(request({}))).status, 403);
  assert.ok(!app.queries.some(sql => /UPDATE users|provider_accounts/.test(sql)));
});

test('declining preserves the note and does not unlock registration', async () => {
  const app = setup();
  const { introduction } = await (await app.api.POST(request(details))).json();
  app.setUser({ id: 'admin-1', role: 'admin' });
  assert.equal((await app.admin.PATCH(request({ id: introduction.id, action: 'reject', note: 'Please contact support.' }, 'PATCH'))).status, 200);
  app.setUser({ id: 'traveler-1', role: 'user' });
  const result = await (await app.api.GET()).json();
  assert.equal(result.canProceed, false);
  assert.equal(result.introduction.review_note, 'Please contact support.');
  assert.equal((await app.register().POST(request({}))).status, 403);
});

test('existing applications retain access to their original status screen', async () => {
  const app = setup();
  app.setExisting({ id: 'old-application', status: 'pending' });
  assert.equal((await (await app.api.GET()).json()).canProceed, true);
});

test('invalid submissions and admin decisions do not write to the database', async () => {
  const app = setup();
  assert.equal((await app.api.POST(request({ ...details, phoneNumber: 'bad' }))).status, 400);
  app.setUser({ id: 'admin-1', role: 'admin' });
  for (const body of [null, {}, { id: 'id', action: 'unblock' }, { id: 'id', action: 'approve', note: 3 }]) {
    assert.equal((await app.admin.PATCH(request(body, 'PATCH'))).status, 400);
  }
  assert.equal(app.queries.length, 0);
});
