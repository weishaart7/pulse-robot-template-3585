-- Nettoyage ponctuel des champs d'un statut de couple ou d'un régime quittés, restés en base
-- sous l'ancienne politique « rien n'est effacé » (désormais effacés à l'enregistrement,
-- cf. champsObsoletesPourStatut dans src/lib/family/maritalStatus.ts).
-- Marié(e) : champs du PACS obsolètes.
UPDATE public.marital_status SET convention_pacs = NULL, date_pacs = NULL, lieu_pacs = NULL
WHERE statut_couple = 'Marié(e)' AND (convention_pacs IS NOT NULL OR date_pacs IS NOT NULL OR lieu_pacs IS NOT NULL);
-- Marié(e) hors séparation avec société d'acquêts sous contrat : clause obsolète.
UPDATE public.marital_status SET clauses_contrat = NULL
WHERE statut_couple = 'Marié(e)' AND clauses_contrat IS NOT NULL
  AND NOT (regime_matrimonial ILIKE '%société d''acquêts%' AND NOT pas_de_contrat_mariage);
-- Ni marié, ni divorcé, ni veuf (le régime d'une union dissoute est conservé) : champs du mariage obsolètes.
UPDATE public.marital_status SET regime_matrimonial = NULL, date_mariage = NULL, lieu_mariage = NULL,
  pas_de_contrat_mariage = false, clauses_contrat = NULL, loi_applicable_regime = NULL,
  pays_premier_domicile_matrimonial = NULL, donation_dernier_vivant_personne = false, date_donation_personne = NULL,
  donation_dernier_vivant_conjoint = false, date_donation_conjoint = NULL, separation_de_corps = false,
  separation_corps_clause_renonciation = false, date_jugement_separation_corps = NULL, option_conjoint = NULL, duh_opte = false
WHERE statut_couple IS NOT NULL AND statut_couple NOT IN ('Marié(e)', 'Divorcé(e)', 'Veuf/Veuve');
-- Ni marié ni pacsé : champs du PACS obsolètes.
UPDATE public.marital_status SET convention_pacs = NULL, date_pacs = NULL, lieu_pacs = NULL
WHERE statut_couple IS NOT NULL AND statut_couple NOT IN ('Marié(e)', 'Pacsé(e)');
