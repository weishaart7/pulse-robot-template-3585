-- Libéralité au conjoint marié ou au partenaire de PACS : le conjoint n'est
-- pas une ligne de family_links (il vit dans marital_status), il ne peut donc
-- pas être désigné par beneficiaire_id (FK family_links). Ce booléen le
-- désigne à la place ; le moteur le résout vers le conjoint du graphe familial.
ALTER TABLE public.liberalites
  ADD COLUMN IF NOT EXISTS beneficiaire_conjoint boolean NOT NULL DEFAULT false;

ALTER TABLE public.liberalites
  ADD CONSTRAINT liberalites_beneficiaire_conjoint_exclusif
  CHECK (NOT (beneficiaire_conjoint AND beneficiaire_id IS NOT NULL));
