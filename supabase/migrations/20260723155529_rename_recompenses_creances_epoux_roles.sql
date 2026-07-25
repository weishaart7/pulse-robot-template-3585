-- Alignement de la terminologie 'personne'/'conjoint' vers 'user'/'spouse',
-- déjà utilisée sur assets.detenteur et FamilyGraph. 0 ligne réelle dans ces
-- deux tables à ce jour (créées dans ce même chantier) : renommage direct
-- des colonnes et contraintes, aucune donnée à migrer.

ALTER TABLE public.recompenses RENAME COLUMN epoux TO detenteur;

ALTER TABLE public.recompenses DROP CONSTRAINT recompenses_epoux_check;
ALTER TABLE public.recompenses
  ADD CONSTRAINT recompenses_detenteur_check CHECK (detenteur IN ('user', 'spouse'));

ALTER TABLE public.creances_entre_epoux RENAME COLUMN epoux_creancier TO detenteur_creancier;
ALTER TABLE public.creances_entre_epoux RENAME COLUMN epoux_debiteur TO detenteur_debiteur;

ALTER TABLE public.creances_entre_epoux DROP CONSTRAINT creances_entre_epoux_epoux_creancier_check;
ALTER TABLE public.creances_entre_epoux DROP CONSTRAINT creances_entre_epoux_epoux_debiteur_check;
ALTER TABLE public.creances_entre_epoux
  ADD CONSTRAINT creances_entre_epoux_detenteur_creancier_check CHECK (detenteur_creancier IN ('user', 'spouse'));
ALTER TABLE public.creances_entre_epoux
  ADD CONSTRAINT creances_entre_epoux_detenteur_debiteur_check CHECK (detenteur_debiteur IN ('user', 'spouse'));
