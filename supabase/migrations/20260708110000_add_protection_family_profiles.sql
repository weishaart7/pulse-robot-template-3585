-- Harmonise capacite_juridique de family_profiles avec mesure_protection_juridique de family_links :
-- l'ancien champ stockait des codes courts en minuscules ('normale', 'tutelle', 'curatelle', 'sauvegarde'),
-- pas les libellés affichés. On les convertit vers les 7 libellés complets désormais communs aux deux tables.
UPDATE public.family_profiles
SET capacite_juridique = CASE capacite_juridique
  WHEN 'normale' THEN 'Aucune'
  WHEN 'tutelle' THEN 'Tutelle'
  WHEN 'curatelle' THEN 'Curatelle'
  WHEN 'sauvegarde' THEN 'Sauvegarde de justice'
  ELSE capacite_juridique
END
WHERE capacite_juridique IN ('normale', 'tutelle', 'curatelle', 'sauvegarde');

ALTER TABLE public.family_profiles
  ALTER COLUMN capacite_juridique SET DEFAULT 'Aucune';

ALTER TABLE public.family_profiles
  ADD CONSTRAINT family_profiles_capacite_juridique_check
  CHECK (capacite_juridique IN (
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    'Mesure d''accompagnement'
  ));

-- Mandat de protection future (case à cocher + date), aligné sur family_links.
-- Pas de champ "personne à charge" ici : n'a pas de sens pour le client principal.
ALTER TABLE public.family_profiles
  ADD COLUMN IF NOT EXISTS mandat_protection_future boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_mandat_protection_future date;
