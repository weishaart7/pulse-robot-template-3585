-- 4BB est désormais saisie dans revenus_fonciers_2042 (cadre 4) : colonne informative retirée.
-- Vérifié en base avant suppression : aucune valeur renseignée.
ALTER TABLE public.cases_informatives_2042 DROP COLUMN case_4bb;
