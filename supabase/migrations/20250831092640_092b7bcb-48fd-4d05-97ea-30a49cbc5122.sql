-- Table pour les immeubles bâtis IFI
CREATE TABLE public.ifi_immeubles_batis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  date_acquisition DATE,
  prix_acquisition NUMERIC,
  adresse_rue TEXT,
  adresse_code_postal TEXT,
  adresse_ville TEXT,
  adresse_pays TEXT,
  superficie_terrain NUMERIC,
  date_bail DATE,
  duree_bail TEXT,
  bien_mixte BOOLEAN DEFAULT false,
  fraction_taxable NUMERIC,
  bien_en_indivision BOOLEAN DEFAULT false,
  pourcentage_indivision NUMERIC,
  nature_droits_detenus TEXT DEFAULT 'Pleine-propriété',
  valeur_totale NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les immeubles non bâtis IFI
CREATE TABLE public.ifi_immeubles_non_batis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  nature TEXT,
  date_acquisition DATE,
  prix_acquisition NUMERIC,
  adresse_rue TEXT,
  adresse_code_postal TEXT,
  adresse_ville TEXT,
  adresse_pays TEXT,
  superficie_terrain NUMERIC,
  date_bail DATE,
  duree_bail TEXT,
  bien_mixte BOOLEAN DEFAULT false,
  fraction_taxable NUMERIC,
  bien_en_indivision BOOLEAN DEFAULT false,
  pourcentage_indivision NUMERIC,
  nature_droits_detenus TEXT DEFAULT 'Pleine-propriété',
  valeur_totale NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les biens détenus indirectement IFI
CREATE TABLE public.ifi_biens_detenus_indirectement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categorie TEXT NOT NULL,
  designation TEXT NOT NULL,
  denomination_societe TEXT,
  siren TEXT,
  adresse_rue TEXT,
  adresse_code_postal TEXT,
  adresse_ville TEXT,
  adresse_pays TEXT,
  pourcentage_capital NUMERIC,
  bien_en_indivision BOOLEAN DEFAULT false,
  pourcentage_indivision NUMERIC,
  nature_droits_detenus TEXT DEFAULT 'Pleine-propriété',
  valeur_venale_parts NUMERIC,
  valeur_bien NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les biens professionnels exonérés IFI
CREATE TABLE public.ifi_biens_professionnels_exoneres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  designation TEXT NOT NULL,
  valeur NUMERIC,
  exoneration_activite_principale BOOLEAN DEFAULT false,
  exoneration_fonction_droits BOOLEAN DEFAULT false,
  denomination_societe TEXT,
  siren TEXT,
  adresse_rue TEXT,
  adresse_code_postal TEXT,
  adresse_ville TEXT,
  adresse_pays TEXT,
  activite_entreprise TEXT,
  -- Champs pour activité professionnelle
  exercice_entreprise_individuelle BOOLEAN DEFAULT false,
  exercice_societe_personne BOOLEAN DEFAULT false,
  exercice_gerant_majoritaire_sarl BOOLEAN DEFAULT false,
  exercice_gerant_commandite BOOLEAN DEFAULT false,
  -- Champs pour fonction et droits sociaux
  fonction_exercee TEXT,
  pourcentage_capital_detenu NUMERIC,
  detention_directe BOOLEAN DEFAULT false,
  detention_societe_interposee BOOLEAN DEFAULT false,
  detenteur_redevable BOOLEAN DEFAULT false,
  detenteur_groupe_familial BOOLEAN DEFAULT false,
  pourcentage_detention NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les passifs et déductions IFI
CREATE TABLE public.ifi_passifs_deductions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type_passif TEXT NOT NULL,
  designation TEXT NOT NULL,
  montant NUMERIC,
  bien_concerne TEXT,
  date_creation DATE,
  echeance DATE,
  taux_interet NUMERIC,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour IFI hors France
