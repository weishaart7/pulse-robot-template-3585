-- Ajoute 4 champs optionnels pour certaines natures de la famille "actifs corporels"
-- (cf. CORPS_NATURES_CHAMPS dans assetTypes.ts, AssetForm.tsx pill "Caractéristiques").
ALTER TABLE public.assets
  ADD COLUMN certificat_expertise boolean,
  ADD COLUMN certificat_expertise_reference text,
  ADD COLUMN numero_serie text,
  ADD COLUMN quantite_millesime text;

COMMENT ON COLUMN public.assets.certificat_expertise IS 'Certificat d''authenticité ou expertise existant (objets d''art, montres, objets de collection, bijoux, sacs et accessoires de luxe)';
COMMENT ON COLUMN public.assets.certificat_expertise_reference IS 'Référence du certificat/expertise, saisie uniquement si certificat_expertise = true';
COMMENT ON COLUMN public.assets.numero_serie IS 'Numéro de série (Montres)';
COMMENT ON COLUMN public.assets.quantite_millesime IS 'Quantité / millésime (Vins & spiritueux d''investissement)';
