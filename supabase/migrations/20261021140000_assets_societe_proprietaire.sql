-- Bien détenu par une société du foyer (SCI…) : distinct de assets.societe_id (« ces titres sont
-- les parts de la société X »). Un tel bien sort des totaux du foyer, qui n'en détient que des parts.
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS societe_proprietaire_id uuid REFERENCES public.societes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS assets_societe_proprietaire_id_idx ON public.assets(societe_proprietaire_id);
-- Un bien de société n'est pas lui-même des parts du foyer dans une société.
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_societe_proprietaire_ou_parts;
ALTER TABLE public.assets ADD CONSTRAINT assets_societe_proprietaire_ou_parts
  CHECK (societe_proprietaire_id IS NULL OR societe_id IS NULL);
-- Valeur de la société calculée depuis ses biens et dettes (true) ou saisie à la main (false).
ALTER TABLE public.societes ADD COLUMN IF NOT EXISTS valeur_auto boolean NOT NULL DEFAULT true;
