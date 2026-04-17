-- 1. Add columns to assets
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS bien_etranger boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS qualification_bien text,
  ADD COLUMN IF NOT EXISTS qualification_auto boolean DEFAULT true;

-- 2. Add column to emprunts
ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS reporter_budget boolean DEFAULT false;

-- 3. Create asset_indivisaires table
CREATE TABLE IF NOT EXISTS public.asset_indivisaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type_indivisaire text NOT NULL DEFAULT 'famille',
  family_link_id uuid REFERENCES public.family_links(id) ON DELETE SET NULL,
  nom_libre text,
  pourcentage numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_indivisaires_asset_id ON public.asset_indivisaires(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_indivisaires_user_id ON public.asset_indivisaires(user_id);

ALTER TABLE public.asset_indivisaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset indivisaires"
  ON public.asset_indivisaires FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own asset indivisaires"
  ON public.asset_indivisaires FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset indivisaires"
  ON public.asset_indivisaires FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset indivisaires"
  ON public.asset_indivisaires FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_asset_indivisaires_updated_at
  BEFORE UPDATE ON public.asset_indivisaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();