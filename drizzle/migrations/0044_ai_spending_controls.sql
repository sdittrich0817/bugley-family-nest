CREATE TABLE public.ai_spend_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  platform_daily_credits numeric, platform_monthly_credits numeric,
  platform_daily_usd numeric, platform_monthly_usd numeric,
  family_monthly_credits numeric, family_monthly_usd numeric,
  per_op_max_credits numeric, per_op_max_usd numeric,
  alert_ratio numeric NOT NULL DEFAULT 0.8,
  pause_all boolean NOT NULL DEFAULT false,
  pause_drawing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
INSERT INTO public.ai_spend_settings (id) VALUES (1);

CREATE TABLE public.ai_spend_test_sessions (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 3 AND 60),
  cap_usd numeric NOT NULL CHECK (cap_usd >= 0),
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_spend_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  op_kind text NOT NULL,
  op_key text,
  parent_id uuid, child_id uuid, test_session text,
  draws boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('reserved','settled','released','unknown','blocked')),
  block_reason text,
  reserved_credits numeric NOT NULL DEFAULT 0, reserved_usd numeric NOT NULL DEFAULT 0,
  actual_credits numeric, actual_usd numeric,
  credits_source text, usd_source text,
  ai_calls int NOT NULL DEFAULT 0, draw_calls int NOT NULL DEFAULT 0, retries int NOT NULL DEFAULT 0,
  succeeded boolean,
  created_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz
);
CREATE UNIQUE INDEX ai_spend_active_op ON public.ai_spend_ledger (op_key) WHERE status = 'reserved' AND op_key IS NOT NULL;
CREATE INDEX ai_spend_ledger_created ON public.ai_spend_ledger (created_at);
CREATE INDEX ai_spend_ledger_parent ON public.ai_spend_ledger (parent_id, created_at);

CREATE TABLE public.ai_spend_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL, period text NOT NULL, scope text NOT NULL DEFAULT 'platform',
  used numeric NOT NULL, cap numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, period, scope)
);

GRANT SELECT, UPDATE ON public.ai_spend_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_spend_test_sessions TO authenticated;
GRANT SELECT ON public.ai_spend_ledger TO authenticated;
GRANT SELECT ON public.ai_spend_alerts TO authenticated;
GRANT ALL ON public.ai_spend_settings, public.ai_spend_test_sessions, public.ai_spend_ledger, public.ai_spend_alerts TO service_role;

ALTER TABLE public.ai_spend_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_spend_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_spend_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_spend_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read spend settings" ON public.ai_spend_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins edit spend settings" ON public.ai_spend_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read test sessions" ON public.ai_spend_test_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins add test sessions" ON public.ai_spend_test_sessions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins edit test sessions" ON public.ai_spend_test_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read spend ledger" ON public.ai_spend_ledger FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins read spend alerts" ON public.ai_spend_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Counts settled actuals plus every open or unknown reservation at its full reserved amount (conservative).
CREATE OR REPLACE FUNCTION public.ai_spend_used(_from timestamptz, _parent uuid DEFAULT NULL, _test text DEFAULT NULL)
RETURNS TABLE (credits numeric, usd numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(CASE WHEN status='settled' THEN coalesce(actual_credits, reserved_credits) ELSE reserved_credits END),0),
         coalesce(sum(CASE WHEN status='settled' THEN coalesce(actual_usd, reserved_usd) ELSE reserved_usd END),0)
  FROM ai_spend_ledger
  WHERE status IN ('reserved','settled','unknown') AND created_at >= _from
    AND (_parent IS NULL OR parent_id = _parent) AND (_test IS NULL OR test_session = _test);
$$;

