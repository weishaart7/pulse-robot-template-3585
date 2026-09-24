-- Table des participations société → société (graphe de détention inter-sociétés).
-- Distincte de societe_associes, qui reste propre aux associés personnes physiques
-- (family_link_id / nom_libre).

CREATE TABLE public.societe_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  societe_mere_id UUID NOT NULL,
  societe_fille_id UUID NOT NULL,
  pourcentage NUMERIC NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
  nombre_titres NUMERIC,
  date_debut DATE,
  commentaire TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT societe_participations_mere_fk
    FOREIGN KEY (societe_mere_id) REFERENCES public.societes(id) ON DELETE CASCADE,
  CONSTRAINT societe_participations_fille_fk
    FOREIGN KEY (societe_fille_id) REFERENCES public.societes(id) ON DELETE CASCADE,
  CONSTRAINT societe_participations_no_self_loop
    CHECK (societe_mere_id <> societe_fille_id),
  CONSTRAINT societe_participations_unique_edge
    UNIQUE (societe_mere_id, societe_fille_id)
);

ALTER TABLE public.societe_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own participations" ON public.societe_participations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_societe_participations_updated_at
  BEFORE UPDATE ON public.societe_participations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de garde : les deux sociétés d'un lien doivent appartenir au même
-- utilisateur que la ligne, et le lien ne doit pas créer de boucle de détention.
CREATE OR REPLACE FUNCTION public.check_societe_participation_integrity()
RETURNS TRIGGER AS $$
DECLARE
  mere_user_id UUID;
  fille_user_id UUID;
  cycle_found BOOLEAN;
BEGIN
  SELECT user_id INTO mere_user_id FROM public.societes WHERE id = NEW.societe_mere_id;
  SELECT user_id INTO fille_user_id FROM public.societes WHERE id = NEW.societe_fille_id;

  IF mere_user_id IS NULL OR fille_user_id IS NULL THEN
    RAISE EXCEPTION 'Société mère ou fille introuvable';
  END IF;

  IF mere_user_id <> NEW.user_id OR fille_user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Les deux sociétés d''un lien de participation doivent appartenir au même utilisateur';
  END IF;

  -- Un lien societe_mere_id -> societe_fille_id est refusé s'il existe déjà un
  -- chemin societe_fille_id -> ... -> societe_mere_id (la fille détiendrait déjà,
  -- directement ou indirectement, la future mère).
  WITH RECURSIVE descendants AS (
    SELECT societe_fille_id AS societe_id
    FROM public.societe_participations
    WHERE societe_mere_id = NEW.societe_fille_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id)
    UNION
    SELECT sp.societe_fille_id
    FROM public.societe_participations sp
    JOIN descendants d ON sp.societe_mere_id = d.societe_id
    WHERE TG_OP = 'INSERT' OR sp.id <> NEW.id
  )
  SELECT EXISTS (
    SELECT 1 FROM descendants WHERE societe_id = NEW.societe_mere_id
  ) INTO cycle_found;

  IF cycle_found THEN
    RAISE EXCEPTION 'Ce lien créerait une boucle de détention (% détiendrait indirectement %)',
      NEW.societe_fille_id, NEW.societe_mere_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_check_societe_participation_integrity
  BEFORE INSERT OR UPDATE ON public.societe_participations
  FOR EACH ROW EXECUTE FUNCTION public.check_societe_participation_integrity();
