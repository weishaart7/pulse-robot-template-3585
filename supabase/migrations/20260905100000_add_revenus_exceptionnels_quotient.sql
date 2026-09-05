-- Fiscalité : revenus exceptionnels ou différés à imposer selon le système du
-- quotient (art. 163-0 A CGI). Case 0XX de la 2042-C, montant unique (pas de
-- colonne déclarant 2, conforme au CERFA) — ajoutée à gains_actionnariat_salarie
-- car elle figure dans le même encart CERFA ("Gains de levée d'options, revenus
-- exonérés..., revenus exceptionnels ou différés").
--
-- Périmètre v1 : coefficient fixe 4 (revenus exceptionnels uniquement). Les
-- revenus différés à coefficient variable (nombre d'années + 1, sans case
-- CERFA dédiée pour ce nombre) restent hors périmètre — voir docs/fiscalite.md.
ALTER TABLE public.gains_actionnariat_salarie
  ADD COLUMN case_0xx NUMERIC;