CREATE OR REPLACE FUNCTION public.ai_spend_reserve(_op_kind text, _op_key text, _parent uuid, _child uuid, _test text, _credits numeric, _usd numeric, _draws boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s ai_spend_settings; d record; m record; f record; t record; ts ai_spend_test_sessions; reason text; rid uuid;
  day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
  IF _credits < 0 OR _usd < 0 THEN RAISE EXCEPTION 'invalid reservation'; END IF;
  SELECT * INTO s FROM ai_spend_settings WHERE id = 1 FOR UPDATE; -- serializes every reservation
  -- Stale open reservations become unknown; they keep counting at full reserved cost.
  UPDATE ai_spend_ledger SET status='unknown' WHERE status='reserved' AND created_at < now() - interval '30 minutes';
  IF _op_key IS NOT NULL AND EXISTS (SELECT 1 FROM ai_spend_ledger WHERE op_key=_op_key AND status='reserved') THEN reason := 'duplicate';
  ELSIF s.pause_all THEN reason := 'paused_all';
  ELSIF _draws AND s.pause_drawing THEN reason := 'paused_drawing';
  ELSIF s.per_op_max_credits IS NOT NULL AND _credits > s.per_op_max_credits THEN reason := 'per_op_credits';
  ELSIF s.per_op_max_usd IS NOT NULL AND _usd > s.per_op_max_usd THEN reason := 'per_op_usd';
  END IF;
  IF reason IS NULL THEN
    SELECT * INTO d FROM ai_spend_used(day_start);
    SELECT * INTO m FROM ai_spend_used(month_start);
    IF s.platform_daily_credits IS NOT NULL AND d.credits + _credits > s.platform_daily_credits THEN reason := 'platform_daily_credits';
    ELSIF s.platform_daily_usd IS NOT NULL AND d.usd + _usd > s.platform_daily_usd THEN reason := 'platform_daily_usd';
    ELSIF s.platform_monthly_credits IS NOT NULL AND m.credits + _credits > s.platform_monthly_credits THEN reason := 'platform_monthly_credits';
    ELSIF s.platform_monthly_usd IS NOT NULL AND m.usd + _usd > s.platform_monthly_usd THEN reason := 'platform_monthly_usd';
    END IF;
  END IF;
  IF reason IS NULL AND _parent IS NOT NULL AND (s.family_monthly_credits IS NOT NULL OR s.family_monthly_usd IS NOT NULL) THEN
    SELECT * INTO f FROM ai_spend_used(month_start, _parent);
    IF s.family_monthly_credits IS NOT NULL AND f.credits + _credits > s.family_monthly_credits THEN reason := 'family_monthly_credits';
    ELSIF s.family_monthly_usd IS NOT NULL AND f.usd + _usd > s.family_monthly_usd THEN reason := 'family_monthly_usd';
    END IF;
  END IF;
  IF reason IS NULL AND _test IS NOT NULL THEN
    SELECT * INTO ts FROM ai_spend_test_sessions WHERE key = _test;
    IF ts.key IS NULL OR ts.closed THEN reason := 'test_session_closed';
    ELSE
      SELECT * INTO t FROM ai_spend_used('-infinity', NULL, _test);
      -- Test caps are in dollars; credits are counted at the assumed 1 credit = $1.
      IF t.usd + t.credits + _usd + _credits > ts.cap_usd THEN reason := 'test_session_cap'; END IF;
    END IF;
  END IF;
  IF reason IS NOT NULL THEN
    INSERT INTO ai_spend_ledger (op_kind, op_key, parent_id, child_id, test_session, draws, status, block_reason, reserved_credits, reserved_usd, settled_at)
    VALUES (_op_kind, NULL, _parent, _child, _test, _draws, 'blocked', reason, _credits, _usd, now());
    RETURN jsonb_build_object('ok', false, 'reason', reason);
  END IF;
  INSERT INTO ai_spend_ledger (op_kind, op_key, parent_id, child_id, test_session, draws, status, reserved_credits, reserved_usd)
  VALUES (_op_kind, _op_key, _parent, _child, _test, _draws, 'reserved', _credits, _usd) RETURNING id INTO rid;
  -- Alerts once per period when usage crosses the alert threshold.
  SELECT * INTO d FROM ai_spend_used(day_start);
  SELECT * INTO m FROM ai_spend_used(month_start);
  IF s.platform_daily_credits > 0 AND d.credits >= s.alert_ratio * s.platform_daily_credits THEN INSERT INTO ai_spend_alerts (kind, period, used, cap) VALUES ('platform_daily_credits', to_char(day_start,'YYYY-MM-DD'), d.credits, s.platform_daily_credits) ON CONFLICT DO NOTHING; END IF;
  IF s.platform_daily_usd > 0 AND d.usd >= s.alert_ratio * s.platform_daily_usd THEN INSERT INTO ai_spend_alerts (kind, period, used, cap) VALUES ('platform_daily_usd', to_char(day_start,'YYYY-MM-DD'), d.usd, s.platform_daily_usd) ON CONFLICT DO NOTHING; END IF;
  IF s.platform_monthly_credits > 0 AND m.credits >= s.alert_ratio * s.platform_monthly_credits THEN INSERT INTO ai_spend_alerts (kind, period, used, cap) VALUES ('platform_monthly_credits', to_char(month_start,'YYYY-MM'), m.credits, s.platform_monthly_credits) ON CONFLICT DO NOTHING; END IF;
  IF s.platform_monthly_usd > 0 AND m.usd >= s.alert_ratio * s.platform_monthly_usd THEN INSERT INTO ai_spend_alerts (kind, period, used, cap) VALUES ('platform_monthly_usd', to_char(month_start,'YYYY-MM'), m.usd, s.platform_monthly_usd) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('ok', true, 'id', rid);
END $$;

-- Settles once: only an open (or timed-out unknown) reservation can be settled; repeats are ignored.
CREATE OR REPLACE FUNCTION public.ai_spend_settle(_id uuid, _status text, _credits numeric, _usd numeric, _credits_source text, _usd_source text, _ai_calls int, _draw_calls int, _retries int, _succeeded boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF _status NOT IN ('settled','released','unknown') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE ai_spend_ledger SET status = _status,
    actual_credits = CASE WHEN _status='unknown' THEN NULL ELSE _credits END,
    actual_usd = CASE WHEN _status='unknown' THEN NULL ELSE _usd END,
    credits_source = _credits_source, usd_source = _usd_source,
    ai_calls = _ai_calls, draw_calls = _draw_calls, retries = _retries, succeeded = _succeeded, settled_at = now()
  WHERE id = _id AND status IN ('reserved','unknown');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END $$;

REVOKE ALL ON FUNCTION public.ai_spend_used(timestamptz, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_spend_reserve(text, text, uuid, uuid, text, numeric, numeric, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_spend_settle(uuid, text, numeric, numeric, text, text, int, int, int, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_spend_used(timestamptz, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_spend_reserve(text, text, uuid, uuid, text, numeric, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_spend_settle(uuid, text, numeric, numeric, text, text, int, int, int, boolean) TO service_role;