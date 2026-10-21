-- Colonnes retirées de l'interface lors de la revue des placements financiers (21/10/2026),
-- vérifiées vides sur toutes les lignes et non référencées par une vue ou une fonction :
-- plafond_verse (doublon du montant versé du PEA), montant_appele (doublon de valeur_acquisition),
-- date_attribution (doublon de date_acquisition), sous_jacent (produits complexes retirés),
-- detention_matieres_premieres (matières premières retirées).
ALTER TABLE public.assets
  DROP COLUMN IF EXISTS plafond_verse,
  DROP COLUMN IF EXISTS montant_appele,
  DROP COLUMN IF EXISTS date_attribution,
  DROP COLUMN IF EXISTS sous_jacent,
  DROP COLUMN IF EXISTS detention_matieres_premieres;
