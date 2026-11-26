-- Non-paid spending/authorization regression. Run through the privileged database query tool.
-- The settings row is locked throughout; ROLLBACK removes all probes and restores every limit.
BEGIN;
DO $$
DECLARE r jsonb; rid uuid; testid uuid; total record;
BEGIN
  UPDATE public.ai_spend_settings SET platform_daily_credits=NULL,platform_monthly_credits=NULL,platform_daily_usd=1,platform_monthly_usd=NULL,family_monthly_credits=NULL,family_monthly_usd=1,per_op_max_credits=NULL,per_op_max_usd=NULL,pause_all=false,pause_drawing=false WHERE id=1;
  INSERT INTO public.ai_spend_test_sessions(key,cap_usd,credit_usd_rate) VALUES('e11-rollback-screening',15,1);
  r:=public.ai_spend_reserve('probe','probe',NULL,NULL,'e11-rollback-screening',0,3,true);
  ASSERT (r->>'ok')::boolean,'test pool must not consume production platform ceiling';
  testid:=(r->>'id')::uuid;
  SELECT * INTO total FROM public.ai_spend_used('-infinity');
  ASSERT total.usd=0,'test costs must not count toward production budget';
  r:=public.ai_spend_reserve('probe','probe','00000000-0000-4000-a000-0000000000b1',NULL,NULL,0,1,true);
  ASSERT (r->>'ok')::boolean,'live family allowed at boundary despite test reservation';
  rid:=(r->>'id')::uuid;
  r:=public.ai_spend_reserve('probe',NULL,'00000000-0000-4000-a000-0000000000b1',NULL,NULL,0,0.01,true);
  ASSERT r->>'reason'='platform_daily_usd','one cent over production limit blocked';
  r:=public.ai_spend_reserve('probe',NULL,NULL,NULL,'e11-rollback-screening',0,12,true);
  ASSERT (r->>'ok')::boolean,'test allowed exactly at $15';
  r:=public.ai_spend_reserve('probe',NULL,NULL,NULL,'e11-rollback-screening',0,0.01,true);
  ASSERT r->>'reason'='test_session_cap','test one cent above $15 refused';
  BEGIN
    PERFORM public.ai_spend_reserve('probe',NULL,'00000000-0000-4000-a000-0000000000b1',NULL,'e11-rollback-screening',0,0,true);
    RAISE EXCEPTION 'test family attribution unexpectedly allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%invalid reservation%' THEN RAISE; END IF;
  END;
  ASSERT public.ai_spend_settle(rid,'settled',0,1,'reported_tokens','list_price_estimate',0,1,0,true),'first settlement succeeds';
  ASSERT NOT public.ai_spend_settle(rid,'released',0,0,'reported_tokens','list_price_estimate',0,0,0,false),'second settlement cannot erase cost';
  UPDATE public.ai_spend_ledger SET status='unknown' WHERE id=testid;
  ASSERT NOT public.ai_spend_settle(testid,'released',0,0,'reported_tokens','list_price_estimate',0,0,0,false),'unknown cannot silently release';
  ASSERT NOT public.ai_spend_settle(testid,'settled',0,0,'reported_tokens','list_price_estimate',0,0,0,false),'unknown cannot silently settle';
  r:=public.ai_spend_reserve('probe','probe',NULL,NULL,'e11-rollback-screening',0,0,true);
  ASSERT r->>'reason'='duplicate','unknown blocks duplicate provider replay';
  ASSERT public.ai_spend_reconcile(testid,'9025e58a-6009-4f70-af03-3ffd3dbd4b42','Synthetic test: provider evidence confirmed zero bill',0,0),'audited founder reconciliation succeeds';
  ASSERT (SELECT reconciliation_reason IS NOT NULL AND reconciled_by='9025e58a-6009-4f70-af03-3ffd3dbd4b42' FROM public.ai_spend_ledger WHERE id=testid),'reconciliation retains actor and evidence';
  UPDATE public.ai_spend_test_sessions SET credit_usd_rate=NULL WHERE key='e11-rollback-screening';
  r:=public.ai_spend_reserve('probe',NULL,NULL,NULL,'e11-rollback-screening',1,0,false);
  ASSERT r->>'reason'='test_session_closed','missing dollar conversion refuses credit-using tests';
  UPDATE public.ai_spend_test_sessions SET credit_usd_rate=2 WHERE key='e11-rollback-screening';
  r:=public.ai_spend_reserve('probe',NULL,NULL,NULL,'e11-rollback-screening',1,1,false);
  ASSERT (r->>'ok')::boolean,'12 dollars plus 1 dollar plus 1 credit at 2 dollars allowed exactly at 15';
  r:=public.ai_spend_reserve('probe',NULL,NULL,NULL,'e11-rollback-screening',0,0.01,false);
  ASSERT r->>'reason'='test_session_cap','dollar conversion counts both credits and drawings';
  ASSERT NOT has_function_privilege('authenticated','public.ai_spend_reserve(text,text,uuid,uuid,text,numeric,numeric,boolean)','execute'),'browser cannot reserve';
  ASSERT NOT has_function_privilege('authenticated','public.ai_spend_settle(uuid,text,numeric,numeric,text,text,integer,integer,integer,boolean)','execute'),'browser cannot release';
  ASSERT NOT has_function_privilege('authenticated','public.ai_spend_reconcile(uuid,uuid,text,numeric,numeric)','execute'),'browser cannot reconcile';
  ASSERT NOT has_function_privilege('anon','public.ai_spend_reserve(text,text,uuid,uuid,text,numeric,numeric,boolean)','execute'),'anonymous cannot reserve';
  RAISE NOTICE 'PASS: test isolation, $15 boundary, one-cent refusal, no family entitlements, once-only settlement, unknown hold, duplicate refusal, audited founder reconciliation and service-only access';
END $$;
ROLLBACK;