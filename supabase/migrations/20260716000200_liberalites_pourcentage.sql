-- Corrige un bug de double comptage des legs à plusieurs légataires :
-- LegsForm attachait le même tableau `biens` complet à chaque ligne d'un
-- groupe, et buildTransmissionLiberalites sommait la valeur complète des
-- biens pour CHAQUE ligne, sans tenir compte de la part de chaque légataire.
-- Un legs partagé 50/50 entre deux légataires comptait donc 200% de sa
-- valeur réelle dans la masse de calcul.
--
-- Vérifié avant migration : 2 lignes en base, toutes deux de type
-- 'donation' (0 'legs') — aucune donnée réelle affectée par le bug,
-- pas de correction a posteriori nécessaire.
ALTER TABLE public.liberalites
  ADD COLUMN pourcentage NUMERIC;
