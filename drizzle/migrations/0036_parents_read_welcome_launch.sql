GRANT SELECT ON public.onboarding_settings TO authenticated;
CREATE POLICY "Signed-in users read welcome launch date" ON public.onboarding_settings FOR SELECT TO authenticated USING (true);