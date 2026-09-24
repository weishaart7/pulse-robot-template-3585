-- Enrichissement de la table liberalites pour brancher DonationForm/LegsForm
-- (jusqu'ici non persistés) et corriger l'imputation sur la réserve, qui
-- dépend d'un vrai identifiant de bénéficiaire plutôt que d'un texte libre.
-- Table vérifiée vide au moment de la migration (0 ligne) : pas de backfill.

-- Remplace le bénéficiaire texte libre par une référence réelle à
-- family_links, tout en gardant un nom d'affichage pour les bénéficiaires
-- tiers hors famille (legs à une association, un ami, etc.) et pour ne pas
-- perdre l'historique si le lien familial est supprimé ensuite (SET NULL).
ALTER TABLE public.liberalites
  ADD COLUMN beneficiaire_id UUID REFERENCES public.family_links(id) ON DELETE SET NULL,
  ADD COLUMN beneficiaire_nom TEXT;

UPDATE public.liberalites SET beneficiaire_nom = beneficiaire WHERE beneficiaire_nom IS NULL;

ALTER TABLE public.liberalites
  ALTER COLUMN beneficiaire_nom SET NOT NULL,
  DROP COLUMN beneficiaire;

-- Identifiant de regroupement : une donation/legs à plusieurs bénéficiaires
-- (chacun avec son pourcentage) devient plusieurs lignes partageant ce même
-- groupe_id, pour affichage/édition groupés côté UI.
ALTER TABLE public.liberalites
  ADD COLUMN groupe_id UUID;

-- Champs communs aux deux formulaires riches (nature, régime d'imputation,
-- qui a réalisé l'acte, clauses insérées, biens concernés).
ALTER TABLE public.liberalites
  ADD COLUMN nature TEXT,
  ADD COLUMN type_imputation TEXT CHECK (type_imputation IN ('avance_part', 'hors_part', 'partage')),
  ADD COLUMN realise_par TEXT,
  ADD COLUMN clauses TEXT[],
  ADD COLUMN biens JSONB;

-- 'partage' (donation-partage, valeur figée, non rapportable) n'a de sens
-- que pour une donation, jamais pour un legs.
ALTER TABLE public.liberalites
  ADD CONSTRAINT liberalites_partage_donation_only
  CHECK (type_imputation != 'partage' OR type = 'donation');

-- Champs spécifiques donation.
ALTER TABLE public.liberalites
  ADD COLUMN demembrement TEXT,
  ADD COLUMN prise_en_charge_droits BOOLEAN;

-- Champ spécifique legs.
ALTER TABLE public.liberalites
  ADD COLUMN testament_realise TEXT;
