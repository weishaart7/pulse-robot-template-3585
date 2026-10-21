-- Actif donné en garantie d'un emprunt (nantissement d'une assurance-vie ou d'un portefeuille,
-- bien à vendre d'un crédit relais), distinct du bien financé (asset_id).
-- Informatif : n'entre dans aucun calcul. SET NULL (comme asset_id) : supprimer l'actif ne supprime pas l'emprunt.
ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS actif_garantie_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS emprunts_actif_garantie_id_idx ON public.emprunts(actif_garantie_id);
