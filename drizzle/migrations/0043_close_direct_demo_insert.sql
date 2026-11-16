DROP POLICY IF EXISTS "Anyone can request a demo" ON public.demo_requests;
REVOKE INSERT ON public.demo_requests FROM anon, authenticated;
GRANT ALL ON public.demo_requests TO service_role;