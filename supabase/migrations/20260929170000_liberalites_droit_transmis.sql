alter table public.liberalites rename column droit_conjoint to droit_transmis;
alter table public.liberalites rename constraint liberalites_droit_conjoint_check to liberalites_droit_transmis_check;
comment on column public.liberalites.droit_transmis is
  'Droit transmis au bénéficiaire : pleine_propriete (défaut si NULL) ou usufruit (viager). En usufruit, la valeur saisie est celle des biens grevés ; imputation « en assiette » sur la quotité disponible (Cass. civ. 1, 22 juin 2022) ou, pour le conjoint, sur la quotité spéciale (C. civ. art. 1094-1).';
