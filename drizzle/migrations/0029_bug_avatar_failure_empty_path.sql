CREATE OR REPLACE FUNCTION public.finish_bug_avatar(_child uuid,_parent uuid,_op uuid,_path text,_bug jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE attempt public.bug_avatar_attempts;
BEGIN
 PERFORM 1 FROM public.children WHERE id=_child AND parent_id=_parent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
 SELECT * INTO attempt FROM public.bug_avatar_attempts WHERE child_id=_child AND op=_op FOR UPDATE;
 IF NOT FOUND OR attempt.status<>'pending' THEN RETURN false; END IF;
 IF _path IS NULL OR _path='' THEN
  UPDATE public.bug_avatar_attempts SET status='failed' WHERE child_id=_child AND op=_op;
  IF attempt.cost=1 THEN PERFORM public.glow_refund(_child,1,'Refund: bug profile picture did not work'); END IF;
 ELSE
  IF _path NOT LIKE _parent::text||'/'||_child::text||'/%' OR _path LIKE '%..%' THEN RAISE EXCEPTION 'Invalid picture'; END IF;
  UPDATE public.children SET bug=_bug||jsonb_build_object('imagePath',_path) WHERE id=_child;
  UPDATE public.bug_avatar_attempts SET status='complete',image_path=_path WHERE child_id=_child AND op=_op;
 END IF;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.finish_bug_avatar(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_bug_avatar(uuid,uuid,uuid,text,jsonb) TO service_role;