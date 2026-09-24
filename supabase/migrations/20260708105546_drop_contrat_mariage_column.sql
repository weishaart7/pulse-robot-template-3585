-- La colonne contrat_mariage n'est écrite par aucun formulaire de l'application.
-- Le calcul de succession (Transmission) lisait ce champ toujours vide et retombait
-- systématiquement sur "séparation de biens" au lieu du régime réellement saisi
-- (stocké dans regime_matrimonial). Le code a été corrigé pour lire regime_matrimonial ;
-- cette colonne devenue inutile est supprimée.
-- Vérifié au préalable : sur les lignes existantes, aucune valeur non vide dans contrat_mariage.
ALTER TABLE public.marital_status DROP COLUMN IF EXISTS contrat_mariage;
