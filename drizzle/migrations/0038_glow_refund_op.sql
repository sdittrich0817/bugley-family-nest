CREATE OR REPLACE FUNCTION public.glow_refund_op(_child uuid, _op text, _reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE spend jsonb; cost int; inserted int; res jsonb;
BEGIN
 IF _op IS NULL OR length(_op) < 8 OR length(_op) > 200 THEN RAISE EXCEPTION 'bad op'; END IF;
 SELECT result INTO spend FROM public.glow_ops WHERE child_id = _child AND op = _op;
 IF spend IS NULL OR (spend->>'ok')::boolean IS NOT TRUE THEN RETURN jsonb_build_object('refunded', false, 'reason', 'not_charged'); END IF;
 cost := (spend->>'cost')::int;
 INSERT INTO public.glow_ops (child_id, op, result) VALUES (_child, 'refund:' || _op, jsonb_build_object('refunded', true, 'amount', cost)) ON CONFLICT (child_id, op) DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 IF inserted = 0 THEN RETURN jsonb_build_object('refunded', false, 'reason', 'duplicate'); END IF;
 res := public.glow_refund(_child, cost, _reason);
 RETURN res || jsonb_build_object('refunded', true, 'amount', cost);
END; $$;
REVOKE ALL ON FUNCTION public.glow_refund_op(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.glow_refund_op(uuid,text,text) TO service_role;