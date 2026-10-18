-- Champs fiscaux par nature d'actif immobilier (2026-10-18). Tous nullables, sans valeur par
-- défaut : non renseignés pour les actifs existants (aucune donnée modifiée).
alter table public.assets
  -- Terrains : terrain à bâtir (pas de surtaxe sur la plus-value, art. 1609 nonies G CGI).
  add column if not exists terrain_constructible boolean,
  -- LMNP : résidence étudiante, seniors ou EHPAD (pas de réintégration des amortissements).
  add column if not exists residence_services boolean,
  -- Bois & forêts : surface boisée, pour la réduction d'impôt de 10 €/ha/an (art. 150 VF III CGI).
  add column if not exists surface_boisee_ha numeric check (surface_boisee_ha >= 0),
  -- Maison mobile : fixée au sol à demeure (immeuble) ou non (bien meuble, art. 150 UA CGI).
  add column if not exists fixe_au_sol boolean,
  -- Sociétés d'épargne forestière : fraction de l'actif éligible à l'exonération forestière (%).
  add column if not exists fraction_eligible_rural numeric check (fraction_eligible_rural between 0 and 100);
