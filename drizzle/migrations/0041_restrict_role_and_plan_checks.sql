-- Ordinary callers (anon / authenticated) may only ask about their own account; admins may ask about anyone.
-- Trusted server contexts (service_role, direct database jobs) keep unrestricted checks.
CREATE OR REPLACE FUNCTION public.caller_may_inspect(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    NOT (current_setting('role', true) IN ('anon','authenticated') OR coalesce(auth.role(), '') IN ('anon','authenticated'))
    OR (_user_id IS NOT NULL AND _user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)
$$;
REVOKE ALL ON FUNCTION public.caller_may_inspect(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caller_may_inspect(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
     AND public.caller_may_inspect(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.caller_may_inspect(user_uuid) AND EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id = user_uuid AND environment = check_env AND (
      (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())))
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated, service_role;