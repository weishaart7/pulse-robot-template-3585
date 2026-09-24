-- Suppression atomique d'un membre de la famille : réinitialise le rattachement
-- (enfant_de / parent_de) des membres qui en dépendent, puis supprime le membre,
-- dans une seule transaction. Remplace deux appels client successifs qui
-- pouvaient laisser des données à moitié modifiées en cas d'échec partiel.
--
-- SECURITY INVOKER : la RLS de family_links s'applique (auth.uid() = user_id),
-- le filtre explicite sur user_id rend en plus l'échec visible si l'id
-- n'appartient pas à l'utilisateur connecté.
CREATE OR REPLACE FUNCTION public.delete_family_link_cascade(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.family_links
     SET enfant_de = NULL,
         parent_de = NULL
   WHERE enfant_de = p_id::text
     AND user_id = auth.uid();

  DELETE FROM public.family_links
   WHERE id = p_id
     AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membre de la famille introuvable';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_family_link_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_family_link_cascade(uuid) TO authenticated;
