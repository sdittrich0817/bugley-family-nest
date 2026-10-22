ALTER TABLE public.profiles ADD COLUMN family_setup_completed_at timestamptz;
CREATE TABLE public.children (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 nickname text NOT NULL CHECK (length(btrim(nickname)) BETWEEN 1 AND 40 AND btrim(nickname) !~ '\s'),
 age integer NOT NULL CHECK (age BETWEEN 5 AND 12),
 avatar text NOT NULL CHECK (avatar IN ('fox','bunny','bear','cat','frog','owl')),
 login_kind text NOT NULL CHECK (login_kind IN ('pin','pictures')),
 credential_hash text NOT NULL,
 credential_salt text NOT NULL,
 age_band text GENERATED ALWAYS AS (CASE WHEN age <= 6 THEN 'sprouts' WHEN age <= 9 THEN 'explorers' ELSE 'builders' END) STORED,
 bugley_stage text GENERATED ALWAYS AS (CASE WHEN age <= 6 THEN 'grub' WHEN age <= 8 THEN 'hatchling' WHEN age <= 10 THEN 'scout' WHEN age = 11 THEN 'engineer' ELSE 'navigator' END) STORED,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id,parent_id,nickname,age,avatar,login_kind,age_band,bugley_stage,created_at) ON public.children TO authenticated;
GRANT INSERT ON public.children TO authenticated;
GRANT UPDATE (nickname,age,avatar,login_kind,credential_hash,credential_salt) ON public.children TO authenticated;
GRANT DELETE ON public.children TO authenticated;
GRANT ALL ON public.children TO service_role;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own children" ON public.children FOR SELECT TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents add own children" ON public.children FOR INSERT TO authenticated WITH CHECK (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents edit own children" ON public.children FOR UPDATE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent()) WITH CHECK (parent_id = auth.uid() AND public.is_active_parent());
CREATE POLICY "Parents remove own children" ON public.children FOR DELETE TO authenticated USING (parent_id = auth.uid() AND public.is_active_parent());
CREATE INDEX children_parent_idx ON public.children(parent_id);
CREATE FUNCTION public.enforce_family_child_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM id FROM public.profiles WHERE id = NEW.parent_id FOR UPDATE;
 IF (SELECT count(*) FROM public.children WHERE parent_id = NEW.parent_id) >= 5 THEN
  RAISE EXCEPTION 'Your family can have up to 5 children.';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_family_child_limit BEFORE INSERT ON public.children FOR EACH ROW EXECUTE FUNCTION public.enforce_family_child_limit();