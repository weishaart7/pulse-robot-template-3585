-- Add new columns to assets table for asset origin, special situation, and emotional attachment
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS origine_actif text[],
ADD COLUMN IF NOT EXISTS situation_particuliere text[],
ADD COLUMN IF NOT EXISTS attachement_emotionnel numeric CHECK (attachement_emotionnel >= 0 AND attachement_emotionnel <= 10);

-- Add comments for documentation
COMMENT ON COLUMN public.assets.origine_actif IS 'Origin of the asset (multiple choice): Acquisition à titre gratuite, Acquisition à titre onéreuse, etc.';
COMMENT ON COLUMN public.assets.situation_particuliere IS 'Special situation (multiple choice): Antichrèse, Gage, Hypothèque, Indivision, etc.';
COMMENT ON COLUMN public.assets.attachement_emotionnel IS 'Emotional attachment from 0 (none) to 10 (very strong)';