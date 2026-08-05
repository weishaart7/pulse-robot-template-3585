-- Audit Bloc 1 (docs/audit-transmission-bloc1-liquidation-2026-08.md, T6) :
-- branche la clause de rapport forfaitaire (art. 860 al. 4, §9.8) au calcul,
-- ce qui nécessite un montant chiffré distinct de la valeur pleine de la
-- donation (`liberalites.montant`).
--
-- Vérifié avant migration : table `liberalites` vide (0 ligne) au moment de
-- la migration — pas de backfill nécessaire.
--
-- Nullable : seules les lignes portant la clause "Rapport forfaitaire" dans
-- `clauses` renseignent ce champ (DonationForm.tsx bloque la sauvegarde d'une
-- clause cochée sans montant, mais la colonne elle-même n'a pas à l'imposer
-- pour toutes les autres donations).
ALTER TABLE public.liberalites
  ADD COLUMN montant_rapport_forfaitaire NUMERIC
  CHECK (montant_rapport_forfaitaire IS NULL OR montant_rapport_forfaitaire > 0);
