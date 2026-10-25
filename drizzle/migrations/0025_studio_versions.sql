CREATE TABLE public.studio_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  creation_id uuid NOT NULL REFERENCES public.studio_creations(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  text text,
  image text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.studio_versions TO service_role;
ALTER TABLE public.studio_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX studio_versions_creation_idx ON public.studio_versions (creation_id, page_key, created_at DESC);