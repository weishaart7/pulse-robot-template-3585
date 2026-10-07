-- Bornes de cohérence sur les passifs/emprunts, miroir de passifEmpruntSchema.ts :
-- un montant négatif augmenterait silencieusement le patrimoine net.
-- Vérifié en base le 07/10/2026 : 0 ligne dans emprunts et passifs.
ALTER TABLE public.passifs
  ADD CONSTRAINT passifs_montant_du_positif CHECK (montant_du >= 0),
  ADD CONSTRAINT passifs_pourcentages_bornes CHECK (
    (pourcentage_utilisateur IS NULL OR pourcentage_utilisateur BETWEEN 0 AND 100)
    AND (pourcentage_conjoint IS NULL OR pourcentage_conjoint BETWEEN 0 AND 100));

ALTER TABLE public.emprunts
  ADD CONSTRAINT emprunts_montants_positifs CHECK (
    (capital_restant_du IS NULL OR capital_restant_du >= 0)
    AND (mensualite IS NULL OR mensualite >= 0)
    AND (duree_restante IS NULL OR duree_restante >= 0)
    AND (capital_garanti_deces IS NULL OR capital_garanti_deces >= 0)
    AND (cout_total_credit IS NULL OR cout_total_credit >= 0)),
  ADD CONSTRAINT emprunts_pourcentages_bornes CHECK (
    (taux_interet IS NULL OR taux_interet BETWEEN 0 AND 100)
    AND (taeg IS NULL OR taeg BETWEEN 0 AND 100)
    AND (pourcentage_utilisateur IS NULL OR pourcentage_utilisateur BETWEEN 0 AND 100)
    AND (pourcentage_conjoint IS NULL OR pourcentage_conjoint BETWEEN 0 AND 100)
    AND (quotite_assuree_utilisateur IS NULL OR quotite_assuree_utilisateur BETWEEN 0 AND 100)
    AND (quotite_assuree_conjoint IS NULL OR quotite_assuree_conjoint BETWEEN 0 AND 100));
