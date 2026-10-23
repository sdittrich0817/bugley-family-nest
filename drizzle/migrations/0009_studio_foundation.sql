CREATE TABLE public.studio_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('picture','story','comic','book','character','game')),
  title text NOT NULL DEFAULT 'Untitled',
  project text,
  position integer NOT NULL DEFAULT 0,
  body text,
  images text[] NOT NULL DEFAULT '{}',
  favorite boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_creations_child_idx ON public.studio_creations (child_id, created_at DESC);
GRANT SELECT ON public.studio_creations TO authenticated;
GRANT UPDATE (title, favorite, deleted_at, updated_at) ON public.studio_creations TO authenticated;
GRANT ALL ON public.studio_creations TO service_role;
ALTER TABLE public.studio_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own creations" ON public.studio_creations FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents edit own creations" ON public.studio_creations FOR UPDATE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent()) WITH CHECK (parent_id = auth.uid() AND public.is_active_parent());

CREATE TABLE public.studio_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  source text NOT NULL,
  input text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('allowed','personal_info','unsafe','copyright','error')),
  reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX studio_events_parent_idx ON public.studio_events (parent_id, created_at DESC);
GRANT SELECT ON public.studio_events TO authenticated;
GRANT ALL ON public.studio_events TO service_role;
ALTER TABLE public.studio_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own studio events" ON public.studio_events FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());

CREATE TABLE public.parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  typed text NOT NULL,
  starter text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX parent_notifications_parent_idx ON public.parent_notifications (parent_id, created_at DESC);
GRANT SELECT ON public.parent_notifications TO authenticated;
GRANT UPDATE (read) ON public.parent_notifications TO authenticated;
GRANT ALL ON public.parent_notifications TO service_role;
ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own notifications" ON public.parent_notifications FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents mark own notifications" ON public.parent_notifications FOR UPDATE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent()) WITH CHECK (parent_id = auth.uid());