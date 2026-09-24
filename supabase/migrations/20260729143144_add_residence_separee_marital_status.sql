-- L'imposition distincte des époux (art. 6, 4-a CGI) suppose une résidence
-- séparée en plus d'un régime de séparation de biens ou de participation aux
-- acquêts. Cette colonne permet à l'utilisateur de renseigner explicitement
-- ce fait, condition nécessaire pour autoriser la case imposition_distincte
-- côté UI (cf. RelationInfoForm.tsx).
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS residence_separee boolean NOT NULL DEFAULT false;
