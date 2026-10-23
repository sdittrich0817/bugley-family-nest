CREATE TABLE public.play_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_id uuid NOT NULL, child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
 game text NOT NULL CHECK (game IN ('say_see','creature_lab','story_blanks','doodle_duel')), state jsonb NOT NULL DEFAULT '{}'::jsonb,
 version int NOT NULL DEFAULT 0, busy boolean NOT NULL DEFAULT false, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, score int NOT NULL DEFAULT 0, bonus int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.play_sessions TO authenticated;
GRANT ALL ON public.play_sessions TO service_role;
ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family reads play sessions" ON public.play_sessions FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE INDEX play_sessions_child ON public.play_sessions(child_id, finished_at);
CREATE TABLE public.game_stickers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, name text NOT NULL, synonyms text[] NOT NULL DEFAULT '{}', image_path text NOT NULL,
 creature boolean NOT NULL DEFAULT false, power text NOT NULL DEFAULT '', rare boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.game_stickers TO authenticated;
GRANT ALL ON public.game_stickers TO service_role;
ALTER TABLE public.game_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Families read safe stickers" ON public.game_stickers FOR SELECT TO authenticated USING ((active AND public.is_active_parent()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin inserts stickers" ON public.game_stickers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin edits stickers" ON public.game_stickers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX game_stickers_synonyms ON public.game_stickers USING gin(synonyms);
CREATE TABLE public.bugdex (
 child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE, parent_id uuid NOT NULL, sticker_key text NOT NULL, discovered_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(child_id, sticker_key)
);
GRANT SELECT ON public.bugdex TO authenticated;
GRANT ALL ON public.bugdex TO service_role;
ALTER TABLE public.bugdex ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family reads Bugdex" ON public.bugdex FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE OR REPLACE FUNCTION public.finish_play_session(_session uuid, _parent uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.play_sessions; tz text; day_start timestamptz; used int; earned int := 0; badge_name text; g public.child_glow;
BEGIN
 SELECT * INTO r FROM public.play_sessions WHERE id = _session AND parent_id = _parent FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'session not found'; END IF;
 IF r.finished_at IS NOT NULL THEN RETURN jsonb_build_object('score',r.score,'bonus',r.bonus); END IF;
 IF r.busy THEN RAISE EXCEPTION 'wait for current move'; END IF;
 -- Serialize every game reward for this child, including concurrent finishes.
 PERFORM 1 FROM public.children WHERE id = r.child_id AND parent_id = _parent FOR UPDATE;
 SELECT timezone INTO tz FROM public.family_glow_settings WHERE parent_id = _parent;
 day_start := date_trunc('day', now() AT TIME ZONE COALESCE(tz,'America/New_York')) AT TIME ZONE COALESCE(tz,'America/New_York');
 SELECT COALESCE(sum(bonus),0) INTO used FROM (
  SELECT bonus FROM public.play_sessions WHERE child_id = r.child_id AND finished_at >= day_start
  UNION ALL SELECT bonus FROM public.game_rounds WHERE child_id = r.child_id AND finished_at >= day_start
 ) rewards;
 IF r.score >= 3 AND used < 3 THEN earned := 1; PERFORM public.glow_gift(r.child_id,1,'Game bonus: playful round'); END IF;
 UPDATE public.play_sessions SET finished_at = now(), bonus = earned WHERE id = r.id;
 INSERT INTO public.game_progress(child_id,parent_id,game,sparks) VALUES (r.child_id,_parent,r.game,r.score)
 ON CONFLICT(child_id,game) DO UPDATE SET sparks = public.game_progress.sparks + EXCLUDED.sparks, updated_at = now();
 badge_name := CASE r.game WHEN 'say_see' THEN 'Word Wizard' WHEN 'creature_lab' THEN 'Creature Keeper' WHEN 'story_blanks' THEN 'Silly Story Star' ELSE 'Doodle Detective' END;
 IF r.score > 0 THEN INSERT INTO public.game_badges(child_id,parent_id,game,badge) VALUES(r.child_id,_parent,r.game,badge_name) ON CONFLICT DO NOTHING; END IF;
 RETURN jsonb_build_object('score',r.score,'bonus',earned);
END; $$;
REVOKE ALL ON FUNCTION public.finish_play_session(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_play_session(uuid,uuid) TO service_role;