-- Ajoute les champs optionnels des familles "épargne bancaire / liquidités" (cf.
-- LIQUIDITES_NATURES_CHAMPS) et "valeurs mobilières et placements financiers" (cf.
-- VALEURS_MOBILIERES_NATURES_CHAMPS) dans assetTypes.ts, rendus dans AssetForm.tsx
-- (pill "Caractéristiques"). `date_echeance` est partagé entre les deux familles
-- (Compte à terme/Bons de caisse d'un côté, Produits structurés/dérivés de l'autre).
ALTER TABLE public.assets
  ADD COLUMN taux_remuneration numeric,
  ADD COLUMN date_echeance date,
  ADD COLUMN plafond_verse numeric,
  ADD COLUMN duree_blocage text,
  ADD COLUMN reduction_ir_entree numeric,
  ADD COLUMN date_attribution date,
  ADD COLUMN prix_exercice numeric,
  ADD COLUMN montant_engage numeric,
  ADD COLUMN montant_appele numeric,
  ADD COLUMN sous_jacent text,
  ADD COLUMN lieu_stockage text,
  ADD COLUMN quantite text;

COMMENT ON COLUMN public.assets.taux_remuneration IS 'Taux de rémunération (%) — CEL/PEL, Compte à terme, Bons de caisse';
COMMENT ON COLUMN public.assets.date_echeance IS 'Date d''échéance — Compte à terme/Bons de caisse (liquidités) ou Produits structurés/Autres produits dérivés (valeurs mobilières)';
COMMENT ON COLUMN public.assets.plafond_verse IS 'Montant versé (€) — PEA/PEA-PME, à comparer au plafond légal';
COMMENT ON COLUMN public.assets.duree_blocage IS 'Durée de blocage (texte libre : durée ou date) — FIP/FIP Corse/FCPI/SOFICA, private equity/club deals/SPV/dette privée';
COMMENT ON COLUMN public.assets.reduction_ir_entree IS 'Réduction d''IR à l''entrée (%) — FIP/FIP Corse/FCPI/SOFICA';
COMMENT ON COLUMN public.assets.date_attribution IS 'Date d''attribution — Stock-options, Actions gratuites';
COMMENT ON COLUMN public.assets.prix_exercice IS 'Prix d''exercice (€) — Stock-options';
COMMENT ON COLUMN public.assets.montant_engage IS 'Montant engagé (€) — Fonds de private equity, Club deals, SPV, Fonds de dette privée';
COMMENT ON COLUMN public.assets.montant_appele IS 'Montant appelé (€) — Fonds de private equity, Club deals, SPV, Fonds de dette privée';
COMMENT ON COLUMN public.assets.sous_jacent IS 'Sous-jacent (texte libre) — Produits structurés, Autres produits dérivés';
COMMENT ON COLUMN public.assets.lieu_stockage IS 'Lieu de stockage — Or (physique), Métaux précieux, Matières premières';
COMMENT ON COLUMN public.assets.quantite IS 'Quantité (texte libre, ex. 500g, 10 onces) — Or (physique), Métaux précieux, Matières premières';
