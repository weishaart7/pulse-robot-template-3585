-- Fusionne la clé "attribution_integrale_survivant" (communauté universelle)
-- dans la clé canonique "attribution_integrale" (art. 1524), en ajoutant le
-- paramètre options.porteSur ('pleine_propriete' | 'usufruit', art. 1524
-- al. 2). Les deux clés représentaient la même clause ; seule
-- "attribution_integrale" reste dans le catalogue (matrimonialClauses.ts).
--
-- L'ancienne valeur "attribution_integrale_survivant" ne pouvait être que la
-- variante pleine propriété (aucune notion d'usufruit n'existait avant ce
-- chantier) : porteSur = 'pleine_propriete' est donc fidèle à l'existant, pas
-- un choix arbitraire.
--
-- Idempotente : une fois migrée, la clé "attribution_integrale_survivant"
-- n'existe plus dans clauses_contrat, donc la 1re UPDATE ne resélectionne pas
-- la ligne ; la 2e UPDATE ne resélectionne pas non plus une ligne où
-- options.porteSur est déjà renseigné.

-- 1) Migre les clients ayant activé l'ancienne clé vers la clé canonique.
UPDATE public.marital_status
SET clauses_contrat = (clauses_contrat - 'attribution_integrale_survivant')
  || jsonb_build_object(
       'attribution_integrale',
       (clauses_contrat -> 'attribution_integrale_survivant')
         || jsonb_build_object(
              'options',
              COALESCE(clauses_contrat -> 'attribution_integrale_survivant' -> 'options', '{}'::jsonb)
                || jsonb_build_object('porteSur', 'pleine_propriete')
            )
     )
WHERE COALESCE((clauses_contrat -> 'attribution_integrale_survivant' ->> 'enabled')::boolean, false) = true;

-- 2) Renseigne porteSur par défaut pour les clients déjà sur la clé
-- canonique (communauté réduite / meubles) mais sans cette option encore
-- définie, pour rester cohérent avec le comportement antérieur (pleine
-- propriété implicite).
UPDATE public.marital_status
SET clauses_contrat = jsonb_set(
  clauses_contrat,
  '{attribution_integrale,options,porteSur}',
  '"pleine_propriete"'::jsonb,
  true
)
WHERE COALESCE((clauses_contrat -> 'attribution_integrale' ->> 'enabled')::boolean, false) = true
  AND (clauses_contrat -> 'attribution_integrale' -> 'options' -> 'porteSur') IS NULL;
