CREATE TABLE public.family_ai_news (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_url text NOT NULL UNIQUE CHECK (source_url LIKE 'https://%'), title text NOT NULL, publisher text NOT NULL, source_date timestamptz NOT NULL, summary text NOT NULL DEFAULT '', response text NOT NULL DEFAULT '', family_guidance text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','dismissed')), source_reviewed boolean NOT NULL DEFAULT false, published_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT reviewed_before_publishing CHECK (status <> 'published' OR (source_reviewed AND length(trim(response)) > 0 AND length(trim(family_guidance)) > 0 AND published_at IS NOT NULL))
);
GRANT SELECT,INSERT,UPDATE ON public.family_ai_news TO authenticated;
GRANT ALL ON public.family_ai_news TO service_role;
ALTER TABLE public.family_ai_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read published news" ON public.family_ai_news FOR SELECT TO authenticated USING(is_active_parent() AND is_parent_device() AND status='published');
CREATE POLICY "Admins read editorial queue" ON public.family_ai_news FOR SELECT TO authenticated USING(is_parent_device() AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins add news" ON public.family_ai_news FOR INSERT TO authenticated WITH CHECK(is_parent_device() AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins edit news" ON public.family_ai_news FOR UPDATE TO authenticated USING(is_parent_device() AND has_role(auth.uid(),'admin')) WITH CHECK(is_parent_device() AND has_role(auth.uid(),'admin'));
CREATE INDEX family_ai_news_status_date ON public.family_ai_news(status,source_date DESC);