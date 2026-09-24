-- Ajoute 4 champs optionnels pour la famille "épargne salariale" (PEE, PEI) —
-- cf. NATURES_EPARGNE_SALARIALE dans assetTypes.ts, AssetForm.tsx pill "Caractéristiques".
ALTER TABLE public.assets
  ADD COLUMN abondement_employeur numeric,
  ADD COLUMN date_disponibilite date,
  ADD COLUMN motif_deblocage_anticipe text,
  ADD COLUMN support_investissement text;

COMMENT ON COLUMN public.assets.abondement_employeur IS 'Abondement employeur (€) — PEE/PEI';
COMMENT ON COLUMN public.assets.date_disponibilite IS 'Date de disponibilité / déblocage — PEE/PEI';
COMMENT ON COLUMN public.assets.motif_deblocage_anticipe IS 'Motif de déblocage anticipé, options dépendantes de la nature (cf. MOTIF_DEBLOCAGE_ANTICIPE_OPTIONS dans assetTypes.ts) — PEE/PEI';
COMMENT ON COLUMN public.assets.support_investissement IS 'Support d''investissement (ex. FCPE monétaire, FCPE actions diversifiées) — PEE/PEI';
