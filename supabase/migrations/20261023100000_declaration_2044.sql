-- Déclaration des revenus fonciers 2044 (régime réel), une par foyer et par année de revenus.
-- Calcul : src/lib/fiscalite/calculerDeclaration2044.ts. La 2044 porte le réalisé de l'année :
-- les montants sont préremplis depuis Immobilier / Actifs-Passifs au moment de l'affichage et
-- seules les surcharges sont persistées. Convention : une colonne de montant à NULL = valeur
-- préremplie (0 pour un immeuble ou une part saisi sans actif relié) ; une valeur = surcharge.
-- La rubrique 450 (déficits antérieurs) n'a pas de table propre : elle lit le stock unique
-- deficits_fonciers_reportes, partagé avec la synthèse foncière d'Immobilier.

CREATE TABLE public.declarations_2044 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annee INTEGER NOT NULL CHECK (annee >= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, annee)
);

-- Lignes 211 à 262, un immeuble (ou groupe d'immeubles de même nature et régime) par ligne.
CREATE TABLE public.declaration_2044_immeubles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID NOT NULL REFERENCES public.declarations_2044(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  denomination TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  loyers_bruts NUMERIC CHECK (loyers_bruts >= 0),                                   -- 211
  depenses_charge_locataires NUMERIC CHECK (depenses_charge_locataires >= 0),       -- 212
  recettes_diverses NUMERIC CHECK (recettes_diverses >= 0),                         -- 213
  valeur_locative_reservee NUMERIC CHECK (valeur_locative_reservee >= 0),           -- 214
  frais_administration_gestion NUMERIC CHECK (frais_administration_gestion >= 0),   -- 221
  nombre_locaux INTEGER CHECK (nombre_locaux >= 0),                                 -- 222
  primes_assurance NUMERIC CHECK (primes_assurance >= 0),                           -- 223
  travaux NUMERIC CHECK (travaux >= 0),                                             -- 224
  travaux_renovation_energetique NUMERIC CHECK (travaux_renovation_energetique >= 0), -- 224bis
  charges_non_recuperees NUMERIC CHECK (charges_non_recuperees >= 0),               -- 225
  indemnites_eviction NUMERIC CHECK (indemnites_eviction >= 0),                     -- 226
  taxes_foncieres NUMERIC CHECK (taxes_foncieres >= 0),                             -- 227
  taux_deduction_specifique NUMERIC CHECK (taux_deduction_specifique BETWEEN 0 AND 100), -- 228
  provisions_charges NUMERIC CHECK (provisions_charges >= 0),                       -- 229
  regularisation_provisions NUMERIC CHECK (regularisation_provisions >= 0),         -- 230
  interets_emprunt NUMERIC CHECK (interets_emprunt >= 0),                           -- 250
  reintegration_supplement_deduction NUMERIC CHECK (reintegration_supplement_deduction >= 0), -- 262
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (declaration_id, asset_id)
);

-- Lignes 111 à 113 : parts de sociétés immobilières ou de FPI non soumises à l'IS (attestation).
CREATE TABLE public.declaration_2044_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID NOT NULL REFERENCES public.declarations_2044(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  denomination TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  revenus_bruts NUMERIC CHECK (revenus_bruts >= 0),                                 -- 111
  frais_et_charges NUMERIC CHECK (frais_et_charges >= 0),                           -- 112
  dont_renovation_energetique NUMERIC CHECK (dont_renovation_energetique >= 0),     -- 112bis
  interets_emprunt NUMERIC CHECK (interets_emprunt >= 0),                           -- 113
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (declaration_id, asset_id)
);

CREATE INDEX idx_declaration_2044_immeubles_declaration ON public.declaration_2044_immeubles(declaration_id);
CREATE INDEX idx_declaration_2044_immeubles_asset ON public.declaration_2044_immeubles(asset_id);
CREATE INDEX idx_declaration_2044_parts_declaration ON public.declaration_2044_parts(declaration_id);
CREATE INDEX idx_declaration_2044_parts_asset ON public.declaration_2044_parts(asset_id);

ALTER TABLE public.declarations_2044 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaration_2044_immeubles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaration_2044_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own declarations 2044" ON public.declarations_2044
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own declaration 2044 immeubles" ON public.declaration_2044_immeubles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage their own declaration 2044 parts" ON public.declaration_2044_parts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_declarations_2044_updated_at
  BEFORE UPDATE ON public.declarations_2044
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_declaration_2044_immeubles_updated_at
  BEFORE UPDATE ON public.declaration_2044_immeubles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_declaration_2044_parts_updated_at
  BEFORE UPDATE ON public.declaration_2044_parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
