-- À la suppression d'une société, ses actifs « parts » restent dans Patrimoine
-- (assets.societe_id ON DELETE SET NULL, inchangé) mais doivent aussi perdre
-- transfert_societe : sinon syncSocieteFromAsset recrée une société vide à la
-- prochaine sauvegarde de l'actif (case cochée + aucun societe_id).
-- Vérifié le 07/10/2026 : aucun actif rattaché à une société en base.
CREATE OR REPLACE FUNCTION public.decoche_transfert_societe_avant_suppression()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.assets SET transfert_societe = false WHERE societe_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_decoche_transfert_societe ON public.societes;
CREATE TRIGGER trg_decoche_transfert_societe
  BEFORE DELETE ON public.societes
  FOR EACH ROW EXECUTE FUNCTION public.decoche_transfert_societe_avant_suppression();
