-- Aligne la base sur le type Asset.licitation_acquereur ('utilisateur' |
-- 'conjoint') et assetSchema.ts, ce qui permet à assetService de typer ses
-- retours en Asset sans mentir. Vérifié le 07/10/2026 : 22 actifs, tous NULL.
ALTER TABLE public.assets
  ADD CONSTRAINT assets_licitation_acquereur_check
  CHECK (licitation_acquereur IS NULL OR licitation_acquereur IN ('utilisateur', 'conjoint'));
