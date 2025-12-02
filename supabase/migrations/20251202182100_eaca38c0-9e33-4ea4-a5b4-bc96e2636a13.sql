-- Add impact_budget column to asset_revenus table
ALTER TABLE public.asset_revenus 
ADD COLUMN IF NOT EXISTS impact_budget boolean DEFAULT false;