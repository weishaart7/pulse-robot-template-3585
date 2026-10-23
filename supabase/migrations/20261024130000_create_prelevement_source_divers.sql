-- Prélèvement à la source et divers (cadre 8 de la 2042 et de la 2042-C, revenus 2025) — phase 8.1.
-- Contributions sociales sur revenus d'activité étrangers (8TQ…8SB) : phase 8.2.
CREATE TABLE public.prelevement_source_divers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  case_8hv NUMERIC, -- retenue à la source sur salaires et pensions, déclarant 1
  case_8iv NUMERIC, -- retenue à la source, déclarant 2
  case_8jv NUMERIC, -- retenue à la source, 1re personne à charge
  case_8kv NUMERIC, -- retenue à la source, 2e personne à charge
  case_8hw NUMERIC, -- acomptes d'impôt sur le revenu, déclarant 1
  case_8iw NUMERIC, -- acomptes d'IR, déclarant 2
  case_8jw NUMERIC, -- acomptes d'IR, 1re personne à charge
  case_8kw NUMERIC, -- acomptes d'IR, 2e personne à charge
  case_8hx NUMERIC, -- acomptes de prélèvements sociaux, déclarant 1
  case_8ix NUMERIC, -- acomptes de PS, déclarant 2
  case_8jx NUMERIC, -- acomptes de PS, 1re personne à charge
  case_8kx NUMERIC, -- acomptes de PS, 2e personne à charge
  case_8hy NUMERIC, -- remboursement de trop-prélevé d'IR déjà obtenu, déclarant 1
  case_8iy NUMERIC, -- trop-prélevé d'IR, déclarant 2
  case_8jy NUMERIC, -- trop-prélevé d'IR, 1re personne à charge
  case_8ky NUMERIC, -- trop-prélevé d'IR, 2e personne à charge
  case_8hz NUMERIC, -- remboursement de trop-prélevé de PS déjà obtenu, déclarant 1
  case_8iz NUMERIC, -- trop-prélevé de PS, déclarant 2
  case_8jz NUMERIC, -- trop-prélevé de PS, 1re personne à charge
  case_8kz NUMERIC, -- trop-prélevé de PS, 2e personne à charge
  case_8hr NUMERIC, -- acompte de CDHR versé en 2025, déclarant 1
  case_8hs NUMERIC, -- acompte de CDHR versé en 2025, déclarant 2
  case_8ea NUMERIC, -- avance de 60 % sur réductions et crédits d'impôt reçue en début d'année
  case_8tk NUMERIC, -- revenus de source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français
  case_8ta NUMERIC, -- non-résidents : retenue à la source prélevée en France
  case_8ut NUMERIC, -- plus-values en report d'imposition non expiré
  case_8ti NUMERIC, -- revenus exonérés retenus pour le taux effectif (autres que salaires, pensions, fonciers)
  case_8pl NUMERIC, -- revenus de capitaux mobiliers et plus-values étrangers ouvrant droit à un crédit égal à l'impôt étranger
  case_8vl NUMERIC, -- impôt payé à l'étranger sur ces revenus
  case_8pm NUMERIC, -- autres revenus nets étrangers ouvrant droit à un crédit égal à l'impôt étranger
  case_8vm NUMERIC, -- impôt étranger sur autres revenus, déclarant 1
  case_8wm NUMERIC, -- impôt étranger sur autres revenus, déclarant 2
  case_8um NUMERIC, -- impôt étranger sur autres revenus, personne à charge
  case_8tf NUMERIC, -- reprises de réductions ou de crédits d'impôt
  case_8rf NUMERIC, -- revenus fonciers (micro, après abattement) exonérés de CSG et de CRDS
  case_8rv NUMERIC, -- rentes viagères à titre onéreux (net après abattement) exonérées de CSG et de CRDS
  case_8rc NUMERIC, -- revenus de capitaux mobiliers exonérés de CSG et de CRDS
  case_8rm NUMERIC, -- plus-values mobilières exonérées de CSG et de CRDS
  case_8tt BOOLEAN, -- contrats de capitalisation ou d'assurance-vie souscrits à l'étranger
  case_8uu BOOLEAN, -- comptes ouverts, détenus, utilisés ou clos à l'étranger
  case_8sh BOOLEAN, -- affilié à un régime d'assurance maladie EEE, Royaume-Uni ou Suisse, déclarant 1
  case_8si BOOLEAN, -- même situation, déclarant 2
  case_8vf BOOLEAN, -- revenus exonérés non retenus pour le taux effectif

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.prelevement_source_divers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prelevement source divers" ON public.prelevement_source_divers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prelevement source divers" ON public.prelevement_source_divers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prelevement source divers" ON public.prelevement_source_divers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prelevement source divers" ON public.prelevement_source_divers
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_prelevement_source_divers_updated_at
  BEFORE UPDATE ON public.prelevement_source_divers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
