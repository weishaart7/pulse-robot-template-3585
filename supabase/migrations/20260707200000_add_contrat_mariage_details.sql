-- La case "Pas de contrat de mariage" n'était pas persistée (pas de colonne dédiée).
-- Ajout de cette colonne, ainsi que de la date de l'acte de contrat de mariage
-- (distincte de la date du mariage civil, déjà stockée dans date_mariage).
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS pas_de_contrat_mariage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_contrat_mariage date;
