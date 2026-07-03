-- Correction grammaticale des libellés d'origine d'actif stockés dans le tableau
-- origine_actif : "à titre gratuite/onéreuse" -> "à titre gratuit/onéreux" (accord
-- avec "titre", masculin). Met à jour les valeurs existantes pour rester cohérent
-- avec les nouveaux libellés du code (ORIGINE_ACTIF_OPTIONS).
UPDATE public.assets
SET origine_actif = array_replace(origine_actif, 'Acquisition à titre gratuite', 'Acquisition à titre gratuit')
WHERE 'Acquisition à titre gratuite' = ANY(origine_actif);

UPDATE public.assets
SET origine_actif = array_replace(origine_actif, 'Acquisition à titre onéreuse', 'Acquisition à titre onéreux')
WHERE 'Acquisition à titre onéreuse' = ANY(origine_actif);

COMMENT ON COLUMN public.assets.origine_actif IS 'Origin of the asset (multiple choice): Acquisition à titre gratuit, Acquisition à titre onéreux, etc.';
