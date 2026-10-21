CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_name text NOT NULL,
  email text NOT NULL,
  group_name text NOT NULL,
  city_state text NOT NULL,
  families_count integer NOT NULL,
  age_range text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.demo_requests TO anon, authenticated;
GRANT ALL ON public.demo_requests TO service_role;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request a demo" ON public.demo_requests FOR INSERT TO anon, authenticated WITH CHECK (true);