-- Pacte Dutreil (art. 787 B CGI) : forme de l'engagement collectif de conservation.
-- 'signe' : engagement signé, en cours au jour de la transmission (engagement_collectif_date) ;
-- 'repute_acquis' : titres détenus depuis 2 ans par le défunt, seul ou avec son conjoint, qui y
--   exerce une fonction de direction (art. 787 B a al. 3) ;
-- 'post_mortem' : engagement signé par les héritiers dans les 6 mois du décès (art. 787 B a al. 4).
-- NULL = non renseigné : éligibilité non validée.
alter table public.societe_dutreil add column if not exists type_engagement_collectif text;
alter table public.societe_dutreil drop constraint if exists societe_dutreil_type_engagement_collectif_check;
alter table public.societe_dutreil add constraint societe_dutreil_type_engagement_collectif_check
  check (type_engagement_collectif is null or type_engagement_collectif in ('signe', 'repute_acquis', 'post_mortem'));
comment on column public.societe_dutreil.type_engagement_collectif is 'Forme de l''engagement collectif Dutreil : signe, repute_acquis ou post_mortem (art. 787 B CGI). NULL = non renseigné.';
