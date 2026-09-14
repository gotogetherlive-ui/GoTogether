import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('Google callback rejects a deleted identity before updates or session creation', async () => {
  const source = readFileSync('src/app/api/auth/google/callback/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const writes = [];
  const exports = {};
  const dependencies = {
    'next/server': { NextResponse: { redirect: location => ({ location }) } },
    uuid: { v4: () => 'new-user' },
    '@/lib/db': { queryOne: async () => ({ id: 'deleted-user', google_id: 'google-user', deleted_at: '2026-09-01' }), run: async (...args) => writes.push(args) },
    '@/lib/auth': { createSession: async (...args) => writes.push(args) },
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'valid-state' }), delete() {} }) },
    '@/lib/googleOAuth': { getGoogleRedirectOrigin: () => 'https://example.test', getGoogleRedirectUri: () => 'https://example.test/api/auth/google/callback' },
  };
  const sandbox = { exports, require: id => {
    assert.ok(dependencies[id], `Unexpected dependency ${id}`);
    return dependencies[id];
  }, URL, URLSearchParams, process: { env: {} }, console,
    fetch: async url => ({ ok: true, json: async () => String(url).includes('/token')
      ? { access_token: 'dummy-token' }
      : { id: 'google-user', email: 'deleted@example.test', verified_email: true, name: 'Deleted User' } }),
  };
  vm.runInNewContext(compiled, sandbox);
  const response = await exports.GET(new Request('https://example.test/api/auth/google/callback?code=dummy&state=valid-state'));
  assert.equal(response.location, 'https://example.test/login?error=account_deleted');
  assert.deepEqual(writes, []);
});
