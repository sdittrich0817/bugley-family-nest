CREATE TABLE public.glow_ops (
  child_id uuid NOT NULL,
  op text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_id, op)
);
GRANT ALL ON public.glow_ops TO service_role;
ALTER TABLE public.glow_ops ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.glow_spend(_child uuid, _kind text, _reason text, _op text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow; s public.family_glow_settings; cost int; month_start timestamptz; spent int; from_daily int; mkey text; res jsonb; seen jsonb;
BEGIN
 IF _op IS NOT NULL THEN
  SELECT result INTO seen FROM public.glow_ops WHERE child_id = _child AND op = _op;
  IF seen IS NOT NULL THEN RETURN seen || '{"duplicate": true}'::jsonb; END IF;
 END IF;
 cost := CASE _kind WHEN 'sketch' THEN 1 WHEN 'picture' THEN 3 WHEN 'picture_upgrade' THEN 2 ELSE NULL END;
 IF cost IS NULL THEN RAISE EXCEPTION 'unknown glow kind'; END IF;
 g := public.glow_refill(_child);
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = g.parent_id FOR UPDATE;
 month_start := date_trunc('month', now() AT TIME ZONE s.timezone) AT TIME ZONE s.timezone;
 mkey := to_char(now() AT TIME ZONE s.timezone, 'YYYY-MM');
 SELECT COALESCE(-SUM(amount), 0) INTO spent FROM public.glow_ledger WHERE parent_id = g.parent_id AND kind = 'spend' AND created_at >= month_start;
 IF s.monthly_ceiling IS NOT NULL AND spent + cost > s.monthly_ceiling THEN res := jsonb_build_object('ok', false, 'reason', 'family_limit', 'total', g.daily_balance + g.bonus_balance);
 ELSIF g.daily_balance + g.bonus_balance < cost THEN res := jsonb_build_object('ok', false, 'reason', 'not_enough', 'total', g.daily_balance + g.bonus_balance);
 ELSE
  from_daily := LEAST(g.daily_balance, cost);
  UPDATE public.child_glow SET daily_balance = daily_balance - from_daily, bonus_balance = bonus_balance - (cost - from_daily) WHERE child_id = _child RETURNING * INTO g;
  INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, g.parent_id, 'spend', -cost, left(COALESCE(_reason, _kind), 200));
  IF s.monthly_ceiling IS NOT NULL AND s.monthly_ceiling > 0 AND (spent + cost) >= 0.8 * s.monthly_ceiling AND s.alerted_month IS DISTINCT FROM mkey THEN
   UPDATE public.family_glow_settings SET alerted_month = mkey WHERE parent_id = g.parent_id;
   INSERT INTO public.admin_alerts (parent_id, message) VALUES (g.parent_id, format('Family has used %s of its %s glow ceiling for %s.', spent + cost, s.monthly_ceiling, mkey));
  END IF;
  res := jsonb_build_object('ok', true, 'cost', cost, 'total', g.daily_balance + g.bonus_balance);
 END IF;
 IF _op IS NOT NULL THEN INSERT INTO public.glow_ops (child_id, op, result) VALUES (_child, _op, res) ON CONFLICT (child_id, op) DO NOTHING; END IF;
 RETURN res;
END; $$;
REVOKE ALL ON FUNCTION public.glow_spend(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.glow_spend(uuid,text,text,text) TO service_role;

CREATE FUNCTION public.glow_refund(_child uuid, _amount int, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.child_glow; s public.family_glow_settings; allowance int; to_daily int;
BEGIN
 IF _amount IS NULL OR _amount < 1 OR _amount > 10 THEN RAISE EXCEPTION 'bad refund amount'; END IF;
 SELECT * INTO g FROM public.child_glow WHERE child_id = _child FOR UPDATE;
 IF g IS NULL THEN RAISE EXCEPTION 'child not found'; END IF;
 SELECT * INTO s FROM public.family_glow_settings WHERE parent_id = g.parent_id;
 allowance := CASE s.plan WHEN 'family_plus' THEN 20 ELSE 10 END;
 to_daily := LEAST(GREATEST(allowance - g.daily_balance, 0), _amount);
 UPDATE public.child_glow SET daily_balance = daily_balance + to_daily, bonus_balance = bonus_balance + (_amount - to_daily) WHERE child_id = _child RETURNING * INTO g;
 INSERT INTO public.glow_ledger (child_id, parent_id, kind, amount, reason) VALUES (_child, g.parent_id, 'refund', _amount, left(COALESCE(_reason, 'refund'), 200));
 RETURN jsonb_build_object('total', g.daily_balance + g.bonus_balance);
END; $$;
REVOKE ALL ON FUNCTION public.glow_refund(uuid,int,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.glow_refund(uuid,int,text) TO service_role;