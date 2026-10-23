CREATE OR REPLACE FUNCTION public.glow_spend(_child uuid, _kind text, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow; s public.family_glow_settings; cost int; month_start timestamptz; spent int; from_daily int; mkey text;
BEGIN
 cost := CASE _kind WHEN 'sketch' THEN 1 WHEN 'picture' THEN 3 WHEN 'picture_upgrade' THEN 2 ELSE NULL END;
 IF cost IS NULL THEN RAISE EXCEPTION 'unknown glow kind'; END IF;
 g := public.glow_refill(_child);
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = g.parent_id FOR UPDATE;
 month_start := date_trunc('month', now() AT TIME ZONE s.timezone) AT TIME ZONE s.timezone;
 mkey := to_char(now() AT TIME ZONE s.timezone, 'YYYY-MM');
 SELECT COALESCE(-SUM(amount), 0) INTO spent FROM public.glow_ledger WHERE parent_id = g.parent_id AND kind = 'spend' AND created_at >= month_start;
 IF s.monthly_ceiling IS NOT NULL AND spent + cost > s.monthly_ceiling THEN RETURN jsonb_build_object('ok', false, 'reason', 'family_limit', 'total', g.daily_balance + g.bonus_balance); END IF;
 IF g.daily_balance + g.bonus_balance < cost THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_enough', 'total', g.daily_balance + g.bonus_balance); END IF;
 from_daily := LEAST(g.daily_balance, cost);
 UPDATE public.child_glow SET daily_balance = daily_balance - from_daily, bonus_balance = bonus_balance - (cost - from_daily) WHERE child_id = _child RETURNING * INTO g;
 INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, g.parent_id, 'spend', -cost, left(COALESCE(_reason, _kind), 200));
 IF s.monthly_ceiling IS NOT NULL AND s.monthly_ceiling > 0 AND (spent + cost) >= 0.8 * s.monthly_ceiling AND s.alerted_month IS DISTINCT FROM mkey THEN
 UPDATE public.family_glow_settings SET alerted_month = mkey WHERE parent_id = g.parent_id;
 INSERT INTO public.admin_alerts (parent_id, message) VALUES (g.parent_id, format('Family has used %s of its %s glow ceiling for %s.', spent + cost, s.monthly_ceiling, mkey)); END IF;
 RETURN jsonb_build_object('ok', true, 'cost', cost, 'total', g.daily_balance + g.bonus_balance);
END; $$;
REVOKE ALL ON FUNCTION public.glow_spend(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.glow_spend(uuid,text,text) TO service_role;