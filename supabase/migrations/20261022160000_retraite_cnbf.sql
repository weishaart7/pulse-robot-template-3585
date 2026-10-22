-- Avocats (CNBF) : trimestres de la retraite de base forfaitaire et classe
-- de cotisation de la complémentaire (cf. src/lib/retraite/calculCNBF.ts).
ALTER TABLE public.retraite_data
  ADD COLUMN has_cnbf BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN trimestres_cnbf INTEGER,
  ADD COLUMN cnbf_classe TEXT NOT NULL DEFAULT 'C1' CHECK (cnbf_classe IN ('C1', 'C2', 'C2+'));
