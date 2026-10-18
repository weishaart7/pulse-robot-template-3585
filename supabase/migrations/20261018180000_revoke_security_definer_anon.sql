-- Fonctions SECURITY DEFINER exposées via /rest/v1/rpc (alerte du linter Supabase) :
-- aucun appel depuis l'application ni depuis une Edge Function (vérifié).
-- - Toutes : plus exécutables sans connexion (log_security_event permettait de
--   remplir le journal de sécurité anonymement).
-- - has_role / is_admin_user : restent exécutables par authenticated (politiques RLS
--   d'administration sur user_roles, blog_articles, security_audit_log).
-- - Les autres ne servent qu'en trigger (EXECUTE non vérifié au déclenchement) ou
--   entre elles (exécutées alors avec les droits du propriétaire) : retirées aussi
--   à authenticated.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_societe_participation_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, uuid, text, boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_asset_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_financial_amount(numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_financial_data() FROM PUBLIC, anon, authenticated;
