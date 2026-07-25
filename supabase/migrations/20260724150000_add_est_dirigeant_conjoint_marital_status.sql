-- family_profiles.est_dirigeant et family_links.est_dirigeant existent déjà.
-- Le conjoint n'a pas de ligne dans family_links (il est modélisé via les
-- champs *_conjoint de marital_status), d'où cette colonne dédiée, sur le
-- même modèle que personne_handicapee_conjoint / ancien_combattant_conjoint.
ALTER TABLE public.marital_status ADD COLUMN est_dirigeant_conjoint boolean DEFAULT false;
