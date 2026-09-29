alter table public.liberalites
  add column if not exists droit_conjoint text
  check (droit_conjoint in ('pleine_propriete', 'usufruit'));
comment on column public.liberalites.droit_conjoint is
  'Libéralité au conjoint uniquement (beneficiaire_conjoint) : pleine_propriete (défaut si NULL) ou usufruit. En usufruit, la valeur saisie est celle des biens grevés ; imputation sur la quotité spéciale entre époux, C. civ. art. 1094-1.';
