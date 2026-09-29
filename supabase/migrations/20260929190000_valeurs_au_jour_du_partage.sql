alter table public.liberalites
  add column if not exists valeur_partage numeric check (valeur_partage >= 0);
comment on column public.liberalites.valeur_partage is
  'Donation : valeur au jour du partage, dans l''état du bien au jour de la donation (rapport, C. civ. art. 860 ; réévaluation de l''indemnité de réduction, art. 924-2). NULL = valeur au décès.';
alter table public.marital_status
  add column if not exists valeur_biens_partage numeric;
comment on column public.marital_status.valeur_biens_partage is
  'Valeur nette des biens existants au jour du partage (masse à partager, C. civ. art. 860). NULL = valeur au décès simulé.';
