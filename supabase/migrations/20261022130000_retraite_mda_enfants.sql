-- Trimestres de majoration pour enfant (MDA) : écarts à l'attribution par
-- défaut (mère, régime déduit des droits de la personne). Une ligne par
-- enfant, commune au client et au conjoint. NULL = valeur par défaut.
CREATE TABLE public.retraite_mda_enfants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_link_id UUID NOT NULL UNIQUE REFERENCES public.family_links(id) ON DELETE CASCADE,
  -- Trimestres attribués au client (le conjoint reçoit 4 - valeur).
  maternite_adoption_client SMALLINT CHECK (maternite_adoption_client BETWEEN 0 AND 4),
  education_client SMALLINT CHECK (education_client BETWEEN 0 AND 4),
  regime_attribution TEXT CHECK (regime_attribution IN ('rg', 'fp', 'cnavpl')),
  bonification_fp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX retraite_mda_enfants_user_id_idx ON public.retraite_mda_enfants(user_id);

ALTER TABLE public.retraite_mda_enfants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own MDA" ON public.retraite_mda_enfants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own MDA" ON public.retraite_mda_enfants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own MDA" ON public.retraite_mda_enfants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own MDA" ON public.retraite_mda_enfants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RIS affichant déjà les MDA : ne pas les ajouter une seconde fois.
ALTER TABLE public.retraite_data
  ADD COLUMN mda_deja_au_ris BOOLEAN NOT NULL DEFAULT false;
