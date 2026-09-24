-- Contrepartie du démembrement de propriété (l'autre côté de mode_detention
-- Usufruit/Nue-propriété sur l'actif). Peut être un membre de la famille
-- (family_link_id) ou un tiers non familial (type_partie='tiers'), auquel
-- cas sa date de naissance est saisie manuellement (pas de fiche à consulter).
CREATE TABLE public.asset_demembrements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('Usufruitier', 'Nu-propriétaire')),
  type_partie text NOT NULL DEFAULT 'famille' CHECK (type_partie IN ('famille', 'tiers')),
  family_link_id uuid REFERENCES public.family_links(id) ON DELETE SET NULL,
  nom_libre text,
  date_naissance_tiers date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_demembrements_asset_id ON public.asset_demembrements(asset_id);
CREATE INDEX idx_asset_demembrements_user_id ON public.asset_demembrements(user_id);

ALTER TABLE public.asset_demembrements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset demembrements"
  ON public.asset_demembrements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own asset demembrements"
  ON public.asset_demembrements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset demembrements"
  ON public.asset_demembrements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset demembrements"
  ON public.asset_demembrements FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_asset_demembrements_updated_at
  BEFORE UPDATE ON public.asset_demembrements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
