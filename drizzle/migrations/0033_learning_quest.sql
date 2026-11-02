ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_step_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_step_check CHECK (step = ANY (ARRAY['warmup','make','break','think','story','try','idea','campfire']));
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'done' CHECK (kind IN ('done','choice','free'));
ALTER TABLE public.activity_versions ADD COLUMN IF NOT EXISTS choices jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'series' CHECK (kind IN ('series','news'));
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS source_news_id uuid REFERENCES public.family_ai_news(id) ON DELETE SET NULL;

CREATE TABLE public.quest_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  answer text NOT NULL,
  correct boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (child_id, activity_id)
);
GRANT SELECT ON public.quest_responses TO authenticated;
GRANT ALL ON public.quest_responses TO service_role;
ALTER TABLE public.quest_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own quest answers" ON public.quest_responses FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());