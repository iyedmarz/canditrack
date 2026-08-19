UPDATE public.profiles
SET dedicated_email = REPLACE(dedicated_email, '@mail.candidtrack.app', '@mail.candidtrack.com')
WHERE dedicated_email LIKE '%@mail.candidtrack.app';