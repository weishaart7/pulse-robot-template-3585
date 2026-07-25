-- Colonne orpheline depuis la création initiale de la table (2025-08-09) :
-- jamais peuplée par DonationForm/LegsForm, redondante avec `realise_par`
-- ("qui a réalisé l'acte"), ajouté par la migration des champs riches de
-- juillet 2026. Table vérifiée vide (0 ligne) avant suppression.
ALTER TABLE public.liberalites
  DROP COLUMN notaire;
