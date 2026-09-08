-- Stock de déficits fonciers reportables (location nue, régime réel), saisi manuellement
-- par l'utilisateur (ce qu'il a sur sa déclaration 2044 réelle), consommé par le moteur
-- foyer src/lib/immobilier/foncierFoyer.ts (computeFoyerFoncier) au fil des simulations.
-- Distingue la part hors intérêts (imputable sur le revenu global l'année d'origine, puis
-- reportable 10 ans sur les seuls revenus fonciers au-delà du plafond) de la part intérêts
-- d'emprunt (jamais imputable sur le revenu global, reportable 10 ans sur les revenus
-- fonciers uniquement) — cf. CGI art. 156-I-3°.

CREATE TABLE public.deficits_fonciers_reportes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annee_origine INTEGER NOT NULL CHECK (annee_origine >= 2000),
  type TEXT NOT NULL CHECK (type IN ('hors_interets', 'interets')),
  montant_initial NUMERIC NOT NULL CHECK (montant_initial >= 0),
  montant_restant NUMERIC NOT NULL CHECK (montant_restant >= 0 AND montant_restant <= montant_initial),
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deficits_fonciers_reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own deficits fonciers reportes" ON public.deficits_fonciers_reportes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_deficits_fonciers_reportes_updated_at
  BEFORE UPDATE ON public.deficits_fonciers_reportes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
