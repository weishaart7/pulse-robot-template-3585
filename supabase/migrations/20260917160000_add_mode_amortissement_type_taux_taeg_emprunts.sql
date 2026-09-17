-- Champs déclaratifs (aucun calcul dérivé, cf. docs/patrimoine.md) ajoutés à la
-- demande du conseil : mode d'amortissement (amortissable/in fine), type de
-- taux (fixe/variable/mixte), TAEG et coût total du crédit, tels que figurant
-- sur l'offre de prêt — jamais recalculés par Kairos (le TAEG suppose des frais
-- annexes non saisis, le coût total suppose un capital initial/une durée totale
-- qu'on ne demande pas quand le prêt est déjà en cours).
ALTER TABLE public.emprunts
  ADD COLUMN mode_amortissement text NOT NULL DEFAULT 'Amortissable'
    CHECK (mode_amortissement IN ('Amortissable', 'In fine')),
  ADD COLUMN type_taux text NOT NULL DEFAULT 'Fixe'
    CHECK (type_taux IN ('Fixe', 'Variable', 'Mixte')),
  ADD COLUMN taeg numeric,
  ADD COLUMN cout_total_credit numeric;
