-- Add FOREIGN KEY constraints from user_id columns to auth.users(id) ON DELETE CASCADE.
-- Covers all tables that hold a direct user_id without an existing FK.

ALTER TABLE public.assets
  ADD CONSTRAINT assets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.revenus
  ADD CONSTRAINT revenus_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.charges
  ADD CONSTRAINT charges_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.emprunts
  ADD CONSTRAINT emprunts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.passifs
  ADD CONSTRAINT passifs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.liberalites
  ADD CONSTRAINT liberalites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.agenda_events
  ADD CONSTRAINT agenda_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.retraite_data
  ADD CONSTRAINT retraite_data_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.av_contract_details
  ADD CONSTRAINT av_contract_details_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.av_operations
  ADD CONSTRAINT av_operations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.societes
  ADD CONSTRAINT societes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_hypotheses
  ADD CONSTRAINT ifi_hypotheses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_immeubles_batis
  ADD CONSTRAINT ifi_immeubles_batis_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_immeubles_non_batis
  ADD CONSTRAINT ifi_immeubles_non_batis_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_biens_detenus_indirectement
  ADD CONSTRAINT ifi_biens_detenus_indirectement_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_biens_professionnels_exoneres
  ADD CONSTRAINT ifi_biens_professionnels_exoneres_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_hors_france
  ADD CONSTRAINT ifi_hors_france_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ifi_passifs_deductions
  ADD CONSTRAINT ifi_passifs_deductions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
