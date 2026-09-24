-- Colonnes jamais lues ni écrites par l'application :
-- - trimestres_requis : calculé dynamiquement (trimestresRequisPourGeneration()) ;
-- - epargne_per / epargne_assurance_vie : recalculés à la volée depuis `assets`.
-- Vérifié avant application : valeurs par défaut uniquement (172 / 0) sur
-- toutes les lignes, aucune vue ni fonction dépendante.
ALTER TABLE public.retraite_data
  DROP COLUMN trimestres_requis,
  DROP COLUMN epargne_per,
  DROP COLUMN epargne_assurance_vie;
