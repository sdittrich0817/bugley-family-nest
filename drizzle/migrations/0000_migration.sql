CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  kids_count integer NOT NULL CHECK (kids_count BETWEEN 0 AND 20),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist_signups
  FOR INSERT TO anon, authenticated WITH CHECK (true);