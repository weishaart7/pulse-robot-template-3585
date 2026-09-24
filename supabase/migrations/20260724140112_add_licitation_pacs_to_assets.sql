ALTER TABLE public.assets
  ADD COLUMN part_licitation_personnelle numeric,
  ADD COLUMN licitation_acquereur text;

COMMENT ON COLUMN public.assets.part_licitation_personnelle IS
  'PACS-indivision uniquement (art. 515-5-2 C. civ.) : pourcentage de la valeur du bien acquis par licitation (rachat aux autres indivisaires) au-delà de la part initiale du partenaire acquéreur. Cette portion reste personnelle, exclue de l''indivision PACS. Champ déclaratif, saisi manuellement, non injecté dans le calcul automatique de qualification (src/lib/patrimoine/qualification.ts).';

COMMENT ON COLUMN public.assets.licitation_acquereur IS
  'PACS-indivision (art. 515-5-2 C. civ.) : partenaire ayant racheté la part des autres indivisaires par licitation (''utilisateur'' ou ''conjoint''). Associé à part_licitation_personnelle.';
