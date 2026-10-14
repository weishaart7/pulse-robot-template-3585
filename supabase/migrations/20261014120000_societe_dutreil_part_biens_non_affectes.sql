-- Pacte Dutreil après la loi de finances pour 2026 (loi n° 2026-103 du 19/02/2026, art. 8 ;
-- art. 787 B CGI, BOI-ENR-DMTG-10-20-40-10) : pour les transmissions depuis le 21/02/2026, la
-- fraction de la valeur des titres correspondant à des biens non affectés exclusivement à
-- l'activité pendant 3 ans (véhicules de tourisme, yachts, aéronefs, objets d'art, bijoux,
-- logements…) n'est plus exonérée.
-- part_biens_non_affectes : pourcentage (0 à 100) de la valeur des titres concerné. NULL = non
-- renseigné, jamais présumé : le calcul de transmission est bloqué pour un pacte validé.
alter table public.societe_dutreil add column if not exists part_biens_non_affectes numeric;
alter table public.societe_dutreil drop constraint if exists societe_dutreil_part_biens_non_affectes_check;
alter table public.societe_dutreil add constraint societe_dutreil_part_biens_non_affectes_check
  check (part_biens_non_affectes is null or (part_biens_non_affectes >= 0 and part_biens_non_affectes <= 100));
comment on column public.societe_dutreil.part_biens_non_affectes is 'Pourcentage (0-100) de la valeur des titres correspondant à des biens non affectés à l''activité (art. 787 B CGI, LF 2026), exclu de l''exonération. NULL = non renseigné, calcul bloqué.';
