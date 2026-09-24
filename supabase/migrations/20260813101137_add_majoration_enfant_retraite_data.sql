-- Champ déclaratif pour la surcote parentale (référentiel §2.3.2, écart #6) :
-- au moins 1 trimestre de majoration de durée d'assurance au titre de la
-- maternité, de l'adoption, de l'éducation, d'un enfant handicapé ou d'un
-- congé parental. Décision produit actée : champ déclaratif simple, pas de
-- sous-système de répartition MDA (cf.
-- docs/audit/conception-majorations-enfants.md §6.3/§7).
ALTER TABLE public.retraite_data
  ADD COLUMN au_moins_un_trimestre_majoration_enfant boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.retraite_data.au_moins_un_trimestre_majoration_enfant IS
  'Condition n°1 (déclarative) de la surcote parentale, référentiel §2.3.2 — jamais déduite automatiquement des trimestres MDA (aucun sous-système de répartition modélisé).';
