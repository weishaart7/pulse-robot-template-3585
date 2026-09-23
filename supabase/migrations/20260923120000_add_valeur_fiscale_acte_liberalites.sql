-- Valeur déclarée dans l'acte de donation (art. 784 CGI) : base du rappel
-- fiscal des donations sur 15 ans, distincte de `montant` (valeur au décès,
-- art. 922 C. civ., utilisée par le calcul civil). NULL = non renseignée
-- (le moteur retombe alors sur `montant`, avec un avertissement).
ALTER TABLE public.liberalites
  ADD COLUMN IF NOT EXISTS valeur_fiscale_acte numeric NULL;

-- Reprise : pour une somme d'argent (valeur nominale) ou une donation-partage
-- (montant déjà au jour de l'acte, art. 1078), valeur à l'acte = montant.
UPDATE public.liberalites
SET valeur_fiscale_acte = montant
WHERE type = 'donation'
  AND valeur_fiscale_acte IS NULL
  AND montant IS NOT NULL
  AND (nature = 'Dons familiaux de sommes d''argent' OR type_imputation = 'partage');
