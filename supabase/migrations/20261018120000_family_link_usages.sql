-- Usages d'un membre de la famille hors de family_links : libéralités,
-- indivisions, démembrements (FK en ON DELETE SET NULL) et clauses
-- bénéficiaires d'assurance-vie (JSON familyLinkId, sans FK). Un membre
-- utilisé ne peut pas être supprimé : la référence serait vidée sans bruit et
-- fausserait le calcul (donation sans bénéficiaire, quote-part sans titulaire).
--
-- SECURITY INVOKER : la RLS de chaque table s'applique, le filtre sur user_id
-- rend en plus le périmètre explicite.
CREATE OR REPLACE FUNCTION public.family_link_usages(p_id uuid)
RETURNS TABLE (type text, libelle text, ref_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'liberalite',
         coalesce(nullif(l.denomination, ''), l.type, 'Libéralité')
           || coalesce(' du ' || to_char(l.date_acte, 'DD/MM/YYYY'), ''),
         l.id
    FROM public.liberalites l
   WHERE l.user_id = auth.uid()
     AND (l.beneficiaire_id = p_id OR l.generation_intermediaire_id = p_id)
  UNION ALL
  SELECT 'indivision',
         coalesce(nullif(a.denomination, ''), a.nature, 'Bien')
           || coalesce(' (' || trim(to_char(i.pourcentage, 'FM990.##')) || ' %)', ''),
         i.asset_id
    FROM public.asset_indivisaires i
    LEFT JOIN public.assets a ON a.id = i.asset_id
   WHERE i.user_id = auth.uid() AND i.family_link_id = p_id
  UNION ALL
  SELECT 'demembrement',
         coalesce(nullif(a.denomination, ''), a.nature, 'Bien')
           || CASE d.role WHEN 'Usufruitier' THEN ' (usufruit)' WHEN 'Nu-propriétaire' THEN ' (nue-propriété)' ELSE '' END,
         d.asset_id
    FROM public.asset_demembrements d
    LEFT JOIN public.assets a ON a.id = d.asset_id
   WHERE d.user_id = auth.uid() AND d.family_link_id = p_id
  UNION ALL
  SELECT 'assurance_vie',
         coalesce(nullif(a.denomination, ''), 'Contrat d''assurance-vie'),
         c.asset_id
    FROM public.av_contract_details c
    LEFT JOIN public.assets a ON a.id = c.asset_id
   WHERE c.user_id = auth.uid()
     AND c.clause_beneficiaire_structuree::text LIKE '%' || p_id::text || '%';
$$;

REVOKE ALL ON FUNCTION public.family_link_usages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_link_usages(uuid) TO authenticated;

-- La suppression refuse désormais un membre encore utilisé (garantie côté base,
-- même si l'interface est contournée). Le message est reconnu par le client.
CREATE OR REPLACE FUNCTION public.delete_family_link_cascade(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.family_link_usages(p_id)) THEN
    RAISE EXCEPTION 'MEMBRE_UTILISE: ce membre est utilisé ailleurs dans le dossier';
  END IF;

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
