-- Libéral conventionné : ouvre les régimes supplémentaires des professions
-- de santé (ASV de la CARMF…), cf. src/lib/retraite/calculCaissesPoints.ts.
ALTER TABLE public.retraite_data
  ADD COLUMN liberal_conventionne BOOLEAN NOT NULL DEFAULT false;
