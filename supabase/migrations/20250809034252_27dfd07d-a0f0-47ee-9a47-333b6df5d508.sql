-- Create table for liberalites (donations and legs)
CREATE TABLE public.liberalites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('donation', 'legs')),
  denomination TEXT NOT NULL,
  beneficiaire TEXT NOT NULL,
  montant NUMERIC,
  date_acte DATE,
  notaire TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.liberalites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own liberalites" 
ON public.liberalites 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own liberalites" 
ON public.liberalites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liberalites" 
ON public.liberalites 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liberalites" 
ON public.liberalites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_liberalites_updated_at
BEFORE UPDATE ON public.liberalites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();