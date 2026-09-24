-- Confirmation explicite par l'utilisateur des 2 conditions d'éligibilité au
-- taux réduit IS PME non modélisables automatiquement (capital libéré et
-- détention ≥75% par des personnes physiques, aucun champ existant pour les
-- déduire). Le CA < 10 M€ reste vérifié automatiquement en plus de cette case
-- (cf. lib/societes/impotSocietes.ts::computeImpotSocietes) : la case seule ne
-- suffit pas si le CA dépasse le seuil. Défaut à false : le taux normal
-- s'applique tant que l'utilisateur n'a pas coché explicitement la case.
ALTER TABLE public.societes
  ADD COLUMN IF NOT EXISTS eligible_taux_reduit_pme BOOLEAN NOT NULL DEFAULT false;
