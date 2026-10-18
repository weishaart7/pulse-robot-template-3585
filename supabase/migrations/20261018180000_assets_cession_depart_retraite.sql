-- Droits sociaux / parts de holding : cession par un dirigeant partant à la retraite, ouvrant
-- l'abattement fixe de 500 000 € (art. 150-0 D ter CGI) — 2026-10-18. Nullable.
alter table public.assets
  add column if not exists cession_depart_retraite boolean;
