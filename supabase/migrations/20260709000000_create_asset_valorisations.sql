-- Create asset_valorisations table for asset valuation history
CREATE TABLE public.asset_valorisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  date_valorisation date NOT NULL,
  valeur numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (asset_id, date_valorisation)
);

CREATE INDEX idx_asset_valorisations_asset_id ON public.asset_valorisations(asset_id);

ALTER TABLE public.asset_valorisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset valorisations" ON public.asset_valorisations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own asset valorisations" ON public.asset_valorisations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset valorisations" ON public.asset_valorisations
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset valorisations" ON public.asset_valorisations
FOR DELETE USING (auth.uid() = user_id);
