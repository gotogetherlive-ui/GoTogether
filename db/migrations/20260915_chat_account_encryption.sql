CREATE TABLE IF NOT EXISTS chat_account_keys (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  public_key TEXT NOT NULL,
  private_key_backup TEXT NOT NULL,
  recovery_key_backup TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER NOT NULL DEFAULT 0;
