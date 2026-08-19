UPDATE applications SET statut = 'entretien' WHERE id IN ('81db3f2d-29de-49d0-b5b4-c37dec5acab0', '8b6eedea-dcfc-44f9-8a36-a389f930cbd0');

INSERT INTO journal_entries (application_id, type, contenu) VALUES
  ('81db3f2d-29de-49d0-b5b4-c37dec5acab0', 'auto', 'Entretien technique planifié — Carrier'),
  ('8b6eedea-dcfc-44f9-8a36-a389f930cbd0', 'auto', 'Entretien RH confirmé — Scalers France');
