CREATE TABLE public.service_notices (
  key text PRIMARY KEY CHECK (key IN ('drawing')),
  active boolean NOT NULL DEFAULT false,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.service_notices IS 'Temporary on/off notices shown to children (e.g. drawing service resting). Toggle active; no code change needed.';
ALTER TABLE public.service_notices ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.service_notices TO anon, authenticated;
GRANT ALL ON public.service_notices TO service_role;
CREATE POLICY "Anyone can read active notices" ON public.service_notices FOR SELECT TO anon, authenticated USING (active);