-- Conditions de l'exonération des frères et sœurs (art. 796-0 ter CGI), saisies
-- séparément ; exoneration_succession (lu par le moteur DMTG) en est dérivé à
-- l'enregistrement (cf. src/lib/family/familyLinkRules.ts). La condition d'âge
-- (plus de 50 ans) est calculée depuis date_naissance, sans colonne dédiée.
ALTER TABLE public.family_links
  ADD COLUMN IF NOT EXISTS exo_frere_soeur_seul boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exo_frere_soeur_infirmite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exo_frere_soeur_cohabitation_5_ans boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.family_links.exo_frere_soeur_seul IS
  'Art. 796-0 ter CGI : célibataire, veuf, divorcé ou séparé de corps';
COMMENT ON COLUMN public.family_links.exo_frere_soeur_infirmite IS
  'Art. 796-0 ter CGI : infirmité le mettant dans l''impossibilité de subvenir à ses besoins';
COMMENT ON COLUMN public.family_links.exo_frere_soeur_cohabitation_5_ans IS
  'Art. 796-0 ter CGI : domicilié avec le défunt de façon continue pendant les 5 ans précédant le décès';
