CREATE TABLE public.family_glow_settings (
 parent_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 plan text NOT NULL DEFAULT 'family' CHECK (plan IN ('family','family_plus')),
 timezone text NOT NULL DEFAULT 'America/New_York',
 monthly_ceiling integer CHECK (monthly_ceiling IS NULL OR monthly_ceiling >= 0),
 alerted_month text,
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.child_glow (
 child_id uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
 parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 daily_balance integer NOT NULL DEFAULT 0 CHECK (daily_balance >= 0),
 bonus_balance integer NOT NULL DEFAULT 0 CHECK (bonus_balance >= 0),
 refill_date date);
CREATE TABLE public.glow_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
 parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('refill','spend','bonus')),
 amount integer NOT NULL,
 reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX glow_ledger_parent_time ON public.glow_ledger(parent_id, created_at);
CREATE TABLE public.admin_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 parent_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 message text NOT NULL,
 resolved boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT ON public.family_glow_settings, public.child_glow, public.glow_ledger TO authenticated;
GRANT UPDATE (monthly_ceiling, plan) ON public.family_glow_settings TO authenticated;
GRANT SELECT, UPDATE ON public.admin_alerts TO authenticated;
GRANT ALL ON public.family_glow_settings, public.child_glow, public.glow_ledger, public.admin_alerts TO service_role;
ALTER TABLE public.family_glow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_glow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glow_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own glow settings" ON public.family_glow_settings FOR SELECT TO authenticated USING ((parent_id = auth.uid() AND public.is_active_parent()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins set glow settings" ON public.family_glow_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents read own child glow" ON public.child_glow FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents read own glow ledger" ON public.glow_ledger FOR SELECT TO authenticated USING ((parent_id = auth.uid() AND public.is_active_parent()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read alerts" ON public.admin_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins resolve alerts" ON public.admin_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.family_glow_settings (parent_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;
CREATE FUNCTION public.create_family_glow_settings() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.family_glow_settings (parent_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; RETURN NEW; END; $$;
CREATE TRIGGER create_family_glow_settings AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_family_glow_settings();

-- Internal: refill a child's daily glow when the family's local date has moved on. Unused daily glow is replaced, not added.
CREATE FUNCTION public.glow_refill(_child uuid) RETURNS public.child_glow LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; s public.family_glow_settings; today date; allowance int; g public.child_glow;
BEGIN
 SELECT parent_id INTO p FROM public.children WHERE id = _child;
 IF p IS NULL THEN RAISE EXCEPTION 'child not found'; END IF;
 INSERT INTO public.family_glow_settings (parent_id) VALUES (p) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = p;
 today := (now() AT TIME ZONE s.timezone)::date;
 allowance := CASE s.plan WHEN 'family_plus' THEN 20 ELSE 10 END;
 INSERT INTO public.child_glow (child_id, parent_id) VALUES (_child, p) ON CONFLICT DO NOTHING;
 SELECT * INTO g FROM public.child_glow WHERE child_id = _child FOR UPDATE;
 IF g.refill_date IS NULL OR g.refill_date < today THEN
  UPDATE public.child_glow SET daily_balance = allowance, refill_date = today WHERE child_id = _child RETURNING * INTO g;
  INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, p, 'refill', allowance, 'Nightly refill');
 END IF;
 RETURN g;
END; $$;

CREATE FUNCTION public.glow_status(_child uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow; s public.family_glow_settings;
BEGIN
 g := public.glow_refill(_child);
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = g.parent_id;
 RETURN jsonb_build_object('daily', g.daily_balance, 'bonus', g.bonus_balance, 'total', g.daily_balance + g.bonus_balance, 'allowance', CASE s.plan WHEN 'family_plus' THEN 20 ELSE 10 END);
END; $$;

CREATE FUNCTION public.glow_spend(_child uuid, _kind text, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow; s public.family_glow_settings; cost int; month_start timestamptz; spent int; from_daily int; mkey text;
BEGIN
 cost := CASE _kind WHEN 'sketch' THEN 1 WHEN 'picture' THEN 3 ELSE NULL END;
 IF cost IS NULL THEN RAISE EXCEPTION 'unknown glow kind'; END IF;
 g := public.glow_refill(_child);
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = g.parent_id FOR UPDATE;
 month_start := date_trunc('month', now() AT TIME ZONE s.timezone) AT TIME ZONE s.timezone;
 mkey := to_char(now() AT TIME ZONE s.timezone, 'YYYY-MM');
 SELECT COALESCE(-SUM(amount), 0) INTO spent FROM public.glow_ledger WHERE parent_id = g.parent_id AND kind = 'spend' AND created_at >= month_start;
 IF s.monthly_ceiling IS NOT NULL AND spent + cost > s.monthly_ceiling THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'family_limit', 'total', g.daily_balance + g.bonus_balance);
 END IF;
 IF g.daily_balance + g.bonus_balance < cost THEN
  RETURN jsonb_build_object('ok', false, 'reason', 'not_enough', 'total', g.daily_balance + g.bonus_balance);
 END IF;
 from_daily := LEAST(g.daily_balance, cost);
 UPDATE public.child_glow SET daily_balance = daily_balance - from_daily, bonus_balance = bonus_balance - (cost - from_daily) WHERE child_id = _child RETURNING * INTO g;
 INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, g.parent_id, 'spend', -cost, left(COALESCE(_reason, _kind), 200));
 IF s.monthly_ceiling IS NOT NULL AND s.monthly_ceiling > 0 AND (spent + cost) >= 0.8 * s.monthly_ceiling AND s.alerted_month IS DISTINCT FROM mkey THEN
  UPDATE public.family_glow_settings SET alerted_month = mkey WHERE parent_id = g.parent_id;
  INSERT INTO public.admin_alerts (parent_id, message) VALUES (g.parent_id, format('Family has used %s of its %s glow ceiling for %s.', spent + cost, s.monthly_ceiling, mkey));
 END IF;
 RETURN jsonb_build_object('ok', true, 'cost', cost, 'total', g.daily_balance + g.bonus_balance);
END; $$;

CREATE FUNCTION public.glow_gift(_child uuid, _amount int, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow;
BEGIN
 IF _amount < 1 OR _amount > 20 THEN RAISE EXCEPTION 'gift must be 1-20'; END IF;
 g := public.glow_refill(_child);
 UPDATE public.child_glow SET bonus_balance = bonus_balance + _amount WHERE child_id = _child RETURNING * INTO g;
 INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, g.parent_id, 'bonus', _amount, left(COALESCE(NULLIF(btrim(_reason), ''), 'Bonus from a parent'), 200));
 RETURN jsonb_build_object('total', g.daily_balance + g.bonus_balance);
END; $$;

CREATE FUNCTION public.set_family_timezone(_tz text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.is_active_parent() THEN RAISE EXCEPTION 'not allowed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN RAISE EXCEPTION 'unknown time zone'; END IF;
 INSERT INTO public.family_glow_settings (parent_id, timezone) VALUES (auth.uid(), _tz) ON CONFLICT (parent_id) DO UPDATE SET timezone = EXCLUDED.timezone, updated_at = now();
END; $$;

REVOKE ALL ON FUNCTION public.glow_refill(uuid), public.glow_status(uuid), public.glow_spend(uuid, text, text), public.glow_gift(uuid, int, text), public.create_family_glow_settings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.glow_status(uuid), public.glow_spend(uuid, text, text), public.glow_gift(uuid, int, text) TO service_role;
REVOKE ALL ON FUNCTION public.set_family_timezone(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_family_timezone(text) TO authenticated;