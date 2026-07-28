-- Origine des fonds ayant alimenté un contrat d'assurance-vie (doctrine
-- Ciot, réf. §9.6.1) : nécessaire pour déterminer si la valeur de rachat
-- d'un contrat non dénoué détenu par le conjoint survivant doit être
-- réintégrée dans la masse commune à liquider civilement, sous régime de
-- communauté. DEFAULT 'deniers_communs' : présomption légale de communauté
-- (art. 1402 C. civ.) tant que l'utilisateur ne déclare pas le contraire.
--
-- Champ volontairement binaire : contrairement au financement mixte des
-- biens ordinaires (art. 1436, assets.financement_mixte_apport_propre, un
-- ratio calculé sur un prix d'acquisition unique), un contrat d'assurance-vie
-- est alimenté par des primes versées à des dates différentes, sans "prix
-- d'acquisition" unique auquel rapporter une part de fonds propres — le
-- financement mixte des primes n'est pas modélisé proportionnellement ici,
-- à charge du conjoint de déclarer l'origine prépondérante.
ALTER TABLE public.av_contract_details
  ADD COLUMN origine_fonds TEXT NOT NULL DEFAULT 'deniers_communs'
    CHECK (origine_fonds IN ('deniers_propres', 'deniers_communs'));
