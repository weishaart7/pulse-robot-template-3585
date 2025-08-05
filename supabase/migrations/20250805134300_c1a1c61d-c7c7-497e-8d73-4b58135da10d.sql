-- Create revenus table
CREATE TABLE public.revenus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nature TEXT NOT NULL,
  libelle TEXT NOT NULL,
  beneficiaire TEXT,
  revenu_disponible BOOLEAN DEFAULT false,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.revenus ENABLE ROW LEVEL SECURITY;

-- Create policies for revenus
CREATE POLICY "Users can view their own revenus" 
ON public.revenus 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus" 
ON public.revenus 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus" 
ON public.revenus 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus" 
ON public.revenus 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create charges table
CREATE TABLE public.charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nature TEXT NOT NULL,
  libelle TEXT NOT NULL,
  debiteur TEXT,
  montant NUMERIC,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

-- Create policies for charges
CREATE POLICY "Users can view their own charges" 
ON public.charges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charges" 
ON public.charges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charges" 
ON public.charges 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charges" 
ON public.charges 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on revenus
CREATE TRIGGER update_revenus_updated_at
BEFORE UPDATE ON public.revenus
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on charges
CREATE TRIGGER update_charges_updated_at
BEFORE UPDATE ON public.charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();