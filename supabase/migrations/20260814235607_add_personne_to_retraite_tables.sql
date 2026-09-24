-- Support du conjoint/partenaire dans le module Retraite : les tables
-- retraite_data et retraite_carriere_detail n'avaient jusqu'ici qu'une
-- ligne (ou un jeu de lignes) par user_id, sans distinguer utilisateur et
-- conjoint. Aucune contrainte UNIQUE(user_id) n'existe en base — seule la
-- couche applicative (useRetraiteData/useCarriereDetail) supposait une
-- ligne unique via .maybeSingle() — donc cet ajout est additif et ne casse
-- aucune donnée existante : toutes les lignes déjà présentes deviennent
-- 'utilisateur' par défaut, comportement inchangé pour un profil sans
-- conjoint.
--
-- Le conjoint n'a pas de compte Supabase séparé (cf. marital_status,
-- prenom_conjoint/nom_conjoint/date_naissance_conjoint) : la ligne
-- 'conjoint' reste rattachée au même user_id, donc les policies RLS
-- existantes (auth.uid() = user_id) restent valables sans modification.
ALTER TABLE public.retraite_data
  ADD COLUMN personne text NOT NULL DEFAULT 'utilisateur'
    CHECK (personne IN ('utilisateur', 'conjoint'));

ALTER TABLE public.retraite_carriere_detail
  ADD COLUMN personne text NOT NULL DEFAULT 'utilisateur'
    CHECK (personne IN ('utilisateur', 'conjoint'));

COMMENT ON COLUMN public.retraite_data.personne IS
  'Discrimine les données retraite de l''utilisateur de celles de son conjoint/partenaire (même user_id, pas de compte séparé) — cf. docs/retraite-base-referentiel.md, dette technique "conjoint".';

COMMENT ON COLUMN public.retraite_carriere_detail.personne IS
  'Discrimine le détail de carrière de l''utilisateur de celui de son conjoint/partenaire (même user_id, pas de compte séparé).';
