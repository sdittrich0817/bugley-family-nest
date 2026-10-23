ALTER TABLE public.image_models DROP CONSTRAINT IF EXISTS image_models_mode_check;
ALTER TABLE public.image_models ADD CONSTRAINT image_models_mode_check CHECK (mode IN ('sketch','final','character','hero','sheet','scene_chars','scene'));
ALTER TABLE public.image_models ADD COLUMN IF NOT EXISTS supports_reference boolean NOT NULL DEFAULT false;
UPDATE public.image_models SET supports_reference = (settings ? 'reference_field');
INSERT INTO public.image_models (mode, model, version, settings, supports_reference)
SELECT 'hero', model, version, settings, supports_reference FROM public.image_models WHERE mode='character' ON CONFLICT DO NOTHING;
INSERT INTO public.image_models (mode, model, version, settings, supports_reference)
SELECT 'sheet', model, version, settings, supports_reference FROM public.image_models WHERE mode='character' ON CONFLICT DO NOTHING;
INSERT INTO public.image_models (mode, model, version, settings, supports_reference)
SELECT 'scene_chars', model, version, settings, supports_reference FROM public.image_models WHERE mode='final' ON CONFLICT DO NOTHING;
INSERT INTO public.image_models (mode, model, version, settings, supports_reference)
SELECT 'scene', model, version, settings, supports_reference FROM public.image_models WHERE mode='final' ON CONFLICT DO NOTHING;

CREATE TABLE public.drift_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  model text NOT NULL,
  style_key text NOT NULL,
  attempt int NOT NULL,
  passed boolean NOT NULL,
  score int NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drift_checks TO authenticated;
GRANT ALL ON public.drift_checks TO service_role;
ALTER TABLE public.drift_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads drift checks" ON public.drift_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));