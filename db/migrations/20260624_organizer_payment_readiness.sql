-- Organizer-owned payment readiness fields.
-- GoTogether does not collect commission or hold settlement funds in this model.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razorpay_account_verified_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_enabled INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS razorpay_account_holder_name TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS razorpay_account_email TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS razorpay_account_phone TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS payment_settlement_model TEXT NOT NULL DEFAULT 'organizer_direct';
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS payment_terms_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS payment_onboarding_status TEXT NOT NULL DEFAULT 'pending_review';

UPDATE public.users u
SET payment_enabled = 1,
    razorpay_account_verified_at = COALESCE(razorpay_account_verified_at, NOW())
WHERE u.role = 'business'
  AND u.razorpay_account_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.business_applications b
    WHERE b.user_id = u.id AND b.status = 'approved'
  );
