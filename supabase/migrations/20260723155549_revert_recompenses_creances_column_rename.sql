-- Corrige la migration précédente (20260723155529) deux minutes après son
-- application : seules les valeurs personne/conjoint devaient être
-- renommées en user/spouse, pas les noms de colonnes.
--
-- Correction : seul le jeu de valeurs devait changer ('personne'/'conjoint'
-- -> 'user'/'spouse'), pas le nom des colonnes. Revert du renommage de
-- colonnes fait par erreur dans la migration précédente ; les contraintes
-- CHECK sur 'user'/'spouse' sont conservées telles quelles.

ALTER TABLE public.recompenses RENAME COLUMN detenteur TO epoux;
ALTER TABLE public.recompenses RENAME CONSTRAINT recompenses_detenteur_check TO recompenses_epoux_check;

ALTER TABLE public.creances_entre_epoux RENAME COLUMN detenteur_creancier TO epoux_creancier;
ALTER TABLE public.creances_entre_epoux RENAME COLUMN detenteur_debiteur TO epoux_debiteur;
ALTER TABLE public.creances_entre_epoux RENAME CONSTRAINT creances_entre_epoux_detenteur_creancier_check TO creances_entre_epoux_epoux_creancier_check;
ALTER TABLE public.creances_entre_epoux RENAME CONSTRAINT creances_entre_epoux_detenteur_debiteur_check TO creances_entre_epoux_epoux_debiteur_check;
