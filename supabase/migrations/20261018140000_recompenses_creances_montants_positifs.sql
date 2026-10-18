-- Montants des récompenses et créances entre époux : dépense strictement
-- positive, valeurs du bien et coût des travaux positifs ou nuls. Tables vides
-- au moment de la migration (vérifié), aucune ligne en violation.
-- (patrimoine_originaire / patrimoine_final non concernés : une valeur négative
-- y est la seule façon de saisir une dette, cf. participationAcquets.ts.)
ALTER TABLE public.recompenses
  ADD CONSTRAINT recompenses_montants_positifs CHECK (
    depense_faite > 0
    AND coalesce(valeur_bien_acquisition, 0) >= 0
    AND coalesce(valeur_bien_liquidation, 0) >= 0
    AND coalesce(valeur_bien_sans_travaux, 0) >= 0
    AND coalesce(cout_total_travaux, 0) >= 0
  );

ALTER TABLE public.creances_entre_epoux
  ADD CONSTRAINT creances_entre_epoux_montants_positifs CHECK (
    depense_faite > 0
    AND coalesce(valeur_bien_avant, 0) >= 0
    AND coalesce(valeur_bien_apres, 0) >= 0
    AND coalesce(valeur_bien_sans_travaux, 0) >= 0
    AND coalesce(cout_total_travaux, 0) >= 0
  );
