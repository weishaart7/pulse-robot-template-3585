-- Cadre 5, personnes à charge : déficits LMNP relevant des organismes de sécurité sociale (5YE, jumelle
-- de 5WE), vérifié sur le simulateur officiel 2026 et 2027. Ajout nullable, non destructif.
ALTER TABLE public.revenus_non_salaries
  ADD COLUMN case_5ye NUMERIC;
