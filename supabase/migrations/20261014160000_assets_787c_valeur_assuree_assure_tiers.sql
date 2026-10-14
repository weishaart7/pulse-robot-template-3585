-- Audit des classes d'actifs, phase C1.
-- conditions_787c : biens affectés à l'exploitation d'une entreprise individuelle (art. 787 C CGI),
--   conditions remplies (détention de 2 ans si acquis à titre onéreux, engagement de conservation de
--   4 ans par les héritiers, poursuite de l'exploitation 3 ans) → exonération de 75 %. NULL = non
--   renseigné : calcul de transmission bloqué.
-- valeur_assuree : évaluation du contrat d'assurance vol/incendie en cours, conclu depuis moins de
--   10 ans (bijoux, objets d'art, collections) — plancher fiscal de 60 % (art. 764 II CGI).
-- assure_tiers : contrat d'assurance-vie dont l'assuré n'est pas le souscripteur — non dénoué au
--   décès du souscripteur, valeur de rachat dans l'actif successoral. Défaut false (cas usuel).
alter table public.assets add column if not exists conditions_787c boolean;
alter table public.assets add column if not exists valeur_assuree numeric;
alter table public.assets add column if not exists assure_tiers boolean not null default false;
alter table public.assets drop constraint if exists assets_valeur_assuree_check;
alter table public.assets add constraint assets_valeur_assuree_check check (valeur_assuree is null or valeur_assuree >= 0);
