-- Notaires (CPRN) : classe de cotisation de la section B et moyenne des
-- produits de l'office (assiette de la section C), lues sur l'appel de
-- cotisations (cf. src/lib/retraite/calculCaissesPoints.ts).
ALTER TABLE public.retraite_data
  ADD COLUMN cprn_classe INTEGER NOT NULL DEFAULT 1 CHECK (cprn_classe BETWEEN 1 AND 8),
  ADD COLUMN cprn_produits_moyens NUMERIC CHECK (cprn_produits_moyens IS NULL OR cprn_produits_moyens >= 0);
