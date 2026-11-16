ALTER TABLE public.glow_ledger DROP CONSTRAINT glow_ledger_kind_check;
ALTER TABLE public.glow_ledger ADD CONSTRAINT glow_ledger_kind_check CHECK (kind IN ('refill','spend','bonus','refund'));