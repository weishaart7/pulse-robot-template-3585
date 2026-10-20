-- Typologies des locaux professionnels (Bureau, Commerce, Local d'activité, Entrepôt, Cabinet).
-- Élargissement seul : aucune valeur existante n'est invalidée.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS check_typologie_bien;
ALTER TABLE public.assets ADD CONSTRAINT check_typologie_bien
  CHECK (typologie_bien IS NULL OR typologie_bien IN (
    'Appartement', 'Maison', 'Parking', 'Garage', 'Box',
    'Bureau', 'Commerce', 'Local d''activité', 'Entrepôt', 'Cabinet'
  ));
