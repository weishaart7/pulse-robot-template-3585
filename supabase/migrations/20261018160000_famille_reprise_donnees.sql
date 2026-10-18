-- Reprise de données Famille (vérifiée avant application, sans effet sur les calculs) :
-- 1. profession_csp_conjoint : plus écrite (profession_conjoint en texte libre),
--    ne contenait que des '' → NULL.
-- 2. clauses_contrat : seules les clés lues sont conservées (societe_acquets) ;
--    les clés du catalogue retiré en V1 (preciput, partage_inegal, …) sont supprimées.
-- 3. parent_de n'a de sens que pour un Enfant (lu par le moteur pour la seule
--    filiation des enfants) → NULL sur les autres liens.
UPDATE public.marital_status SET profession_csp_conjoint = NULL WHERE profession_csp_conjoint IS NOT NULL;

UPDATE public.marital_status
   SET clauses_contrat = CASE
         WHEN clauses_contrat ? 'societe_acquets' THEN jsonb_build_object('societe_acquets', clauses_contrat->'societe_acquets')
         ELSE NULL
       END
 WHERE clauses_contrat IS NOT NULL;

UPDATE public.family_links SET parent_de = NULL WHERE lien_familial <> 'Enfant' AND parent_de IS NOT NULL;
