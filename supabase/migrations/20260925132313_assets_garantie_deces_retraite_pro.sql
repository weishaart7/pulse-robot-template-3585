-- Contrats de retraite par rente (PERP, Madelin, article 83, Préfon, retraite mutualiste du combattant).
-- garantie_deces : NULL = non renseignée (jamais présumée), false = épargne acquise à l'assureur au décès.
-- conditions_exoneration_990i : primes échelonnées sur 15 ans au moins + sortie au plus tôt à la liquidation
-- de la retraite (art. 990 I al. 2 CGI).
alter table public.assets add column garantie_deces boolean;
alter table public.assets add column conditions_exoneration_990i boolean;
