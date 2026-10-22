-- Historique des imputations du stock deficits_fonciers_reportes : une ligne par déficit consommé
-- lors d'un « Reporter le solde à l'année suivante » (deficitFoncierService.reporterAlAnneeSuivante),
-- avec l'année de revenus sur laquelle il a été imputé. Permet à la 2044 de l'année N de
-- reconstituer la colonne A de la rubrique 450 (non imputé au 31/12/N-1) :
-- montant_restant + imputations des années >= N.

CREATE TABLE public.deficit_foncier_imputations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deficit_id UUID NOT NULL REFERENCES public.deficits_fonciers_reportes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annee_imputation INTEGER NOT NULL CHECK (annee_imputation >= 2000),
  montant NUMERIC NOT NULL CHECK (montant > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deficit_foncier_imputations_deficit ON public.deficit_foncier_imputations(deficit_id);

ALTER TABLE public.deficit_foncier_imputations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own deficit foncier imputations" ON public.deficit_foncier_imputations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
