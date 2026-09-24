-- Retrait des champs déclaratifs "bien en indivision" / "pourcentage indivision"
-- du module IFI : saisis mais jamais utilisés dans le calcul de l'assiette
-- taxable (src/lib/ifi/calcul.ts). L'IFI reste hors scope V1 ; ces champs
-- induisaient en erreur (l'utilisateur pouvait croire à une pondération
-- automatique de sa quote-part qui n'avait jamais lieu).
ALTER TABLE public.ifi_immeubles_batis
  DROP COLUMN IF EXISTS bien_en_indivision,
  DROP COLUMN IF EXISTS pourcentage_indivision;

ALTER TABLE public.ifi_immeubles_non_batis
  DROP COLUMN IF EXISTS bien_en_indivision,
  DROP COLUMN IF EXISTS pourcentage_indivision;

ALTER TABLE public.ifi_biens_detenus_indirectement
  DROP COLUMN IF EXISTS bien_en_indivision,
  DROP COLUMN IF EXISTS pourcentage_indivision;
