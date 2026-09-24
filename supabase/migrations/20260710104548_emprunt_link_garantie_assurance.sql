-- Lien optionnel emprunt -> actif financé/garanti (point 2). ON DELETE SET
-- NULL : la suppression de l'actif ne doit pas entraîner celle de la dette.
ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

-- Type de garantie, distinct de la nature du prêt (point 3). Aucune donnée
-- existante à migrer : "Hypothèque" n'a jamais existé comme nature de prêt.
ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS type_garantie text;

ALTER TABLE public.emprunts
  ADD CONSTRAINT emprunts_type_garantie_check
  CHECK (type_garantie IS NULL OR type_garantie IN ('Hypothèque', 'Caution', 'Nantissement', 'Aucune'));

-- Assurance emprunteur détaillée (point 4).
ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS assure boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS quotite_assuree_utilisateur numeric,
  ADD COLUMN IF NOT EXISTS quotite_assuree_conjoint numeric,
  ADD COLUMN IF NOT EXISTS capital_garanti_deces numeric;
