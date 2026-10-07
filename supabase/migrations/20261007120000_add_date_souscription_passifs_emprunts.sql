-- Date à laquelle la dette a été contractée : détermine sa qualification
-- (dette antérieure au mariage/PACS → propre, art. 1410), cf. qualifierDette().
ALTER TABLE public.emprunts ADD COLUMN IF NOT EXISTS date_souscription date;
ALTER TABLE public.passifs ADD COLUMN IF NOT EXISTS date_souscription date;
