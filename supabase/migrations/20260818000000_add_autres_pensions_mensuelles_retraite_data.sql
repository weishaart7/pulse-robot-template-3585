-- Pensions personnelles brutes d'autres régimes non modélisés par cet outil
-- (étranger, complémentaires non saisies...), saisies dans Carriere.tsx pour
-- l'écrêtement du minimum contributif (MICO, référentiel §3.5.5) — jusqu'ici
-- jamais persistées : la saisie était perdue à chaque rechargement et
-- l'écran Synthèse (usePensionConsolidee.ts) ne pouvait jamais en tenir
-- compte, cf. docs/audit/audit-pension-consolidation.md §2.2/§4.
--
-- Additif uniquement (colonne nullable) : ne casse aucune ligne existante,
-- tous les dossiers déjà en base se retrouvent avec 0 (aucun effet sur
-- l'écrêtement), comportement identique à celui affiché aujourd'hui.

ALTER TABLE public.retraite_data
  ADD COLUMN autres_pensions_mensuelles numeric;

COMMENT ON COLUMN public.retraite_data.autres_pensions_mensuelles IS
  'Pensions personnelles brutes mensuelles d''autres régimes non modélisés par cet outil — sert uniquement à l''écrêtement du MICO (référentiel §3.5.5). Non renseigné = 0, aucun effet sur le calcul.';
