-- Minimisation RGPD : colonnes retirées de l'interface et lues par aucun code
-- ni aucune vue / fonction (vérifié avant application). Suppression définitive
-- des valeurs restantes (un profil contenait encore des coordonnées).
-- Conditions de réintroduction : docs/idees-de-cote.md.
ALTER TABLE public.family_profiles
  DROP COLUMN IF EXISTS telephone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS adresse_postale,
  DROP COLUMN IF EXISTS code_postal,
  DROP COLUMN IF EXISTS ville,
  DROP COLUMN IF EXISTS pays,
  DROP COLUMN IF EXISTS commune_naissance,
  DROP COLUMN IF EXISTS pays_naissance;

ALTER TABLE public.marital_status
  DROP COLUMN IF EXISTS telephone_conjoint,
  DROP COLUMN IF EXISTS email_conjoint,
  DROP COLUMN IF EXISTS adresse_conjoint,
  DROP COLUMN IF EXISTS code_postal_conjoint,
  DROP COLUMN IF EXISTS ville_conjoint,
  DROP COLUMN IF EXISTS pays_conjoint,
  DROP COLUMN IF EXISTS lieu_naissance_conjoint,
  DROP COLUMN IF EXISTS pays_naissance_conjoint,
  DROP COLUMN IF EXISTS parent_isole,
  DROP COLUMN IF EXISTS nombre_enfants_charges;

ALTER TABLE public.family_links
  DROP COLUMN IF EXISTS mesure_protection_juridique,
  DROP COLUMN IF EXISTS mandat_protection_future,
  DROP COLUMN IF EXISTS date_mandat_protection_future;
