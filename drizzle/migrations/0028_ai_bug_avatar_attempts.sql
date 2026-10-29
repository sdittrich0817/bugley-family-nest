CREATE TABLE public.bug_avatar_attempts (
 child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
 op uuid NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','complete','failed')),
 cost int NOT NULL CHECK (cost IN (0,1)),
 image_path text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (child_id,op)
);
GRANT ALL ON public.bug_avatar_attempts TO service_role;
ALTER TABLE public.bug_avatar_attempts ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX bug_avatar_one_pending ON public.bug_avatar_attempts(child_id) WHERE status='pending';
CREATE FUNCTION public.claim_bug_avatar(_child uuid,_parent uuid,_op uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seen public.bug_avatar_attempts; pending public.bug_avatar_attempts; n int; price int; spend jsonb;
BEGIN
 PERFORM 1 FROM public.children WHERE id=_child AND parent_id=_parent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
 SELECT * INTO seen FROM public.bug_avatar_attempts WHERE child_id=_child AND op=_op;
 IF FOUND THEN RETURN jsonb_build_object('ok',false,'status',seen.status,'path',seen.image_path,'duplicate',true); END IF;
 SELECT * INTO pending FROM public.bug_avatar_attempts WHERE child_id=_child AND status='pending';
 IF FOUND THEN
  IF pending.created_at > now()-interval '15 minutes' THEN RETURN jsonb_build_object('ok',false,'reason','busy'); END IF;
  UPDATE public.bug_avatar_attempts SET status='failed' WHERE child_id=_child AND op=pending.op;
  IF pending.cost=1 THEN PERFORM public.glow_refund(_child,1,'Refund: interrupted bug profile picture'); END IF;
 END IF;
 SELECT count(*) INTO n FROM public.bug_avatar_attempts WHERE child_id=_child AND status='complete';
 price:=CASE WHEN n<2 THEN 0 ELSE 1 END;
 IF price=1 THEN
  spend:=public.glow_spend(_child,'sketch','AI bug profile picture', 'bug-avatar:'||_op::text);
  IF NOT (spend->>'ok')::boolean THEN RETURN spend; END IF;
 END IF;
 INSERT INTO public.bug_avatar_attempts(child_id,op,cost) VALUES(_child,_op,price);
 RETURN jsonb_build_object('ok',true,'cost',price);
END; $$;
CREATE FUNCTION public.finish_bug_avatar(_child uuid,_parent uuid,_op uuid,_path text,_bug jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE attempt public.bug_avatar_attempts;
BEGIN
 PERFORM 1 FROM public.children WHERE id=_child AND parent_id=_parent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
 SELECT * INTO attempt FROM public.bug_avatar_attempts WHERE child_id=_child AND op=_op FOR UPDATE;
 IF NOT FOUND OR attempt.status<>'pending' THEN RETURN false; END IF;
 IF _path IS NULL THEN
  UPDATE public.bug_avatar_attempts SET status='failed' WHERE child_id=_child AND op=_op;
  IF attempt.cost=1 THEN PERFORM public.glow_refund(_child,1,'Refund: bug profile picture did not work'); END IF;
 ELSE
  IF _path NOT LIKE _parent::text||'/'||_child::text||'/%' OR _path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid picture'; END IF;
  UPDATE public.children SET bug=_bug||jsonb_build_object('imagePath',_path) WHERE id=_child;
  UPDATE public.bug_avatar_attempts SET status='complete',image_path=_path WHERE child_id=_child AND op=_op;
 END IF;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_bug_avatar(uuid,uuid,uuid), public.finish_bug_avatar(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bug_avatar(uuid,uuid,uuid), public.finish_bug_avatar(uuid,uuid,uuid,text,jsonb) TO service_role;