ALTER TABLE public.activities ADD COLUMN step text NOT NULL DEFAULT 'make' CHECK (step IN ('warmup','make','break','think'));
ALTER TABLE public.units ADD COLUMN journal_prompt text NOT NULL DEFAULT '';
UPDATE public.activities SET step = 'warmup' WHERE id = 'c0000000-0000-4000-8000-000000000001';
UPDATE public.units SET journal_prompt = 'Draw or write one thing AI can do, and one Golden Rule you will always follow.' WHERE id = 'a0000000-0000-4000-8000-000000000001';