-- Revenus fonciers saisis dans la 2042 (cadre 4 de la 2042 et de la 2042-C, revenus 2025) — phase 4.1.
-- Le régime réel (4BA à 4BD) reste calculé par la 2044 (declarations_2044) et n'est pas stocké ici.
CREATE TABLE public.revenus_fonciers_2042 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  case_4be NUMERIC, -- micro-foncier : recettes brutes sans abattement (≤ 15 000 €)
  case_4bk NUMERIC, -- dont recettes de source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français
  case_4bl NUMERIC, -- réel : dont revenus de source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français
  case_4bn BOOLEAN, -- vous ne percevez plus de revenus fonciers en 2026
  case_4bz BOOLEAN, -- vous souscrivez une déclaration n° 2044 spéciale
  case_4by NUMERIC, -- amortissement Robien ou Borloo neuf déduit des revenus fonciers 2025
  case_4ea NUMERIC, -- réel : revenus fonciers exonérés à soumettre au taux effectif
  case_4eb NUMERIC, -- micro : recettes brutes exonérées à soumettre au taux effectif

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.revenus_fonciers_2042 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenus fonciers 2042" ON public.revenus_fonciers_2042
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus fonciers 2042" ON public.revenus_fonciers_2042
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus fonciers 2042" ON public.revenus_fonciers_2042
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus fonciers 2042" ON public.revenus_fonciers_2042
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_revenus_fonciers_2042_updated_at
  BEFORE UPDATE ON public.revenus_fonciers_2042
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
