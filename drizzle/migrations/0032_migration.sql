ALTER TABLE public.game_stickers ADD COLUMN IF NOT EXISTS owner_parent uuid;
DROP POLICY IF EXISTS "Families read safe stickers" ON public.game_stickers;
CREATE POLICY "Families read safe stickers" ON public.game_stickers FOR SELECT TO authenticated
USING ((active AND is_active_parent() AND (owner_parent IS NULL OR owner_parent = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));