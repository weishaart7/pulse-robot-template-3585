-- Audit des classes d'actifs, phase C2.
-- av_contract_details.avance_en_cours : avance consentie par l'assureur, non remboursée — déduite par
--   l'assureur du capital décès versé aux bénéficiaires (assiette 990 I nette), jamais une dette de la
--   succession. Remplace la nature de passif « Avances sur contrats d'assurance-vie » (0 ligne).
-- assets.regime_retraite_etrangere : transmission d'un régime de retraite étranger au décès —
--   'actif_successoral' (épargne transmise par la succession), 'clause_beneficiaire' (capital versé
--   aux bénéficiaires désignés, régime de l'assurance-vie), 'aucune' (rente éteinte). NULL = non
--   renseigné : calcul de transmission bloqué.
alter table public.av_contract_details add column if not exists avance_en_cours numeric;
alter table public.av_contract_details drop constraint if exists av_contract_details_avance_en_cours_check;
alter table public.av_contract_details add constraint av_contract_details_avance_en_cours_check
  check (avance_en_cours is null or avance_en_cours >= 0);
alter table public.assets add column if not exists regime_retraite_etrangere text;
alter table public.assets drop constraint if exists assets_regime_retraite_etrangere_check;
alter table public.assets add constraint assets_regime_retraite_etrangere_check
  check (regime_retraite_etrangere is null or regime_retraite_etrangere in ('actif_successoral', 'clause_beneficiaire', 'aucune'));
