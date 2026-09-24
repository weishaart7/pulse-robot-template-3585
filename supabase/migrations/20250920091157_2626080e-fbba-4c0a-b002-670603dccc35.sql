-- Create table for retirement data
CREATE TABLE public.retraite_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salaire_annuel_moyen NUMERIC,
  trimestres_valides INTEGER,
  trimestres_requis INTEGER DEFAULT 172,
  epargne_per NUMERIC,
  epargne_assurance_vie NUMERIC,
  autres_epargnes NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.retraite_data ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own retirement data" 
ON public.retraite_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own retirement data" 
ON public.retraite_data 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own retirement data" 
ON public.retraite_data 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retirement data" 
ON public.retraite_data 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_retraite_data_updated_at
BEFORE UPDATE ON public.retraite_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();