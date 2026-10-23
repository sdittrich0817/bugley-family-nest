ALTER TABLE public.child_controls ADD COLUMN spelling_help boolean NOT NULL DEFAULT false;
GRANT SELECT (spelling_help), INSERT (spelling_help), UPDATE (spelling_help) ON public.child_controls TO authenticated;
GRANT ALL ON public.child_controls TO service_role;