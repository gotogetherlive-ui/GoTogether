-- These tables are accessed through authenticated Next.js server APIs.
-- No direct Supabase anonymous/authenticated client access is permitted.
ALTER TABLE public.business_introductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
