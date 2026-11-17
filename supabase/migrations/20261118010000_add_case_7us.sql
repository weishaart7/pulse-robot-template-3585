-- Mécénat d'entreprise (7US, revenus 2025) : montant de la réduction issu de la 2069-RS.
ALTER TABLE public.reductions_credits_impot
  ADD COLUMN IF NOT EXISTS case_7us NUMERIC;
