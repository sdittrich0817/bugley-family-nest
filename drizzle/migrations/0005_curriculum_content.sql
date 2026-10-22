CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, role public.app_role NOT NULL, UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE TABLE public.seasons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number integer NOT NULL UNIQUE, title text NOT NULL, description text NOT NULL DEFAULT '', published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.units (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE, number integer NOT NULL, title text NOT NULL,
 lead_strand text NOT NULL CHECK (lead_strand IN ('understand','create','discern','decide')),
 family_question text NOT NULL DEFAULT '', dinner_question text NOT NULL DEFAULT '', story_prompt text NOT NULL DEFAULT '', mission_project text NOT NULL DEFAULT '', badge_name text NOT NULL DEFAULT '', badge_description text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (season_id, number));
CREATE TABLE public.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE, week_number integer NOT NULL, title text NOT NULL, parent_primer text NOT NULL DEFAULT '', script text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (unit_id, week_number));
CREATE TABLE public.activities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, position integer NOT NULL DEFAULT 1, title text NOT NULL, strand text NOT NULL CHECK (strand IN ('understand','create','discern','decide')), offscreen boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.activity_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE, age_band text NOT NULL CHECK (age_band IN ('sprouts','explorers','builders')), kid_title text NOT NULL, instructions text NOT NULL, minutes integer NOT NULL DEFAULT 10 CHECK (minutes BETWEEN 1 AND 120), UNIQUE (activity_id, age_band));
CREATE TABLE public.printables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, title text NOT NULL, file_path text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['seasons','units','sessions','activities','activity_versions','printables'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t, t);
 END LOOP; END $$;

CREATE FUNCTION public.session_is_published(_session_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.sessions s JOIN public.units u ON u.id = s.unit_id JOIN public.seasons se ON se.id = u.season_id WHERE s.id = _session_id AND se.published) $$;
GRANT EXECUTE ON FUNCTION public.session_is_published(uuid) TO authenticated;
CREATE POLICY "Parents read published seasons" ON public.seasons FOR SELECT TO authenticated USING (published AND public.is_active_parent());
CREATE POLICY "Parents read published units" ON public.units FOR SELECT TO authenticated USING (public.is_active_parent() AND EXISTS (SELECT 1 FROM public.seasons se WHERE se.id = season_id AND se.published));
CREATE POLICY "Parents read published sessions" ON public.sessions FOR SELECT TO authenticated USING (public.is_active_parent() AND public.session_is_published(id));
CREATE POLICY "Parents read published activities" ON public.activities FOR SELECT TO authenticated USING (public.is_active_parent() AND public.session_is_published(session_id));
CREATE POLICY "Parents read published versions" ON public.activity_versions FOR SELECT TO authenticated USING (public.is_active_parent() AND EXISTS (SELECT 1 FROM public.activities a WHERE a.id = activity_id AND public.session_is_published(a.session_id)));
CREATE POLICY "Parents read published printables" ON public.printables FOR SELECT TO authenticated USING (public.is_active_parent() AND public.session_is_published(session_id));

CREATE TABLE public.child_session_progress (child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE, session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE, parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (child_id, session_id));
CREATE TABLE public.child_activity_progress (child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE, activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE, parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (child_id, activity_id));
CREATE TABLE public.child_badges (child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE, unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE, parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, earned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (child_id, unit_id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['child_session_progress','child_activity_progress','child_badges'] LOOP
  EXECUTE format('GRANT SELECT, INSERT, DELETE ON public.%I TO authenticated', t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('CREATE POLICY "Parents read own %s" ON public.%I FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent())', t, t);
  EXECUTE format('CREATE POLICY "Parents add own %s" ON public.%I FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND public.is_active_parent() AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = child_id AND c.parent_id = auth.uid()))', t, t);
  EXECUTE format('CREATE POLICY "Parents remove own %s" ON public.%I FOR DELETE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent())', t, t);
 END LOOP; END $$;

CREATE POLICY "Admins upload printables" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'printables' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins change printables" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'printables' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete printables" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'printables' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents and admins read printables" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'printables' AND (public.has_role(auth.uid(), 'admin') OR public.is_active_parent()));

INSERT INTO public.seasons (id, number, title, description, published) VALUES ('5e000000-0000-4000-8000-000000000001', 1, 'Season One', 'Meet Bugley and learn what AI is, and how we stay safe with it.', true);
INSERT INTO public.units (id, season_id, number, title, lead_strand, family_question, dinner_question, story_prompt, mission_project, badge_name, badge_description) VALUES
 ('a0000000-0000-4000-8000-000000000001', '5e000000-0000-4000-8000-000000000001', 1, 'Meet Bugley', 'understand', 'What is AI, and how do we stay safe with it?', 'Is Bugley alive? How do you know?', 'Bugley''s First Day', 'Make a Golden Rules poster for your home and teach it to someone in your family.', 'Golden Rules', 'Knows the Golden Rules for staying safe with AI.');
INSERT INTO public.sessions (id, unit_id, week_number, title, parent_primer, script) VALUES
 ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 1, 'Meet Bugley: What is AI, anyway?',
 'AI is a tool that learns patterns from lots of examples and then makes guesses. It can be helpful, and it can be wrong. This week your kids pretend to be the bot to see how guessing works, then learn the Golden Rules: never share your name, address, or photos with AI. Ask them: "How do you know when a guess is a good one?"',
 E'Bugley''s Hello (5 min): Bugley introduces himself and the family question.\nUnplugged warm-up: Be the Bot (15 min)\nGolden Rules (15 min)\nThink about it (10 min): talk about the dinner question.\nWrap-up (5 min): share one thing you learned.');
INSERT INTO public.activities (id, session_id, position, title, strand, offscreen) VALUES
 ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 1, 'Be the Bot', 'understand', true),
 ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 2, 'Golden Rules', 'decide', false);
INSERT INTO public.activity_versions (activity_id, age_band, kid_title, instructions, minutes) VALUES
 ('c0000000-0000-4000-8000-000000000001', 'sprouts', 'Be the Bot!', 'A grown-up starts a sentence like "The cat sat on the…". You guess the next word! Was your guess silly or smart? That is how Bugley guesses too.', 10),
 ('c0000000-0000-4000-8000-000000000001', 'explorers', 'Mission: Be the Bot', 'Take turns starting sentences and guessing the next word. Keep score of guesses that matched. Then talk: how did you know what came next? AI guesses the same way, from patterns it has seen before.', 15),
 ('c0000000-0000-4000-8000-000000000001', 'builders', 'Project: Be the Bot', 'Write five half-sentences, then predict the most likely next word for each, and a surprising one. Compare with your family. Which was easier to predict, and why? This is how a language model picks words: by likelihood, not by understanding.', 15),
 ('c0000000-0000-4000-8000-000000000002', 'sprouts', 'Golden Rules', 'Bugley''s Golden Rules: never tell AI your name, where you live, or show it photos. Say them out loud and do a thumbs up for each one!', 10),
 ('c0000000-0000-4000-8000-000000000002', 'explorers', 'Mission: Golden Rules', 'Learn the three Golden Rules: never share your name, your address, or photos with AI. Sort pretend messages into "safe to share" and "keep private" piles.', 15),
 ('c0000000-0000-4000-8000-000000000002', 'builders', 'Project: Golden Rules', 'Never share your name, address, or photos with AI. Spot what is private in five example prompts and rewrite each one so it still works without the private details.', 15);