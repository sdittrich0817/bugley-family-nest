CREATE OR REPLACE FUNCTION public.ai_spend_used(_from timestamptz, _parent uuid DEFAULT NULL, _test text DEFAULT NULL)
RETURNS TABLE (credits numeric, usd numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(sum(CASE WHEN status='settled' THEN coalesce(actual_credits,reserved_credits) ELSE reserved_credits END),0),coalesce(sum(CASE WHEN status='settled' THEN coalesce(actual_usd,reserved_usd) ELSE reserved_usd END),0)
 FROM ai_spend_ledger WHERE status IN ('reserved','settled','unknown') AND created_at>=_from AND (_parent IS NULL OR parent_id=_parent) AND test_session IS NOT DISTINCT FROM _test;
$$;
ALTER TABLE public.ai_spend_ledger ADD COLUMN IF NOT EXISTS reconciliation_reason text;
ALTER TABLE public.ai_spend_ledger ADD COLUMN IF NOT EXISTS reconciled_by uuid;
ALTER TABLE public.ai_spend_ledger ADD COLUMN IF NOT EXISTS reconciled_at timestamptz;
CREATE OR REPLACE FUNCTION public.ai_spend_settle(_id uuid, _status text, _credits numeric, _usd numeric, _credits_source text, _usd_source text, _ai_calls int, _draw_calls int, _retries int, _succeeded boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int;
BEGIN
 IF _status NOT IN ('settled','released','unknown') OR _credits<0 OR _usd<0 OR _ai_calls<0 OR _draw_calls<0 OR _retries<0 THEN RAISE EXCEPTION 'invalid settlement'; END IF;
 IF _status='released' AND (_credits<>0 OR _usd<>0 OR _ai_calls<>0 OR _draw_calls<>0) THEN RAISE EXCEPTION 'cannot release used reservation'; END IF;
 UPDATE ai_spend_ledger SET status=_status,actual_credits=CASE WHEN _status='unknown' THEN NULL ELSE _credits END,actual_usd=CASE WHEN _status='unknown' THEN NULL ELSE _usd END,credits_source=_credits_source,usd_source=_usd_source,ai_calls=_ai_calls,draw_calls=_draw_calls,retries=_retries,succeeded=_succeeded,settled_at=now() WHERE id=_id AND status='reserved';
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n=1;
END $$;
CREATE OR REPLACE FUNCTION public.ai_spend_reconcile(_id uuid,_actor uuid,_reason text,_credits numeric,_usd numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n int;
BEGIN
 IF _reason IS NULL OR length(trim(_reason))<10 OR _credits IS NULL OR _usd IS NULL OR _credits<0 OR _usd<0 OR NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'verified admin and reconciliation evidence required'; END IF;
 UPDATE ai_spend_ledger SET status='settled',actual_credits=_credits,actual_usd=_usd,credits_source='reconciled',usd_source='reconciled',reconciliation_reason=_reason,reconciled_by=_actor,reconciled_at=now(),settled_at=now() WHERE id=_id AND status='unknown';
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n=1;
END $$;
REVOKE ALL ON FUNCTION public.ai_spend_reconcile(uuid,uuid,text,numeric,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ai_spend_reconcile(uuid,uuid,text,numeric,numeric) TO service_role;
CREATE OR REPLACE FUNCTION public.ai_spend_reserve(_op_kind text,_op_key text,_parent uuid,_child uuid,_test text,_credits numeric,_usd numeric,_draws boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ai_spend_settings; d record; m record; f record; t record; ts ai_spend_test_sessions; reason text; rid uuid;
 day_start timestamptz := date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 month_start timestamptz := date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
BEGIN
 IF _credits IS NULL OR _usd IS NULL OR _credits<0 OR _usd<0 OR (_test IS NOT NULL AND (_parent IS NOT NULL OR _child IS NOT NULL)) THEN RAISE EXCEPTION 'invalid reservation'; END IF;
 IF _test IS NOT NULL AND _op_key IS NOT NULL THEN _op_key := 'test:'||_test||':'||_op_key; END IF;
 SELECT * INTO s FROM ai_spend_settings WHERE id=1 FOR UPDATE;
 UPDATE ai_spend_ledger SET status='unknown' WHERE status='reserved' AND created_at<now()-interval '30 minutes';
 IF _op_key IS NOT NULL AND EXISTS(SELECT 1 FROM ai_spend_ledger WHERE op_key=_op_key AND status IN ('reserved','unknown')) THEN reason:='duplicate';
 ELSIF s.pause_all THEN reason:='paused_all';
 ELSIF _draws AND s.pause_drawing THEN reason:='paused_drawing';
 ELSIF _test IS NULL AND s.per_op_max_credits IS NOT NULL AND _credits>s.per_op_max_credits THEN reason:='per_op_credits';
 ELSIF _test IS NULL AND s.per_op_max_usd IS NOT NULL AND _usd>s.per_op_max_usd THEN reason:='per_op_usd'; END IF;
 IF reason IS NULL AND _test IS NULL THEN
 SELECT * INTO d FROM ai_spend_used(day_start); SELECT * INTO m FROM ai_spend_used(month_start);
 IF s.platform_daily_credits IS NOT NULL AND d.credits+_credits>s.platform_daily_credits THEN reason:='platform_daily_credits';
 ELSIF s.platform_daily_usd IS NOT NULL AND d.usd+_usd>s.platform_daily_usd THEN reason:='platform_daily_usd';
 ELSIF s.platform_monthly_credits IS NOT NULL AND m.credits+_credits>s.platform_monthly_credits THEN reason:='platform_monthly_credits';
 ELSIF s.platform_monthly_usd IS NOT NULL AND m.usd+_usd>s.platform_monthly_usd THEN reason:='platform_monthly_usd'; END IF; END IF;
 IF reason IS NULL AND _test IS NULL AND _parent IS NOT NULL AND (s.family_monthly_credits IS NOT NULL OR s.family_monthly_usd IS NOT NULL) THEN
 SELECT * INTO f FROM ai_spend_used(month_start,_parent);
 IF s.family_monthly_credits IS NOT NULL AND f.credits+_credits>s.family_monthly_credits THEN reason:='family_monthly_credits';
 ELSIF s.family_monthly_usd IS NOT NULL AND f.usd+_usd>s.family_monthly_usd THEN reason:='family_monthly_usd'; END IF; END IF;
 IF reason IS NULL AND _test IS NOT NULL THEN
 SELECT * INTO ts FROM ai_spend_test_sessions WHERE key=_test;
 IF ts.key IS NULL OR ts.closed THEN reason:='test_session_closed'; ELSE
 SELECT * INTO t FROM ai_spend_used('-infinity',NULL,_test);
 IF t.usd+t.credits+_usd+_credits>ts.cap_usd THEN reason:='test_session_cap'; END IF; END IF; END IF;
 IF reason IS NOT NULL THEN
 INSERT INTO ai_spend_ledger(op_kind,op_key,parent_id,child_id,test_session,draws,status,block_reason,reserved_credits,reserved_usd,settled_at) VALUES(_op_kind,NULL,_parent,_child,_test,_draws,'blocked',reason,_credits,_usd,now());
 RETURN jsonb_build_object('ok',false,'reason',reason); END IF;
 INSERT INTO ai_spend_ledger(op_kind,op_key,parent_id,child_id,test_session,draws,status,reserved_credits,reserved_usd) VALUES(_op_kind,_op_key,_parent,_child,_test,_draws,'reserved',_credits,_usd) RETURNING id INTO rid;
 IF _test IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'id',rid); END IF;
 SELECT * INTO d FROM ai_spend_used(day_start); SELECT * INTO m FROM ai_spend_used(month_start);
 IF s.platform_daily_credits>0 AND d.credits>=s.alert_ratio*s.platform_daily_credits THEN INSERT INTO ai_spend_alerts(kind,period,used,cap) VALUES('platform_daily_credits',to_char(day_start,'YYYY-MM-DD'),d.credits,s.platform_daily_credits) ON CONFLICT DO NOTHING; END IF;
 IF s.platform_daily_usd>0 AND d.usd>=s.alert_ratio*s.platform_daily_usd THEN INSERT INTO ai_spend_alerts(kind,period,used,cap) VALUES('platform_daily_usd',to_char(day_start,'YYYY-MM-DD'),d.usd,s.platform_daily_usd) ON CONFLICT DO NOTHING; END IF;
 IF s.platform_monthly_credits>0 AND m.credits>=s.alert_ratio*s.platform_monthly_credits THEN INSERT INTO ai_spend_alerts(kind,period,used,cap) VALUES('platform_monthly_credits',to_char(month_start,'YYYY-MM'),m.credits,s.platform_monthly_credits) ON CONFLICT DO NOTHING; END IF;
 IF s.platform_monthly_usd>0 AND m.usd>=s.alert_ratio*s.platform_monthly_usd THEN INSERT INTO ai_spend_alerts(kind,period,used,cap) VALUES('platform_monthly_usd',to_char(month_start,'YYYY-MM'),m.usd,s.platform_monthly_usd) ON CONFLICT DO NOTHING; END IF;
 RETURN jsonb_build_object('ok',true,'id',rid);
END $$;