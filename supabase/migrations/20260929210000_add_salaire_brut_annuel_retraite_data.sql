-- Salaire brut annuel total (non plafonné) — base de la projection des points
-- Agirc-Arrco futurs (tranche 1 jusqu'au PASS, tranche 2 de 1 à 8 PASS). Le
-- relevé de carrière ne donne que des revenus plafonnés au PASS, insuffisants
-- pour les cadres (audit Retraite du 2026-09-29, R1).
--
-- Additif uniquement (colonne nullable) : non renseigné = repli sur
-- l'hypothèse de revenu futur plafonnée, avec avertissement à l'écran.

ALTER TABLE public.retraite_data
  ADD COLUMN salaire_brut_annuel numeric;

COMMENT ON COLUMN public.retraite_data.salaire_brut_annuel IS
  'Salaire brut annuel total, non plafonné, en euros constants — projection des points Agirc-Arrco futurs. Non renseigné = repli sur l''hypothèse de revenu futur (plafonnée au PASS).';
