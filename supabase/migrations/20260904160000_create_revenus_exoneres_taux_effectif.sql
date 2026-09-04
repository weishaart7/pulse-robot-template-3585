-- Salaires et pensions exonérés retenus pour le calcul du taux effectif (Fiscalité, sous-section
-- dédiée du cadre 1 de la 2042-C). Une ligne par utilisateur, saisie indépendante.
-- Table distincte de revenus_salaires : cette section a son propre encart sur le CERFA, mélange
-- salaires ET pensions, et sert un mécanisme distinct (taux effectif appliqué au reste du revenu,
-- pas une base imposable en France) — même logique de séparation que gains_actionnariat_salarie.
-- Codes vérifiés visuellement sur la brochure officielle DGFiP (2042-C, revenus 2023, pages 99/116,
-- voir docs/fiscalite.md). Colonnes C/D (personnes à charge) hors périmètre, comme le reste du module.

CREATE TABLE public.revenus_exoneres_taux_effectif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Salaires (source étrangère exonérés, retenus pour le calcul du taux effectif)
  case_1ac NUMERIC,
  case_1bc NUMERIC,

  -- Marins-pêcheurs exerçant hors des eaux territoriales françaises (case à cocher)
  case_1ge BOOLEAN NOT NULL DEFAULT false,
  case_1he BOOLEAN NOT NULL DEFAULT false,

  -- Frais réels
  case_1ae NUMERIC,
  case_1be NUMERIC,

  -- Pensions de source étrangère
  case_1ah NUMERIC,
  case_1bh NUMERIC,

  -- Pays de provenance des revenus de source étrangère
  case_rse TEXT,
  case_rsf TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.revenus_exoneres_taux_effectif ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenus exoneres taux effectif" ON public.revenus_exoneres_taux_effectif
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus exoneres taux effectif" ON public.revenus_exoneres_taux_effectif
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus exoneres taux effectif" ON public.revenus_exoneres_taux_effectif
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus exoneres taux effectif" ON public.revenus_exoneres_taux_effectif
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_revenus_exoneres_taux_effectif_updated_at
  BEFORE UPDATE ON public.revenus_exoneres_taux_effectif
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
