-- Éléments d'extranéité du régime matrimonial (DIP, §4.4, §12.1) : simple
-- signalement déclaratif à destination du CGP, sans automatisation des
-- régimes de rattachement (Convention de La Haye 1978, Règlement Rome III).
-- Aucune contrainte de format : loi_applicable_regime reste en texte libre
-- (pas de liste fermée, une loi applicable ne se résume pas à un pays),
-- pays_premier_domicile_matrimonial suit la même convention texte libre que
-- les autres champs pays de ce projet (ex. pays_conjoint, sans CHECK en base
-- — la liste fermée COUNTRIES est imposée côté UI uniquement, cf.
-- constants/countries.ts).
ALTER TABLE public.marital_status
  ADD COLUMN loi_applicable_regime TEXT,
  ADD COLUMN pays_premier_domicile_matrimonial TEXT;
