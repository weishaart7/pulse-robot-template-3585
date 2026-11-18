-- Avance immédiate du crédit services à la personne perçue en 2025 (7HB) : ajoutée au solde à payer.
ALTER TABLE public.reductions_credits_impot
  ADD COLUMN IF NOT EXISTS case_7hb NUMERIC;
