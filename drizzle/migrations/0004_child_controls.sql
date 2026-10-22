CREATE TABLE public.child_controls (
 child_id uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
 parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 daily_minutes integer CHECK (daily_minutes IS NULL OR daily_minutes BETWEEN 10 AND 240),
 studio_stories boolean NOT NULL DEFAULT true,
 studio_games boolean NOT NULL DEFAULT true,
 read_aloud boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.child_controls TO authenticated;
GRANT ALL ON public.child_controls TO service_role;
ALTER TABLE public.child_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own child controls" ON public.child_controls FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents add own child controls" ON public.child_controls FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND public.is_active_parent() AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));
CREATE POLICY "Parents edit own child controls" ON public.child_controls FOR UPDATE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent()) WITH CHECK (parent_id = auth.uid() AND public.is_active_parent() AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()));