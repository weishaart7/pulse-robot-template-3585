-- Refonte des natures d'actifs (2026-10-18, docs/patrimoine.md).
-- 1. Type de groupement foncier, informatif (le régime d'exonération reste porté par
--    regime_exoneration_rural). Nullable : non renseigné pour les actifs existants.
alter table public.assets
  add column if not exists type_groupement text
  check (type_groupement in ('GFA', 'GAF', 'GFV', 'GFR', 'GFF', 'GFI'));

-- 2. Fusion de « Parts de GFA, GAF, GFV et GFR » dans « Parts de groupements fonciers ».
--    Vérifié avant application : 1 ligne concernée. Le type n'est pas deviné (régime saisi
--    « forestier », incompatible avec un GFA) : à compléter par l'utilisateur.
update public.assets
  set nature = 'Parts de groupements fonciers'
  where nature = 'Parts de GFA, GAF, GFV et GFR';
