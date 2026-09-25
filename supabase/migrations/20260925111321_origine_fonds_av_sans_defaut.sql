-- L'origine des fonds d'un contrat AV n'est plus présumée : NULL = non renseignée.
-- Le CHECK existant (deniers_propres | deniers_communs) laisse passer NULL.
alter table public.av_contract_details alter column origine_fonds drop default;
alter table public.av_contract_details alter column origine_fonds drop not null;
