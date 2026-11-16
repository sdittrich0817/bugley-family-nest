CREATE OR REPLACE FUNCTION public.caller_may_inspect(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    NOT (coalesce(current_setting('role', true), '') IN ('anon','authenticated') OR coalesce(auth.role(), '') IN ('anon','authenticated'))
    OR (_user_id IS NOT NULL AND auth.uid() IS NOT NULL AND _user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role),
  false)
$$;
REVOKE ALL ON FUNCTION public.caller_may_inspect(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caller_may_inspect(uuid) TO service_role;