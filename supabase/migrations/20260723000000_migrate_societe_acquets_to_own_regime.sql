-- La "société d'acquêts" était traitée à tort comme une clause du contrat
-- (clauses_contrat.societe_acquets) sous le régime "Séparation de biens".
-- C'est en réalité un régime matrimonial autonome à 3 masses (propre époux A /
-- société d'acquêts commune / propre époux B), désormais modélisé comme telle
-- valeur de regime_matrimonial : "Séparation de biens avec société d'acquêts".
--
-- Cette migration bascule les clients concernés vers ce nouveau régime. Elle
-- ne modifie pas la structure de clauses_contrat : les biens désignés
-- (selectedAssets) et les sous-clauses actives (préciput_sub,
-- attribution_integrale_sub, partage_inegal_sub) restent stockées sous la
-- même clé "societe_acquets" et continuent de s'appliquer telles quelles une
-- fois le régime rebasculé, aucune donnée à transférer.
--
-- Idempotente : une fois la ligne migrée, regime_matrimonial ne vaut plus
-- "Séparation de biens", donc la clause WHERE ne la sélectionne plus.
--
-- Note : la même clause existait aussi sous "Participation aux acquêts" dans
-- le catalogue de clauses (CLAUSES_BY_REGIME), mais aucun client réel n'a ce
-- régime avec la clause active (vérifié avant migration) : simple retrait de
-- l'option du catalogue côté code, sans contrepartie ici.

UPDATE public.marital_status
SET regime_matrimonial = 'Séparation de biens avec société d''acquêts'
WHERE regime_matrimonial = 'Séparation de biens'
  AND COALESCE((clauses_contrat -> 'societe_acquets' ->> 'enabled')::boolean, false) = true;
