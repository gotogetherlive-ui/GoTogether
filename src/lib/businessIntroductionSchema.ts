// Keep in sync with db/migrations/20260912_business_introductions.sql.
export const BUSINESS_INTRODUCTION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS business_introductions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  travel_name TEXT NOT NULL,
  company_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_seen INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS business_introductions_review_idx ON business_introductions(status, created_at DESC);
`;
