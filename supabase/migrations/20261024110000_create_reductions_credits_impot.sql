-- Réductions et crédits d'impôt du cadre 7 de la 2042 (revenus 2025) — phase 7.1.
-- La 2042-RICI reste hors périmètre.
CREATE TABLE public.reductions_credits_impot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  case_7ud NUMERIC, -- dons aux organismes d'aide aux personnes en difficulté, du 1.1 au 13.10.2025
  case_7uq NUMERIC, -- dons aux organismes d'aide aux personnes en difficulté, du 14.10 au 31.12.2025
  case_7uj NUMERIC, -- dons pour la sauvegarde du patrimoine religieux
  case_7uf NUMERIC, -- dons aux autres organismes d'intérêt général
  case_7db NUMERIC, -- dépenses de services à la personne
  case_7dr NUMERIC, -- aides perçues pour les services à la personne
  case_7dl INTEGER, -- ascendants de plus de 65 ans bénéficiaires de l'APA
  case_7dq BOOLEAN, -- premier emploi direct d'un salarié à domicile en 2025
  case_7dg BOOLEAN, -- titulaire de la carte d'invalidité ou CMI invalidité
  membres_plus_65_ans INTEGER, -- hors CERFA : membres du foyer âgés de plus de 65 ans (majoration du plafond)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.reductions_credits_impot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reductions credits impot" ON public.reductions_credits_impot
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reductions credits impot" ON public.reductions_credits_impot
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reductions credits impot" ON public.reductions_credits_impot
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reductions credits impot" ON public.reductions_credits_impot
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_reductions_credits_impot_updated_at
  BEFORE UPDATE ON public.reductions_credits_impot
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
