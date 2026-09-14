import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("CRM page and APIs enforce server-side admin authorization", () => {
  const page = read("src/app/admin/crm/page.tsx");
  const overview = read("src/app/api/admin/crm/route.ts");
  const customer = read("src/app/api/admin/crm/customers/[id]/route.ts");
  const conversation = read("src/app/api/admin/crm/conversations/[id]/route.ts");

  for (const source of [page, overview, customer, conversation]) {
    assert.match(source, /isAdminUser/);
    assert.match(source, /getSession/);
  }
  assert.match(page, /redirect\("\/login\?next=\/admin\/crm"\)/);
});

test("WhatsApp webhook validates signatures and ingestion is idempotent", () => {
  const webhook = read("src/app/api/webhooks/whatsapp/route.ts");
  const integration = read("src/lib/whatsapp.ts");
  const proxy = read("src/proxy.ts");

  assert.match(webhook, /request\.text\(\)/);
  assert.match(webhook, /verifyWhatsAppSignature/);
  assert.match(webhook, /ON CONFLICT \(provider_message_id\) DO NOTHING/);
  assert.match(integration, /timingSafeEqual/);
  assert.match(integration, /AbortSignal\.timeout/);
  assert.match(proxy, /\/api\/webhooks\/whatsapp/);
});

test("CRM migration preserves message identity and relational ownership", () => {
  const migration = read("db/migrations/20260911_admin_crm.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS crm_customer_profiles/);
  assert.match(migration, /provider_message_id TEXT UNIQUE/);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /CHECK \(direction IN \('inbound', 'outbound'\)\)/);
});

test("outbound WhatsApp replies enforce service window and admin rate limit", () => {
  const route = read("src/app/api/admin/crm/conversations/[id]/route.ts");
  assert.match(route, /24 \* 60 \* 60 \* 1000/);
  assert.match(route, /INTERVAL '1 minute'/);
  assert.match(route, />= 20/);
  assert.match(route, /status: 429/);
});
