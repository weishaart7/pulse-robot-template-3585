-- Ajoute 3 champs optionnels pour certaines natures de la famille "épargne retraite et
-- prévoyance" (cf. RETRAITE_PREVOYANCE_NATURES_CHAMPS dans assetTypes.ts, AssetForm.tsx pill
-- "Caractéristiques").
ALTER TABLE public.assets
  ADD COLUMN capital_garanti numeric,
  ADD COLUMN beneficiaire_designe text,
  ADD COLUMN mode_sortie text;

COMMENT ON COLUMN public.assets.capital_garanti IS 'Capital garanti (Temporaire décès, Vie entière, Contrat prévoyance individuelle)';
COMMENT ON COLUMN public.assets.beneficiaire_designe IS 'Bénéficiaire désigné (Temporaire décès, Vie entière, Contrat prévoyance individuelle ; PER individuel/collectif/obligatoire uniquement si sous_type_per = Assurantiel)';
COMMENT ON COLUMN public.assets.mode_sortie IS 'Mode de sortie prévu : Rente / Capital / Mixte (natures d''épargne retraite par versements — cf. MODE_SORTIE_OPTIONS dans assetTypes.ts)';
