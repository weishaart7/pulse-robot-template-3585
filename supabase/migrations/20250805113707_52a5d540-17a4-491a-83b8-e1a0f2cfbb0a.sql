-- Créer la table pour les informations de fiche client
CREATE TABLE public.family_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  civility TEXT,
  nom TEXT,
  prenom TEXT,
  commune_naissance TEXT,
  pays_naissance TEXT,
  nationalite TEXT,
  date_naissance DATE,
  profession TEXT,
  telephone TEXT,
  email TEXT,
  personne_handicapee BOOLEAN DEFAULT false,
  adresse_postale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Créer la table pour la situation matrimoniale
CREATE TABLE public.marital_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut_couple TEXT,
  nom_conjoint TEXT,
  prenom_conjoint TEXT,
  date_naissance_conjoint DATE,
  nationalite_conjoint TEXT,
  profession_conjoint TEXT,
  date_pacs DATE,
  lieu_pacs TEXT,
  date_mariage DATE,
  lieu_mariage TEXT,
  nom_notaire TEXT,
  adresse_notaire TEXT,
  contrat_mariage TEXT,
  parent_isole BOOLEAN DEFAULT false,
  nombre_enfants_charges INTEGER DEFAULT 0,
  mariage_precedent_personne BOOLEAN DEFAULT false,
  mariage_precedent_conjoint BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Créer la table pour les liens familiaux
CREATE TABLE public.family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lien_familial TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT,
  date_naissance DATE,
  nationalite TEXT,
  niveau_scolaire TEXT,
  a_charge BOOLEAN DEFAULT false,
  handicap BOOLEAN DEFAULT false,
  enfant_mineur BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.family_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marital_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_links ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour family_profiles
CREATE POLICY "Users can view their own family profile" 
ON public.family_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own family profile" 
ON public.family_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family profile" 
ON public.family_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family profile" 
ON public.family_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Créer les politiques RLS pour marital_status
CREATE POLICY "Users can view their own marital status" 
ON public.marital_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own marital status" 
ON public.marital_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own marital status" 
ON public.marital_status 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own marital status" 
ON public.marital_status 
FOR DELETE 
USING (auth.uid() = user_id);

-- Créer les politiques RLS pour family_links
CREATE POLICY "Users can view their own family links" 
ON public.family_links 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own family links" 
ON public.family_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family links" 
ON public.family_links 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family links" 
ON public.family_links 
FOR DELETE 
USING (auth.uid() = user_id);

-- Créer les fonctions de mise à jour des timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour les timestamps
CREATE TRIGGER update_family_profiles_updated_at
  BEFORE UPDATE ON public.family_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marital_status_updated_at
  BEFORE UPDATE ON public.marital_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();