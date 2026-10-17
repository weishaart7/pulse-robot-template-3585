-- Données d'origine du contrat de prêt, toutes facultatives : quand capital emprunté, date de première
-- échéance et durée totale sont renseignés, le tableau d'amortissement est calculé et le capital
-- restant dû en découle (cf. src/lib/credit/contrat.ts, docs/patrimoine.md). Ajout pur de colonnes
-- nullables : aucune ligne existante n'est modifiée.
alter table public.emprunts
  add column if not exists capital_initial numeric check (capital_initial is null or capital_initial >= 0),
  add column if not exists date_premiere_echeance date,
  add column if not exists duree_totale_mois integer check (duree_totale_mois is null or duree_totale_mois > 0),
  add column if not exists differe_mois integer check (differe_mois is null or differe_mois >= 0),
  add column if not exists differe_type text check (differe_type is null or differe_type in ('partiel', 'total')),
  add column if not exists assurance_mode text check (assurance_mode is null or assurance_mode in ('taux_capital_initial', 'taux_crd', 'montant')),
  add column if not exists assurance_valeur numeric check (assurance_valeur is null or assurance_valeur >= 0),
  add column if not exists frais_dossier numeric check (frais_dossier is null or frais_dossier >= 0),
  add column if not exists frais_garantie numeric check (frais_garantie is null or frais_garantie >= 0);

-- Le différé est inclus dans la durée totale.
alter table public.emprunts
  add constraint emprunts_differe_dans_duree check (
    differe_mois is null or duree_totale_mois is null or differe_mois < duree_totale_mois
  );
