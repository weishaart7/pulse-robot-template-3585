-- Pensions, retraites, rentes (cadre 1 de la 2042, revenus réels imposables — distinct de
-- revenus_exoneres_taux_effectif qui couvre les pensions étrangères exonérées pour le taux effectif).
-- Codes vérifiés visuellement sur la brochure officielle DGFiP (2042-K, revenus 2025, pages 115-119).
-- Colonnes C/D (personnes à charge) hors périmètre, comme le reste du module.

CREATE TABLE public.pensions_retraites_rentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pensions, retraites et rentes
  case_1as NUMERIC,
  case_1bs NUMERIC,

  -- Pensions de retraite en capital taxables à 7,5 %
  case_1at NUMERIC,
  case_1bt NUMERIC,

  -- Pensions en capital des plans d'épargne retraite
  case_1ai NUMERIC,
  case_1bi NUMERIC,

  -- Pensions d'invalidité
  case_1az NUMERIC,
  case_1bz NUMERIC,

  -- Pensions alimentaires perçues
  case_1ao NUMERIC,
  case_1bo NUMERIC,

  -- Pensions perçues par les non-résidents et pensions de source étrangère avec crédit d'impôt égal à l'impôt français
  case_1al NUMERIC,
  case_1bl NUMERIC,

  -- Autres pensions imposables de source étrangère
  case_1am NUMERIC,
  case_1bm NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.pensions_retraites_rentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pensions retraites rentes" ON public.pensions_retraites_rentes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pensions retraites rentes" ON public.pensions_retraites_rentes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pensions retraites rentes" ON public.pensions_retraites_rentes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pensions retraites rentes" ON public.pensions_retraites_rentes
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_pensions_retraites_rentes_updated_at
  BEFORE UPDATE ON public.pensions_retraites_rentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
