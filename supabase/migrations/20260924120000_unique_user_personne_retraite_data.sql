-- Une seule ligne retraite_data par personne du foyer.
-- Empêche les doublons créés par deux sauvegardes concurrentes avant
-- que l'id de la première insertion soit connu côté client (le chargement
-- via .maybeSingle() échouait alors silencieusement).
-- Vérifié avant application : aucun doublon (user_id, personne) en base.
ALTER TABLE public.retraite_data
  ADD CONSTRAINT retraite_data_user_id_personne_key UNIQUE (user_id, personne);
