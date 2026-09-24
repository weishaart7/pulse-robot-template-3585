-- Branche le supplément de pension NBI (calculFonctionPublique.supplementNBI(),
-- codé et testé depuis le 2026-08-15 mais jamais appelé, cf. écart #13-NBI
-- documenté dans docs/retraite.md) : ajoute le champ de régime d'affiliation
-- (SRE/CNRACL) qui manquait pour distinguer les deux versants, plus les deux
-- champs déclaratifs requis par la formule (moyenne annuelle NBI perçue,
-- trimestres liquidables de perception).
--
-- Additif uniquement (colonnes nullable) : aucune ligne existante affectée,
-- tous les dossiers déjà en base ont regime_affiliation_fp = NULL, donc le
-- supplément reste à 0 pour eux tant qu'un conseiller ne renseigne pas le
-- régime — comportement identique à celui affiché aujourd'hui.

ALTER TABLE public.retraite_data
  ADD COLUMN regime_affiliation_fp text,
  ADD COLUMN moyenne_annuelle_nbi numeric,
  ADD COLUMN trimestres_liquidables_nbi numeric;

ALTER TABLE public.retraite_data
  ADD CONSTRAINT retraite_data_regime_affiliation_fp_check
  CHECK (regime_affiliation_fp IS NULL OR regime_affiliation_fp IN ('SRE', 'CNRACL'));

COMMENT ON COLUMN public.retraite_data.regime_affiliation_fp IS
  'Versant fonction publique du client (SRE = État, CNRACL = territoriale/hospitalière) — conditionne le calcul du supplément NBI (formule sourcée uniquement pour ces deux versants, cf. docs/retraite-base-referentiel.md §7.7.1). NULL = non renseigné, supplément NBI non calculé par défaut.';
COMMENT ON COLUMN public.retraite_data.moyenne_annuelle_nbi IS
  'Moyenne annuelle des sommes perçues au titre de la NBI (montant en euros, déjà revalorisé), saisie déclarative depuis le relevé de carrière du client.';
COMMENT ON COLUMN public.retraite_data.trimestres_liquidables_nbi IS
  'Trimestres liquidables pendant lesquels la NBI a été effectivement perçue (pas la durée totale de carrière) — saisie déclarative.';
