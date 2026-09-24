-- Ajout de 3 champs communs à tous les types de membres de family_links :
-- mesure de protection juridique, mandat de protection future, personne à charge.
ALTER TABLE public.family_links
  ADD COLUMN IF NOT EXISTS mesure_protection_juridique text NOT NULL DEFAULT 'Aucune',
  ADD COLUMN IF NOT EXISTS mandat_protection_future boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_mandat_protection_future date,
  ADD COLUMN IF NOT EXISTS personne_a_charge boolean NOT NULL DEFAULT false;

ALTER TABLE public.family_links
  ADD CONSTRAINT family_links_mesure_protection_juridique_check
  CHECK (mesure_protection_juridique IN (
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    'Mesure d''accompagnement'
  ));
