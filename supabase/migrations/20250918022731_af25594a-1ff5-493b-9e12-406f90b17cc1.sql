-- Create emprunts table for loans
CREATE TABLE public.emprunts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nature TEXT NOT NULL,
  libelle TEXT NOT NULL,
  capital_restant_du NUMERIC,
  taux_interet NUMERIC,
  mensualite NUMERIC,
  duree_restante INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create passifs table for other liabilities
CREATE TABLE public.passifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nature TEXT NOT NULL,
  montant_du NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on emprunts
ALTER TABLE public.emprunts ENABLE ROW LEVEL SECURITY;

-- Create policies for emprunts
CREATE POLICY "Users can view their own emprunts" 
ON public.emprunts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emprunts" 
ON public.emprunts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emprunts" 
ON public.emprunts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emprunts" 
ON public.emprunts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable RLS on passifs
ALTER TABLE public.passifs ENABLE ROW LEVEL SECURITY;

-- Create policies for passifs
CREATE POLICY "Users can view their own passifs" 
ON public.passifs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own passifs" 
ON public.passifs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passifs" 
ON public.passifs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passifs" 
ON public.passifs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_emprunts_updated_at
BEFORE UPDATE ON public.emprunts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_passifs_updated_at
BEFORE UPDATE ON public.passifs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();