-- Champ déclaratif requis pour l'alerte de conseil #5 (référentiel §12.8) :
-- en séparation de biens, si un seul époux rembourse un emprunt lié à un
-- bien indivis, ce remboursement peut être requalifié en contribution aux
-- charges du mariage. La titularité de la dette (colonne `detenteur`
-- existante) ne renseigne pas qui paie effectivement les mensualités —
-- ce sont deux notions distinctes, d'où cette colonne dédiée.
ALTER TABLE public.emprunts ADD COLUMN contributeur_remboursement text;
