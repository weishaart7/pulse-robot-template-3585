-- Report des revenus distribués de parts (SCPI, groupements fonciers…) dans le Budget.
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revenus_distribues_budget boolean NOT NULL DEFAULT true;
