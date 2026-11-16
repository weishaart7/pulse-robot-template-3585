-- Années de naissance des déclarants (cases 0DA/0DB) : abattement personnes âgées (art. 157 bis CGI).
-- Colonnes facultatives : null = non renseignée, abattement non calculé.
ALTER TABLE public.foyer_fiscal
  ADD COLUMN annee_naissance_declarant1 INTEGER CHECK (annee_naissance_declarant1 BETWEEN 1900 AND 2100),
  ADD COLUMN annee_naissance_declarant2 INTEGER CHECK (annee_naissance_declarant2 BETWEEN 1900 AND 2100);
