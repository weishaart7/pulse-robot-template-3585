-- Persiste les blocs Fonction publique et CNAVPL de Carriere.tsx, jusqu'ici
-- calculés en mémoire mais jamais écrits en base : tout rechargement de
-- l'écran perdait silencieusement la saisie et le total consolidé tous
-- régimes sous-estimait la pension d'un client polypensionné, cf.
-- docs/audit/audit-fonction-publique-cnavpl.md.
--
-- Additif uniquement (colonnes nullable ou avec défaut inoffensif) : ne
-- casse aucune ligne existante, tous les dossiers déjà en base se
-- retrouvent avec has_fonction_publique = false / has_cnavpl = false,
-- comportement identique à celui affiché aujourd'hui après rechargement.

ALTER TABLE public.retraite_data
  ADD COLUMN has_fonction_publique boolean NOT NULL DEFAULT false,
  ADD COLUMN trimestres_liquidables_fp integer,
  ADD COLUMN traitement_indiciaire_brut numeric,
  ADD COLUMN points_rafp numeric,
  ADD COLUMN depart_anticipe_categorie_active boolean NOT NULL DEFAULT false,
  ADD COLUMN age_depart_anticipe numeric,
  ADD COLUMN age_annulation_decote numeric,
  ADD COLUMN depart_pour_invalidite boolean NOT NULL DEFAULT false,
  ADD COLUMN annee_ouverture_droits integer,
  ADD COLUMN has_cnavpl boolean NOT NULL DEFAULT false,
  ADD COLUMN trimestres_cnavpl integer,
  ADD COLUMN points_cnavpl numeric,
  ADD COLUMN valeur_point_cnavpl numeric;

COMMENT ON COLUMN public.retraite_data.has_fonction_publique IS
  'Carrière fonction publique (SRE/CNRACL) déclarée pour ce profil — CarriereFonctionPublique.tsx.';
COMMENT ON COLUMN public.retraite_data.trimestres_liquidables_fp IS
  'Trimestres liquidables fonction publique, saisie manuelle.';
COMMENT ON COLUMN public.retraite_data.traitement_indiciaire_brut IS
  'Dernier traitement indiciaire brut annuel détenu depuis au moins 6 mois avant cessation (référentiel §7.1).';
COMMENT ON COLUMN public.retraite_data.points_rafp IS
  'Points RAFP déjà accumulés (compte individuel RAFP, rafp.fr).';
COMMENT ON COLUMN public.retraite_data.depart_anticipe_categorie_active IS
  'Départ anticipé catégorie active déclaré — conditionne l''usage de age_depart_anticipe/age_annulation_decote dans le calcul de décote sur âge.';
COMMENT ON COLUMN public.retraite_data.age_depart_anticipe IS
  'Âge de départ anticipé catégorie active, saisie manuelle (aucune table de corps encodée).';
COMMENT ON COLUMN public.retraite_data.age_annulation_decote IS
  'Âge d''annulation de la décote pour départ anticipé catégorie active, saisie manuelle.';
COMMENT ON COLUMN public.retraite_data.depart_pour_invalidite IS
  'Départ pour invalidité (moins de 15 ans de services) — change le mode de calcul du minimum garanti (référentiel §7.5).';
COMMENT ON COLUMN public.retraite_data.annee_ouverture_droits IS
  'Année d''ouverture des droits fonction publique (référentiel §7.3) — détermine le taux de décote par trimestre ; non renseigné = 1,25% par défaut.';
COMMENT ON COLUMN public.retraite_data.has_cnavpl IS
  'Carrière CNAVPL (professions libérales non réglementées) déclarée pour ce profil — CarriereCNAVPL.tsx.';
COMMENT ON COLUMN public.retraite_data.trimestres_cnavpl IS
  'Trimestres CNAVPL, saisie manuelle.';
COMMENT ON COLUMN public.retraite_data.points_cnavpl IS
  'Points CNAVPL déjà accumulés.';
COMMENT ON COLUMN public.retraite_data.valeur_point_cnavpl IS
  'Valeur du point CNAVPL retenue pour le calcul — pré-remplie avec la valeur officielle en vigueur, modifiable par l''utilisateur.';
