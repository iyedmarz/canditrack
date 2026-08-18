ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'light';

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;