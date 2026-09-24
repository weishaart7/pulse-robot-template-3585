-- Rattrapage des lignes antérieures à la correction B6 (docs/patrimoine.md) :
-- un bien/passif/emprunt qualifié "Bien commun" appartient au couple, son
-- détenteur est donc 'common' à 50/50 — règle déjà appliquée par les
-- formulaires, jamais rétroactivement. Sans effet sur les calculs
-- (getPartSuccessorale renvoie 50 % pour un bien commun quel que soit le
-- détenteur), seul l'affichage du détenteur change.
--
-- Vérifié avant application (2026-09-24) : 4 actifs concernés, tous
-- rattachés à un utilisateur marié en communauté réduite aux acquêts ;
-- 0 passif, 0 emprunt. Restreint aux régimes communautaires par sécurité :
-- hors communauté, c'est la qualification elle-même qui serait à revoir.

update public.assets a
set detenteur = 'common', pourcentage_utilisateur = 50, pourcentage_conjoint = 50
from public.marital_status m
where m.user_id = a.user_id
  and a.qualification_bien = 'Bien commun'
  and a.detenteur is distinct from 'common'
  and m.regime_matrimonial ilike 'communaut%';

update public.passifs p
set detenteur = 'common', pourcentage_utilisateur = 50, pourcentage_conjoint = 50
from public.marital_status m
where m.user_id = p.user_id
  and p.qualification_bien = 'Bien commun'
  and p.detenteur is distinct from 'common'
  and m.regime_matrimonial ilike 'communaut%';

update public.emprunts e
set detenteur = 'common', pourcentage_utilisateur = 50, pourcentage_conjoint = 50
from public.marital_status m
where m.user_id = e.user_id
  and e.qualification_bien = 'Bien commun'
  and e.detenteur is distinct from 'common'
  and m.regime_matrimonial ilike 'communaut%';
