-- Foyer fiscal (Fiscalité, Phase 1 : état civil / nombre de parts, déclaration 2042).
-- Foyer indépendant, saisie manuelle, un foyer = une ligne par utilisateur (pas de lien Famille).

CREATE TABLE public.foyer_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  situation_famille TEXT NOT NULL
    CHECK (situation_famille IN ('marie', 'pacse', 'celibataire', 'divorce', 'veuf')),
  lieu_residence TEXT NOT NULL
    CHECK (lieu_residence IN ('metropole', 'guadeloupe_martinique_reunion', 'guyane_mayotte')),
  enfants_charge JSONB NOT NULL DEFAULT '[]'::jsonb,
  personnes_invalides_charge JSONB NOT NULL DEFAULT '[]'::jsonb,
  enfants_majeurs_rattaches INTEGER NOT NULL DEFAULT 0 CHECK (enfants_majeurs_rattaches >= 0),
  parent_isole BOOLEAN NOT NULL DEFAULT false,
  ancien_parent_isole BOOLEAN NOT NULL DEFAULT false,
  invalidite_declarant1 BOOLEAN NOT NULL DEFAULT false,
  invalidite_declarant2 BOOLEAN NOT NULL DEFAULT false,
  ancien_combattant_declarant1 BOOLEAN NOT NULL DEFAULT false,
  ancien_combattant_declarant2 BOOLEAN NOT NULL DEFAULT false,
  veuf_ancien_combattant BOOLEAN NOT NULL DEFAULT false,
  veuve_de_guerre BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.foyer_fiscal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own foyer fiscal" ON public.foyer_fiscal
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own foyer fiscal" ON public.foyer_fiscal
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own foyer fiscal" ON public.foyer_fiscal
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own foyer fiscal" ON public.foyer_fiscal
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_foyer_fiscal_updated_at
  BEFORE UPDATE ON public.foyer_fiscal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
