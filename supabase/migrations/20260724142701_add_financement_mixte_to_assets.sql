ALTER TABLE public.assets
  ADD COLUMN financement_mixte_apport_propre numeric;

COMMENT ON COLUMN public.assets.financement_mixte_apport_propre IS
  'Financement mixte (art. 1436 C. civ.), régimes communautaires uniquement : montant de la contribution en fonds propres apportée à l''acquisition, à comparer à valeur_acquisition (prix total). Si >= 50% du prix : bien propre, récompense due à la communauté pour le solde financé par des fonds communs. Si < 50% : bien commun, récompense due à l''époux apporteur. Sans effet si clause_remploi est actée (remploi total, cas distinct). Champ déclaratif, la récompense correspondante se documente manuellement dans le module Récompenses (table recompenses), non créée automatiquement.';
