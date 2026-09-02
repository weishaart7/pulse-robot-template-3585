-- Ajoute 2 champs optionnels sur les actifs "parts foncières/forestières" non éligibles au
-- module Sociétés (Parts de SCPI, Parts de groupements fonciers, Parts de GFA/GAF/GFV/GFR,
-- Parts de sociétés d'épargne forestière) — cf. AssetForm.tsx, pill "Caractéristiques".
ALTER TABLE public.assets
  ADD COLUMN revenus_distribues_12m numeric,
  ADD COLUMN regime_fiscal_parts text;

COMMENT ON COLUMN public.assets.revenus_distribues_12m IS 'Revenus distribués sur les 12 derniers mois (Parts de SCPI / groupements fonciers / GFA-GAF-GFV-GFR / sociétés d''épargne forestière)';
COMMENT ON COLUMN public.assets.regime_fiscal_parts IS 'Régime fiscal des revenus, options dépendantes de la nature (cf. REGIME_FISCAL_PARTS_OPTIONS dans assetTypes.ts)';
