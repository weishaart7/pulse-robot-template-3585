-- Nuance de qualité de conjoint successible pour l'époux séparé de corps
-- (C. civ. art. 732, référentiel §5.1) : il reste conjoint successible, sauf
-- si la convention de séparation par consentement mutuel contient une clause
-- de renonciation aux droits successoraux. `separation_corps_clause_renonciation`
-- n'a de sens que si `separation_de_corps` est vrai (cf. RelationInfoForm.tsx).
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS separation_de_corps boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS separation_corps_clause_renonciation boolean NOT NULL DEFAULT false;
