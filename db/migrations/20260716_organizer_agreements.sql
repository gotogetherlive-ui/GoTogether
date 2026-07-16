BEGIN;

CREATE TABLE IF NOT EXISTS public.organizer_agreements (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL UNIQUE REFERENCES public.business_applications(id) ON DELETE RESTRICT,
  organizer_user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  agreement_title TEXT NOT NULL,
  agreement_version TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  accepted INTEGER NOT NULL CHECK (accepted = 1),
  signed_at TIMESTAMPTZ NOT NULL,
  signer_ip TEXT,
  signer_user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizer_agreements_user
  ON public.organizer_agreements(organizer_user_id, signed_at DESC);

COMMIT;
