-- 2DM (2042 C) : fraction exonérée des RCM des impatriés (CGI art. 155 B), sans effet sur l'IR mais
-- retenue pour le RFR et les prélèvements sociaux (brochure IR 2026 p.135).
ALTER TABLE public.revenus_capitaux_mobiliers
  ADD COLUMN case_2dm NUMERIC;
