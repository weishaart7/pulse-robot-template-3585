-- Normalise les origines d'actif vides ('{""}') en 'Acquisition à titre onéreux',
-- la valeur par défaut du formulaire (assetSchema.ts) que l'interface affichait
-- déjà pour ces lignes. Vérifié avant migration : 2 lignes concernées sur 11,
-- aucune ligne NULL, aucun tableau vide, aucun tableau mêlant '' et une valeur.
UPDATE public.assets
SET origine_actif = ARRAY['Acquisition à titre onéreux']::text[]
WHERE origine_actif = ARRAY['']::text[];
