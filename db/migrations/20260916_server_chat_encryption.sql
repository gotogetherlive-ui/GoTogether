-- Server-managed chat does not require account/device key tables.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS encryption_version INTEGER NOT NULL DEFAULT 0;
