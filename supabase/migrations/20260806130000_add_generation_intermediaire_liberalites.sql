-- Donation-partage transgénérationnelle (art. 1078-8 C. civ.) : identifie le
-- parent (génération intermédiaire consentante) sur la réserve duquel la
-- donation-partage au petit-enfant s'impute, au lieu de la quotité disponible
-- (traitement d'une donation ordinaire à un petit-enfant, art. 847). Pertinent
-- uniquement si type_imputation = 'partage' et beneficiaire_id désigne un
-- petit-enfant (cf. reserve.ts::imputeLiberalites, DonationForm.tsx).
ALTER TABLE public.liberalites
  ADD COLUMN IF NOT EXISTS generation_intermediaire_id UUID REFERENCES public.family_links(id) ON DELETE SET NULL;
