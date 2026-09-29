-- Départ anticipé confirmé par la caisse (handicap, incapacité permanente…) :
-- motif et âge d'ouverture saisis par le conseiller, pension simulée à taux
-- plein à partir de cet âge (audit Retraite du 2026-09-29, phase 5). Les
-- conditions de ces dispositifs dépendent de justificatifs que l'outil ne
-- connaît pas : saisie déclarative plutôt que calcul d'éligibilité.
--
-- Additif uniquement (colonnes nullables) : aucun effet sur les dossiers
-- existants.

ALTER TABLE public.retraite_data
  ADD COLUMN depart_anticipe_confirme_motif text
    CHECK (depart_anticipe_confirme_motif IN ('handicap', 'incapacite_permanente', 'autre')),
  ADD COLUMN depart_anticipe_confirme_age numeric
    CHECK (depart_anticipe_confirme_age IS NULL OR (depart_anticipe_confirme_age >= 50 AND depart_anticipe_confirme_age <= 70));

COMMENT ON COLUMN public.retraite_data.depart_anticipe_confirme_motif IS
  'Motif du départ anticipé confirmé par la caisse (handicap, incapacite_permanente, autre). Non renseigné = aucun départ anticipé déclaré.';
COMMENT ON COLUMN public.retraite_data.depart_anticipe_confirme_age IS
  'Âge d''ouverture du départ anticipé confirmé par la caisse, en années décimales (ex. 62 ou 55,5) — pension simulée à taux plein dès cet âge.';
