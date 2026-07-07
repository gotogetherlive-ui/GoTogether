-- Multi-provider organizer payment onboarding fields for Mode A and Mode B.
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'RAZORPAY';
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS provider_account_holder_name TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS provider_registered_email TEXT;
ALTER TABLE public.business_applications ADD COLUMN IF NOT EXISTS provider_registered_phone TEXT;

UPDATE public.business_applications
SET provider_account_id = COALESCE(provider_account_id, razorpay_account_id),
    provider_account_holder_name = COALESCE(provider_account_holder_name, razorpay_account_holder_name),
    provider_registered_email = COALESCE(provider_registered_email, razorpay_account_email),
    provider_registered_phone = COALESCE(provider_registered_phone, razorpay_account_phone)
WHERE payment_provider = 'RAZORPAY';
