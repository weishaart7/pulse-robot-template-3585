-- Simplification V1 module Famille : retrait de deux champs dormants (saisissables/persistants
-- mais sans lecteur métier), vérifié vide en base avant suppression.
-- family_links.est_dirigeant : jamais exposé dans un formulaire, aucun lecteur (0 ligne à true).
ALTER TABLE family_links DROP COLUMN IF EXISTS est_dirigeant;
-- family_profiles.nom_jeune_fille : champ saisissable (FicheClientForm) mais retiré de l'UI V1,
-- aucun lecteur métier, aucune ligne renseignée en base au moment du retrait.
ALTER TABLE family_profiles DROP COLUMN IF EXISTS nom_jeune_fille;
