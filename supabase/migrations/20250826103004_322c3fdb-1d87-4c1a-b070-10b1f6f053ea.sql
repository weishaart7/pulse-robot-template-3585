-- Create a table for companies/societies
CREATE TABLE public.societes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  denomination TEXT NOT NULL,
  type_societe TEXT NOT NULL,
  date_creation DATE,
  valeur_estimee NUMERIC,
  pourcentage_ifi NUMERIC DEFAULT 0,
  capital_social NUMERIC,
  nombre_titres INTEGER,
  nombre_salaries INTEGER,
  jour_cloture TEXT,
  mois_cloture TEXT,
  siret TEXT,
  rue_adresse TEXT,
  code_postal TEXT,
  commune TEXT,
  pays TEXT,
  type_activite TEXT,
  regime_fiscal TEXT,
  valeur_ifi NUMERIC DEFAULT 0,
  activite TEXT,
  holding TEXT,
  forme_societe_civile TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.societes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own societes" 
ON public.societes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own societes" 
ON public.societes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own societes" 
ON public.societes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own societes" 
ON public.societes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_societes_updated_at
BEFORE UPDATE ON public.societes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();