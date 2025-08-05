-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Description section
  nature TEXT NOT NULL,
  denomination TEXT,
  mode_detention TEXT,
  valeur_estimee NUMERIC,
  date_estimation DATE,
  revalorisation_annuelle NUMERIC,
  
  -- Détenteur section  
  detenteur TEXT,
  valeur_acquisition NUMERIC,
  frais_acquisition NUMERIC,
  date_acquisition DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset_charges table
CREATE TABLE public.asset_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  type_charge TEXT NOT NULL CHECK (type_charge IN ('Charges courantes', 'Charges fiscales')),
  denomination TEXT NOT NULL,
  debiteur TEXT NOT NULL CHECK (debiteur IN ('Époux 1', 'Époux 2', 'Couple')),
  
  -- Valeur section
  montant NUMERIC NOT NULL,
  unite TEXT NOT NULL CHECK (unite IN ('€', '%')),
  periodicite TEXT NOT NULL CHECK (periodicite IN ('annuelle', 'trimestrielle', 'mensuelle')),
  date_debut DATE NOT NULL,
  
  -- Durée
  duree_type TEXT NOT NULL CHECK (duree_type IN ('Indéterminée', 'Jusqu''à date', 'Pendant années')),
  duree_fin_date DATE,
  duree_annees INTEGER,
  
  impact_budget BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_charges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assets
CREATE POLICY "Users can view their own assets" 
ON public.assets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" 
ON public.assets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" 
ON public.assets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" 
ON public.assets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for asset_charges
CREATE POLICY "Users can view charges of their assets" 
ON public.asset_charges 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.assets 
  WHERE assets.id = asset_charges.asset_id 
  AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can create charges for their assets" 
ON public.asset_charges 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.assets 
  WHERE assets.id = asset_charges.asset_id 
  AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can update charges of their assets" 
ON public.asset_charges 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.assets 
  WHERE assets.id = asset_charges.asset_id 
  AND assets.user_id = auth.uid()
));

CREATE POLICY "Users can delete charges of their assets" 
ON public.asset_charges 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.assets 
  WHERE assets.id = asset_charges.asset_id 
  AND assets.user_id = auth.uid()
));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_charges_updated_at
BEFORE UPDATE ON public.asset_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();