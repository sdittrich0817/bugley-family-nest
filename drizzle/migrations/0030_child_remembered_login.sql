ALTER TABLE public.child_controls ADD COLUMN remember_login text NOT NULL DEFAULT 'always' CHECK (remember_login IN ('always','24_hours'));
GRANT SELECT (remember_login), UPDATE (remember_login), INSERT (remember_login) ON public.child_controls TO authenticated;
GRANT ALL ON public.child_controls TO service_role;