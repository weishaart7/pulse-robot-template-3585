-- Add FOREIGN KEY constraints from child tables to their parent (assets or societes).
-- Constraints already present before this migration are skipped:
--   asset_charges_asset_id_fkey, asset_indivisaires_asset_id_fkey,
--   av_contract_details_asset_id_fkey, av_operations_asset_id_fkey,
--   societe_dividendes_societe_id_fkey, societe_valorisations_societe_id_fkey

ALTER TABLE public.asset_revenus
  ADD CONSTRAINT asset_revenus_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;

ALTER TABLE public.societe_associes
  ADD CONSTRAINT societe_associes_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;

ALTER TABLE public.societe_comptes_courants
  ADD CONSTRAINT societe_comptes_courants_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;

ALTER TABLE public.societe_bilans
  ADD CONSTRAINT societe_bilans_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;

ALTER TABLE public.societe_dutreil
  ADD CONSTRAINT societe_dutreil_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;

ALTER TABLE public.societe_pactes
  ADD CONSTRAINT societe_pactes_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;
