-- Le champ revalorisation_annuelle n'est lu ni écrit par aucun code applicatif
-- (vérifié : toutes les valeurs existantes sont NULL). Suppression définitive.
ALTER TABLE public.assets DROP COLUMN IF EXISTS revalorisation_annuelle;
