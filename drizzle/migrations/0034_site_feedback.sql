CREATE TABLE public.site_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text CHECK (email IS NULL OR length(email) <= 254),
  page text NOT NULL CHECK (length(page) <= 300),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  topic text NOT NULL DEFAULT 'general' CHECK (topic IN ('general','bug','confusing','idea','kids','payments')),
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 3000),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.site_feedback TO authenticated;
GRANT ALL ON public.site_feedback TO service_role;
ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feedback" ON public.site_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins resolve feedback" ON public.site_feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));