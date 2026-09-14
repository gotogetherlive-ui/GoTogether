-- Admin CRM and WhatsApp Cloud API persistence.
-- Apply before enabling the CRM in production.

CREATE TABLE IF NOT EXISTS crm_customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'customer', 'repeat', 'vip', 'churn_risk')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  owner_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  next_follow_up_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_conversations (
  id TEXT PRIMARY KEY,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp')),
  external_contact_id TEXT NOT NULL,
  contact_name TEXT,
  phone_number TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved')),
  assigned_admin_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  unread_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel, external_contact_id)
);

CREATE TABLE IF NOT EXISTS crm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES crm_conversations(id) ON DELETE CASCADE,
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'received' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'read', 'received', 'failed')),
  sent_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_profiles_stage ON crm_customer_profiles(stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_notes_user_created ON crm_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_activity ON crm_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_messages_conversation_created ON crm_messages(conversation_id, created_at DESC);
