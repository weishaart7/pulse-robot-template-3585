-- Create asset_revenus table for property income tracking
CREATE TABLE IF NOT EXISTS public.asset_revenus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL,
  nature TEXT NOT NULL,
  montant NUMERIC NOT NULL,
  periodicite TEXT NOT NULL,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE,
  commentaire TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_revenus ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view revenus of their assets"
  ON public.asset_revenus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_revenus.asset_id
      AND assets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create revenus for their assets"
  ON public.asset_revenus
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_revenus.asset_id
      AND assets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update revenus of their assets"
  ON public.asset_revenus
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_revenus.asset_id
      AND assets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete revenus of their assets"
  ON public.asset_revenus
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.assets
      WHERE assets.id = asset_revenus.asset_id
      AND assets.user_id = auth.uid()
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_asset_revenus_updated_at
  BEFORE UPDATE ON public.asset_revenus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();