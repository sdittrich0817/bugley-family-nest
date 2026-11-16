ALTER TABLE public.game_stickers DROP CONSTRAINT IF EXISTS game_stickers_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS game_stickers_shared_key ON public.game_stickers (key) WHERE owner_parent IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS game_stickers_family_key ON public.game_stickers (owner_parent, key) WHERE owner_parent IS NOT NULL;

DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist_signups;
CREATE POLICY "Anyone can join the waitlist with valid details" ON public.waitlist_signups
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(first_name)) BETWEEN 1 AND 80
  AND char_length(email) BETWEEN 3 AND 255
  AND email = lower(email)
  AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  AND kids_count BETWEEN 0 AND 20
  AND (source IS NULL OR source IN ('start_free', 'log_in'))
  AND created_at >= now() - interval '5 minutes'
  AND created_at <= now() + interval '5 minutes'
);