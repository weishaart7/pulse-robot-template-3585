-- Corrige un bug : le champ "capacité juridique" du conjoint était affiché dans
-- PartnerForm.tsx mais jamais persisté (aucune colonne, valeur non envoyée à l'enregistrement).
-- Ajout de la colonne, harmonisée avec les 7 valeurs de family_links / family_profiles.
-- Aucune conversion de données existantes : la colonne n'a jamais existé, donc rien à migrer.
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS capacite_juridique_conjoint text NOT NULL DEFAULT 'Aucune';

ALTER TABLE public.marital_status
  ADD CONSTRAINT marital_status_capacite_juridique_conjoint_check
  CHECK (capacite_juridique_conjoint IN (
    'Aucune',
    'Tutelle',
    'Curatelle',
    'Sauvegarde de justice',
    'Habilitation du conjoint',
    'Habilitation familiale',
    'Mesure d''accompagnement'
  ));

-- Mandat de protection future (case à cocher + date), aligné sur family_links / family_profiles.
-- Pas de champ "personne à charge" ici : n'a pas de sens pour le conjoint lui-même.
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS mandat_protection_future_conjoint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_mandat_protection_future_conjoint date;
