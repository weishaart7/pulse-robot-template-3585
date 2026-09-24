-- Hypothèse de revenu pour les années futures manquantes (entre l'année en
-- cours et l'âge légal réel) — toggle de Synthese.tsx, cf.
-- src/lib/retraite/hypotheseRevenuFutur.ts.
--
-- Additif uniquement (colonnes nullable ou avec défaut inoffensif) : ne
-- casse aucune ligne existante, tous les dossiers déjà en base se
-- retrouvent en mode 'derniere_annee_connue' (valeur dérivée du RIS, pas de
-- saisie manuelle perdue).

ALTER TABLE public.retraite_data
  ADD COLUMN mode_hypothese_revenu_futur text NOT NULL DEFAULT 'derniere_annee_connue'
    CONSTRAINT retraite_data_mode_hypothese_revenu_futur_check
    CHECK (mode_hypothese_revenu_futur IN ('derniere_annee_connue', 'revenu_moyen_projete')),
  ADD COLUMN revenu_hypothese_manuel numeric;

COMMENT ON COLUMN public.retraite_data.mode_hypothese_revenu_futur IS
  'Mode de calcul du revenu hypothétique projeté sur les années futures manquantes : dérivé automatiquement de la dernière année connue du RIS, ou saisi manuellement.';
COMMENT ON COLUMN public.retraite_data.revenu_hypothese_manuel IS
  'Revenu annuel hypothétique saisi manuellement (mode revenu_moyen_projete uniquement) — ignoré en mode derniere_annee_connue.';
