-- Un emprunt rattaché à une société est exclu des totaux Patrimoine/Transmission
-- (filtre `!e.societe_id`). Avec ON DELETE SET NULL, supprimer la société
-- transformait ses emprunts en dettes personnelles du foyer. Table fille d'un
-- parent métier → ON DELETE CASCADE (cf. CLAUDE.md).
-- Vérifié en base le 07/10/2026 : 0 ligne dans emprunts, aucune donnée affectée.
ALTER TABLE public.emprunts DROP CONSTRAINT IF EXISTS emprunts_societe_id_fkey;
ALTER TABLE public.emprunts
  ADD CONSTRAINT emprunts_societe_id_fkey
  FOREIGN KEY (societe_id) REFERENCES public.societes(id) ON DELETE CASCADE;
