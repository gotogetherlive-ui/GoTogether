ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS credit_points NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.traveler_credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT traveler_credit_ledger_source_unique UNIQUE (user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_traveler_credit_ledger_user_created
  ON public.traveler_credit_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_credit_points
  ON public.users(credit_points DESC, created_at ASC)
  WHERE deleted_at IS NULL AND role <> 'super_admin';

-- The ledger remains for backward compatibility. Weekly story rankings are
-- derived from likes received during the active event and do not write here.
