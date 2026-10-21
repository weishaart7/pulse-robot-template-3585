-- Nature unique « Fonds de capital-investissement » (ex-FIP, FIP Corse, FCPI, private equity) :
-- le type de fonds aiguille le régime fiscal et les champs affichés.
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS type_fonds text
  CHECK (type_fonds IS NULL OR type_fonds IN ('fcpi', 'fip', 'fip_corse', 'fcpr_fpci'));
