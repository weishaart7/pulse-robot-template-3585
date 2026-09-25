-- asset_demembrements.user_id sans FK vers auth.users (règle CLAUDE.md).
-- Vérifié avant application : 0 ligne orpheline (table vide au 2026-09-25).
ALTER TABLE public.asset_demembrements
  ADD CONSTRAINT asset_demembrements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
