ALTER TABLE public.ai_spend_test_sessions ADD COLUMN credit_usd_rate numeric CHECK (credit_usd_rate > 0);
COMMENT ON COLUMN public.ai_spend_test_sessions.credit_usd_rate IS 'Explicit approved USD-per-AI-credit budgeting rate. NULL refuses credit-using tests; never infer cash cost from credits.';
DO $migration$
DECLARE definition text; needle text := 'IF t.usd+t.credits+_usd+_credits>ts.cap_usd THEN reason:=''test_session_cap''; END IF;';
BEGIN
 SELECT pg_get_functiondef('public.ai_spend_reserve(text,text,uuid,uuid,text,numeric,numeric,boolean)'::regprocedure) INTO definition;
 IF position(needle IN definition)=0 THEN RAISE EXCEPTION 'Expected test cap expression not found'; END IF;
 definition := replace(definition,needle,'IF ts.credit_usd_rate IS NULL AND (t.credits+_credits)>0 THEN reason:=''test_session_closed''; ELSIF t.usd+_usd+(t.credits+_credits)*coalesce(ts.credit_usd_rate,0)>ts.cap_usd THEN reason:=''test_session_cap''; END IF;');
 EXECUTE definition;
END $migration$;