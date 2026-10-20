-- Statut « Vacant » : usage « Vide » d'un local professionnel (ni occupé pour sa propre
-- activité, ni loué). Élargissement seul : aucune valeur existante n'est invalidée.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS check_statut_bien;
ALTER TABLE public.assets ADD CONSTRAINT check_statut_bien
  CHECK (statut_bien IS NULL OR statut_bien IN ('Usage personnel', 'En rénovation', 'En vente', 'Vacant'));
