-- Valeurs fermées des colonnes Famille, garanties côté base (jusqu'ici par le
-- client seul). Vide = NULL : les 3 lignes à '' sont normalisées d'abord.
-- Vérifié avant migration : aucune autre valeur hors liste en base.
UPDATE public.family_links SET branche_familiale = NULL WHERE branche_familiale = '';
UPDATE public.family_links SET enfant_renoncant_de = NULL WHERE enfant_renoncant_de = '';

ALTER TABLE public.family_links
  ADD CONSTRAINT family_links_lien_familial_check CHECK (lien_familial IN (
    'Enfant', 'Petit-enfant', 'Arrière petit-enfant', 'Parent', 'Grand-parent', 'Arrière grand-parent',
    'Frère/Sœur', 'Neveu/Nièce', 'Petit neveu/nièce', 'Oncle/Tante', 'Cousin/Cousine', 'Tierce personne')),
  ADD CONSTRAINT family_links_branche_familiale_check CHECK (branche_familiale IN ('Branche paternelle', 'Branche maternelle')),
  ADD CONSTRAINT family_links_enfant_renoncant_de_check CHECK (enfant_renoncant_de IN ('user', 'spouse', 'both')),
  -- 'user' / 'spouse' / 'both_parents' ou id d'un autre membre (uuid).
  ADD CONSTRAINT family_links_enfant_de_check CHECK (
    enfant_de IN ('user', 'spouse', 'both_parents')
    OR enfant_de ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  ADD CONSTRAINT family_links_parent_de_check CHECK (
    parent_de IN ('user', 'spouse', 'both_parents')
    OR parent_de ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

ALTER TABLE public.marital_status
  ADD CONSTRAINT marital_status_statut_couple_check CHECK (statut_couple IN (
    'Célibataire', 'Concubinage', 'Pacsé(e)', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve')),
  ADD CONSTRAINT marital_status_regime_matrimonial_check CHECK (regime_matrimonial IN (
    'Communauté réduite aux acquêts', 'Communauté de meubles et d''acquêts', 'Communauté universelle',
    'Séparation de biens', 'Séparation de biens avec société d''acquêts', 'Participation aux acquêts')),
  ADD CONSTRAINT marital_status_convention_pacs_check CHECK (convention_pacs IN (
    'Régime de la séparation des biens', 'Indivision'));
