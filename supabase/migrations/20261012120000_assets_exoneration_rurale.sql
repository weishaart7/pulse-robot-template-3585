-- Biens ruraux, groupements fonciers, bois et forêts : exonération partielle de droits de
-- mutation à titre gratuit (art. 793-1-3°, 793-2-2° et 793 bis CGI).
-- regime_exoneration_rural : 'forestier' (bois, forêts, groupements forestiers — 3/4 sans
-- plafond), 'agricole' (GFA, GAF, GFV, biens ruraux à bail à long terme — 3/4 jusqu'à
-- 600 000 € par bénéficiaire, 1/2 au-delà) ou 'aucun'. Régime dominant pour un GFR.
-- conditions_exoneration_rural : conditions de l'exonération remplies (certificat de gestion
-- durable ; détention de 2 ans et bail à long terme). NULL = non renseigné, jamais présumé :
-- le calcul de transmission est bloqué tant que le bien n'est pas qualifié.
alter table public.assets add column if not exists regime_exoneration_rural text;
alter table public.assets add column if not exists conditions_exoneration_rural boolean;
alter table public.assets drop constraint if exists assets_regime_exoneration_rural_check;
alter table public.assets add constraint assets_regime_exoneration_rural_check
  check (regime_exoneration_rural is null or regime_exoneration_rural in ('forestier', 'agricole', 'aucun'));
