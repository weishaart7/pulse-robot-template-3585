-- Champ déclaratif alimentant la SURCOTE CLASSIQUE (art. L. 351-1-2 CSS) des
-- deux régimes saisis à la main : fonction publique et CNAVPL.
--
-- Pourquoi déclaratif, comme au_moins_un_trimestre_majoration_enfant : ces
-- deux régimes n'ont pas de détail de carrière année par année dans cet outil
-- (leurs trimestres sont un total saisi manuellement), donc la période de
-- référence de la surcote classique ne peut pas être reconstituée par
-- trimestresCotisesPeriodeSurcoteClassique() comme elle l'est pour le régime
-- général. Sans ce champ, le compteur était codé en dur à 0 et la surcote de
-- ces deux régimes était structurellement nulle.
--
-- ⚠️ Ne couvre PAS la surcote parentale, dont la période de référence est
-- différente (année civile précédant l'âge légal) : celle-ci reste à 0 pour
-- ces deux régimes, dette technique documentée dans docs/retraite.md.
ALTER TABLE public.retraite_data
  ADD COLUMN trimestres_cotises_apres_age_legal_fp integer NOT NULL DEFAULT 0,
  ADD COLUMN trimestres_cotises_apres_age_legal_cnavpl integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.retraite_data.trimestres_cotises_apres_age_legal_fp IS
  'Déclaratif : trimestres cotisés fonction publique au-delà de l''âge légal, période de référence de la surcote classique (art. L. 351-1-2 CSS). Jamais déduit automatiquement — aucun détail de carrière par année pour ce régime.';

COMMENT ON COLUMN public.retraite_data.trimestres_cotises_apres_age_legal_cnavpl IS
  'Déclaratif : trimestres cotisés CNAVPL au-delà de l''âge légal, période de référence de la surcote classique (art. L. 351-1-2 CSS). Jamais déduit automatiquement — aucun détail de carrière par année pour ce régime.';
