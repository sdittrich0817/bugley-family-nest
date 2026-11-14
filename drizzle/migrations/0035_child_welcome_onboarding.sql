CREATE TABLE public.onboarding_settings (id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1), welcome_launched_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.onboarding_settings TO service_role;
ALTER TABLE public.onboarding_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.onboarding_settings (id) VALUES (1);

CREATE TABLE public.child_onboarding (
  child_id uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  shown_at timestamptz, skipped_at timestamptz, completed_at timestamptz,
  choice text CHECK (choice IN ('play','create')),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.child_onboarding TO authenticated;
GRANT ALL ON public.child_onboarding TO service_role;
ALTER TABLE public.child_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own children welcome" ON public.child_onboarding FOR SELECT TO authenticated USING (parent_id = auth.uid());

CREATE TABLE public.child_onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('shown','skipped','chose_play','chose_create','replayed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX child_onboarding_events_child_idx ON public.child_onboarding_events (child_id, created_at DESC);
GRANT SELECT ON public.child_onboarding_events TO authenticated;
GRANT ALL ON public.child_onboarding_events TO service_role;
ALTER TABLE public.child_onboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own children welcome events" ON public.child_onboarding_events FOR SELECT TO authenticated USING (parent_id = auth.uid());