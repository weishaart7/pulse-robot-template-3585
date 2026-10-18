-- Profit subsistant d'une amélioration (art. 1469 al. 3 ; Cass. 1re civ.,
-- 22 févr. 2017, n° 16-12.951 ; 23 mai 2024, n° 22-18.911) :
--   (valeur actuelle − valeur actuelle sans les travaux) × dépense ÷ coût total des travaux.
-- valeur_bien_sans_travaux : valeur du bien à la même date, sans les travaux.
-- cout_total_travaux : coût total des travaux, main-d'œuvre comprise (industrie
-- personnelle d'un époux ou d'un tiers valorisée), NULL = la dépense faite
-- (financement intégral). Colonnes ajoutées, aucune donnée modifiée.
ALTER TABLE public.recompenses
  ADD COLUMN IF NOT EXISTS valeur_bien_sans_travaux numeric NULL,
  ADD COLUMN IF NOT EXISTS cout_total_travaux numeric NULL;

ALTER TABLE public.creances_entre_epoux
  ADD COLUMN IF NOT EXISTS valeur_bien_sans_travaux numeric NULL,
  ADD COLUMN IF NOT EXISTS cout_total_travaux numeric NULL;
