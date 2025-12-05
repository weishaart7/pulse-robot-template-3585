-- Add new accounting fields to societes table
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS chiffre_affaires numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS resultat_net numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS tresorerie_disponible numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS compte_courant_associes numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS reserves numeric;
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS date_dernier_bilan date;

-- Create societe_dividendes table for dividend history
CREATE TABLE public.societe_dividendes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  societe_id uuid NOT NULL REFERENCES public.societes(id) ON DELETE CASCADE,
  exercice_annee integer NOT NULL,
  montant_brut numeric NOT NULL,
  montant_net numeric,
  date_distribution date,
  beneficiaire text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on societe_dividendes
ALTER TABLE public.societe_dividendes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for societe_dividendes
CREATE POLICY "Users can view their own dividendes" ON public.societe_dividendes
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dividendes" ON public.societe_dividendes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dividendes" ON public.societe_dividendes
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dividendes" ON public.societe_dividendes
FOR DELETE USING (auth.uid() = user_id);

-- Create societe_valorisations table for valuation history
CREATE TABLE public.societe_valorisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  societe_id uuid NOT NULL REFERENCES public.societes(id) ON DELETE CASCADE,
  date_valorisation date NOT NULL,
  valeur numeric NOT NULL,
  methode_valorisation text,
  commentaire text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on societe_valorisations
ALTER TABLE public.societe_valorisations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for societe_valorisations
CREATE POLICY "Users can view their own valorisations" ON public.societe_valorisations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own valorisations" ON public.societe_valorisations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own valorisations" ON public.societe_valorisations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own valorisations" ON public.societe_valorisations
FOR DELETE USING (auth.uid() = user_id);

-- Add societe_id to emprunts table for linking loans to companies
ALTER TABLE public.emprunts ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES public.societes(id) ON DELETE SET NULL;