
-- 1. societe_bilans
CREATE TABLE public.societe_bilans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_id UUID NOT NULL,
  exercice_annee INTEGER NOT NULL,
  date_cloture DATE,
  chiffre_affaires NUMERIC,
  resultat_net NUMERIC,
  tresorerie NUMERIC,
  capitaux_propres NUMERIC,
  dettes_financieres NUMERIC,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(societe_id, exercice_annee)
);
ALTER TABLE public.societe_bilans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own bilans" ON public.societe_bilans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_societe_bilans_updated_at BEFORE UPDATE ON public.societe_bilans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. societe_associes
CREATE TABLE public.societe_associes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_id UUID NOT NULL,
  family_link_id UUID,
  nom_libre TEXT,
  societe_associee_id UUID,
  nombre_titres NUMERIC,
  pourcentage NUMERIC,
  nature_detention TEXT NOT NULL DEFAULT 'Pleine propriété',
  detention_directe BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.societe_associes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own associes" ON public.societe_associes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_societe_associes_updated_at BEFORE UPDATE ON public.societe_associes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. societe_pactes
CREATE TABLE public.societe_pactes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_id UUID NOT NULL UNIQUE,
  existe BOOLEAN NOT NULL DEFAULT false,
  date_signature DATE,
  duree_annees INTEGER,
  clause_preemption BOOLEAN DEFAULT false,
  clause_agrement BOOLEAN DEFAULT false,
  clause_sortie_conjointe BOOLEAN DEFAULT false,
  clause_drag_along BOOLEAN DEFAULT false,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.societe_pactes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pactes" ON public.societe_pactes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_societe_pactes_updated_at BEFORE UPDATE ON public.societe_pactes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. societe_comptes_courants
CREATE TABLE public.societe_comptes_courants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_id UUID NOT NULL,
  associe_id UUID,
  associe_libelle TEXT,
  solde NUMERIC NOT NULL DEFAULT 0,
  taux NUMERIC,
  date_remboursement DATE,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.societe_comptes_courants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own CCA" ON public.societe_comptes_courants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_societe_cca_updated_at BEFORE UPDATE ON public.societe_comptes_courants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. societe_dutreil
CREATE TABLE public.societe_dutreil (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_id UUID NOT NULL UNIQUE,
  engagement_collectif_date DATE,
  engagement_individuel_date DATE,
  dirigeant_family_link_id UUID,
  fonction_direction TEXT,
  eligibilite_validee BOOLEAN DEFAULT false,
  valeur_parts_transmises NUMERIC,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.societe_dutreil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own dutreil" ON public.societe_dutreil
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_societe_dutreil_updated_at BEFORE UPDATE ON public.societe_dutreil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
