
-- Reset statuses and auto journal, then seed fake data with 2 interviews, 0 offers
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY date_applied DESC, id) AS rn
  FROM public.applications
)
UPDATE public.applications a
SET statut = CASE
  WHEN o.rn <= 2 THEN 'entretien'
  WHEN o.rn <= 14 THEN 'accuse_reception'
  WHEN o.rn <= 22 THEN 'refusee'
  ELSE 'envoyee'
END
FROM ordered o
WHERE o.id = a.id;

-- Wipe existing auto journal entries
DELETE FROM public.journal_entries WHERE type = 'auto';

-- Seed auto journal entries based on new status
INSERT INTO public.journal_entries (application_id, type, contenu, created_at)
SELECT a.id, 'auto', 'Email reçu : accusé de réception de votre candidature',
       a.date_applied + interval '1 day' + (random() * interval '6 hours')
FROM public.applications a
WHERE a.statut IN ('accuse_reception', 'entretien', 'refusee');

INSERT INTO public.journal_entries (application_id, type, contenu, created_at)
SELECT a.id, 'auto', 'Email reçu : invitation à un entretien',
       a.date_applied + interval '4 days' + (random() * interval '8 hours')
FROM public.applications a
WHERE a.statut = 'entretien';

INSERT INTO public.journal_entries (application_id, type, contenu, created_at)
SELECT a.id, 'auto', 'Email reçu : candidature non retenue',
       a.date_applied + interval '9 days' + (random() * interval '10 hours')
FROM public.applications a
WHERE a.statut = 'refusee';
