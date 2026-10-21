-- Nature unique « Or et métaux précieux » : métal (informatif).
-- Cryptomonnaies : mode de conservation (plateforme ou portefeuille personnel).
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS metal text
  CHECK (metal IS NULL OR metal IN ('or', 'argent', 'platine', 'palladium'));
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS conservation_crypto text
  CHECK (conservation_crypto IS NULL OR conservation_crypto IN ('plateforme', 'portefeuille_personnel'));
