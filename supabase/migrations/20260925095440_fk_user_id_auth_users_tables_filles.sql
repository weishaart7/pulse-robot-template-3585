-- FK user_id -> auth.users ON DELETE CASCADE manquantes (règle CLAUDE.md).
-- Vérifié avant application (2026-09-25) : 0 ligne orpheline sur les 10 tables, aucune FK user_id préexistante.
-- security_audit_log volontairement exclue (journal d'audit : cascade à décider séparément).

ALTER TABLE public.asset_indivisaires
  ADD CONSTRAINT asset_indivisaires_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.asset_valorisations
  ADD CONSTRAINT asset_valorisations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_associes
  ADD CONSTRAINT societe_associes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_bilans
  ADD CONSTRAINT societe_bilans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_comptes_courants
  ADD CONSTRAINT societe_comptes_courants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_dividendes
  ADD CONSTRAINT societe_dividendes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_dutreil
  ADD CONSTRAINT societe_dutreil_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_pactes
  ADD CONSTRAINT societe_pactes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_participations
  ADD CONSTRAINT societe_participations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societe_valorisations
  ADD CONSTRAINT societe_valorisations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
