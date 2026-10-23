ALTER TABLE public.children ADD COLUMN IF NOT EXISTS bug jsonb;
GRANT SELECT (bug) ON public.children TO authenticated;
GRANT UPDATE (bug) ON public.children TO authenticated;
COMMENT ON COLUMN public.children.avatar IS 'DEPRECATED: replaced by bug (kid-built bug avatar); kept for history';