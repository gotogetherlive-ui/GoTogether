ALTER TABLE chat_account_keys ADD COLUMN IF NOT EXISTS setup_mode TEXT NOT NULL DEFAULT 'password';
