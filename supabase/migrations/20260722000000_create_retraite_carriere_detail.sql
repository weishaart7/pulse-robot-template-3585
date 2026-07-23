CREATE TABLE public.retraite_carriere_detail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  employeur TEXT,
  type_activite TEXT NOT NULL CHECK (type_activite IN ('employeur', 'chomage', 'maladie', 'micro_entrepreneur')),
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  revenu NUMERIC,
  est_chiffre_affaires BOOLEAN NOT NULL DEFAULT false,
  regimes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT retraite_carriere_detail_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.retraite_carriere_detail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own carriere detail" ON public.retraite_carriere_detail
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_retraite_carriere_detail_updated_at
  BEFORE UPDATE ON public.retraite_carriere_detail
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
