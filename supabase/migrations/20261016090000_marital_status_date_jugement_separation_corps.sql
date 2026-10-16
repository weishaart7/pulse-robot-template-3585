alter table public.marital_status add column if not exists date_jugement_separation_corps date;
comment on column public.marital_status.date_jugement_separation_corps is 'Date du jugement de séparation de corps : à compter de cette date, la séparation de biens remplace le régime (art. 302 C. civ.).';
