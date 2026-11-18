-- Ventilation interne de 8TK retirée (8TK ne sert plus qu'au contrôle du crédit égal à l'impôt français).
-- Vérifié avant suppression : table vide, aucune vue ni fonction dépendante.
ALTER TABLE public.prelevement_source_divers
  DROP COLUMN IF EXISTS case_8tk186,
  DROP COLUMN IF EXISTS case_8tk172;