CREATE TABLE public.ifi_hors_france (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pays TEXT NOT NULL,
  type_bien TEXT NOT NULL,
  designation TEXT NOT NULL,
  valeur NUMERIC,
  impot_acquitte_etranger NUMERIC,
  convention_fiscale BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les hypothèses IFI
CREATE TABLE public.ifi_hypotheses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type_hypothese TEXT NOT NULL,
  description TEXT,
  valeur NUMERIC,
  pourcentage NUMERIC,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security sur toutes les tables
ALTER TABLE public.ifi_immeubles_batis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_immeubles_non_batis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_biens_detenus_indirectement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_biens_professionnels_exoneres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_passifs_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_hors_france ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifi_hypotheses ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour ifi_immeubles_batis
CREATE POLICY "Users can view their own IFI immeubles batis" 
ON public.ifi_immeubles_batis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI immeubles batis" 
ON public.ifi_immeubles_batis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI immeubles batis" 
ON public.ifi_immeubles_batis 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI immeubles batis" 
ON public.ifi_immeubles_batis 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_immeubles_non_batis
CREATE POLICY "Users can view their own IFI immeubles non batis" 
ON public.ifi_immeubles_non_batis 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI immeubles non batis" 
ON public.ifi_immeubles_non_batis 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI immeubles non batis" 
ON public.ifi_immeubles_non_batis 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI immeubles non batis" 
ON public.ifi_immeubles_non_batis 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_biens_detenus_indirectement
CREATE POLICY "Users can view their own IFI biens detenus indirectement" 
ON public.ifi_biens_detenus_indirectement 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI biens detenus indirectement" 
ON public.ifi_biens_detenus_indirectement 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI biens detenus indirectement" 
ON public.ifi_biens_detenus_indirectement 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI biens detenus indirectement" 
ON public.ifi_biens_detenus_indirectement 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_biens_professionnels_exoneres
CREATE POLICY "Users can view their own IFI biens professionnels exoneres" 
ON public.ifi_biens_professionnels_exoneres 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI biens professionnels exoneres" 
ON public.ifi_biens_professionnels_exoneres 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI biens professionnels exoneres" 
ON public.ifi_biens_professionnels_exoneres 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI biens professionnels exoneres" 
ON public.ifi_biens_professionnels_exoneres 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_passifs_deductions
CREATE POLICY "Users can view their own IFI passifs deductions" 
ON public.ifi_passifs_deductions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI passifs deductions" 
ON public.ifi_passifs_deductions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI passifs deductions" 
ON public.ifi_passifs_deductions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI passifs deductions" 
ON public.ifi_passifs_deductions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_hors_france
CREATE POLICY "Users can view their own IFI hors france" 
ON public.ifi_hors_france 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI hors france" 
ON public.ifi_hors_france 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI hors france" 
ON public.ifi_hors_france 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI hors france" 
ON public.ifi_hors_france 
FOR DELETE 
USING (auth.uid() = user_id);

-- Politiques RLS pour ifi_hypotheses
CREATE POLICY "Users can view their own IFI hypotheses" 
ON public.ifi_hypotheses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IFI hypotheses" 
ON public.ifi_hypotheses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IFI hypotheses" 
ON public.ifi_hypotheses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IFI hypotheses" 
ON public.ifi_hypotheses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers pour les timestamps
CREATE TRIGGER update_ifi_immeubles_batis_updated_at
BEFORE UPDATE ON public.ifi_immeubles_batis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_immeubles_non_batis_updated_at
BEFORE UPDATE ON public.ifi_immeubles_non_batis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_biens_detenus_indirectement_updated_at
BEFORE UPDATE ON public.ifi_biens_detenus_indirectement
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_biens_professionnels_exoneres_updated_at
BEFORE UPDATE ON public.ifi_biens_professionnels_exoneres
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_passifs_deductions_updated_at
BEFORE UPDATE ON public.ifi_passifs_deductions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_hors_france_updated_at
BEFORE UPDATE ON public.ifi_hors_france
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifi_hypotheses_updated_at
BEFORE UPDATE ON public.ifi_hypotheses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();