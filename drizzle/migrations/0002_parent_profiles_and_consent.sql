CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 80),
 last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.parental_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 consent_version text NOT NULL,
 consent_text text NOT NULL,
 adult_attested boolean NOT NULL CHECK (adult_attested = true),
 agreed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(parent_id, consent_version)
);
GRANT SELECT ON public.parental_consents TO authenticated;
GRANT ALL ON public.parental_consents TO service_role;
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_active_parent() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM auth.users u JOIN public.parental_consents c ON c.parent_id=u.id WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND c.consent_version='2026-10-21')
$$;
REVOKE ALL ON FUNCTION public.is_active_parent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_parent() TO authenticated;
CREATE POLICY "Verified parents read own profile" ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() AND public.is_active_parent());
CREATE POLICY "Verified parents update own names" ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid() AND public.is_active_parent()) WITH CHECK (id=auth.uid() AND public.is_active_parent());
CREATE POLICY "Verified parents read own consent" ON public.parental_consents FOR SELECT TO authenticated USING (parent_id=auth.uid() AND public.is_active_parent());
CREATE FUNCTION public.create_parent_on_signup() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.raw_user_meta_data->>'adult_attested' IS DISTINCT FROM 'true' OR NEW.raw_user_meta_data->>'parental_consent' IS DISTINCT FROM 'true' OR NEW.raw_user_meta_data->>'consent_version' IS DISTINCT FROM '2026-10-21' THEN
 RAISE EXCEPTION 'An adult parent or legal guardian must actively agree to parental consent.';
 END IF;
 INSERT INTO public.profiles(id,first_name,last_name) VALUES (NEW.id,btrim(NEW.raw_user_meta_data->>'first_name'),btrim(NEW.raw_user_meta_data->>'last_name'));
 INSERT INTO public.parental_consents(parent_id,consent_version,adult_attested,consent_text) VALUES (NEW.id,'2026-10-21',true,'Bugley collects each child’s first name or nickname, age, chosen avatar, and what they create. We use this information to tailor age-appropriate activities, display their avatar, and save their creations to their own shelf. Parents can view or delete their children’s information and creations anytime. Children do not need an email address. No ads. We never sell your family’s data. I agree to Bugley collecting and using my child’s information for these purposes. I am the parent or legal guardian and I am 18 or older.');
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_parent_on_signup() FROM PUBLIC;
CREATE TRIGGER bugley_parent_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_parent_on_signup();