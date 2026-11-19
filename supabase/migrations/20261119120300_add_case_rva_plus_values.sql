-- Cadre 3 : abattement fixe (départ à la retraite d'un dirigeant) sur une plus-value imposée selon le
-- système du quotient (RVA, jumelle de 3VA pour RUA), vérifié sur le simulateur officiel 2026 et 2027.
-- Ajout nullable, non destructif.
ALTER TABLE public.plus_values_gains_divers
  ADD COLUMN case_rva NUMERIC;
