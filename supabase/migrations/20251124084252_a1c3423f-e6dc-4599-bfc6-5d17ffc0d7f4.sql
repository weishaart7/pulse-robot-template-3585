-- Add columns for previous marriage durations
ALTER TABLE marital_status 
ADD COLUMN IF NOT EXISTS duree_mariage_precedent_personne_annees integer,
ADD COLUMN IF NOT EXISTS duree_mariage_precedent_personne_mois integer,
ADD COLUMN IF NOT EXISTS duree_mariage_precedent_conjoint_annees integer,
ADD COLUMN IF NOT EXISTS duree_mariage_precedent_conjoint_mois integer;

-- Add columns for donation au dernier vivant
ALTER TABLE marital_status
ADD COLUMN IF NOT EXISTS donation_dernier_vivant_personne boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS date_donation_personne date,
ADD COLUMN IF NOT EXISTS donation_dernier_vivant_conjoint boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS date_donation_conjoint date;

-- Add column for clauses du contrat (JSON to store all clauses)
ALTER TABLE marital_status
ADD COLUMN IF NOT EXISTS clauses_contrat jsonb;