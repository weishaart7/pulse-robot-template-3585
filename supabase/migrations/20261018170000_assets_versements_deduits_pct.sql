-- PER : part des versements volontaires déduits du revenu imposable (%), qui détermine la
-- fiscalité de la sortie en capital (2026-10-18). Nullable : non renseignée pour l'existant.
alter table public.assets
  add column if not exists versements_deduits_pct numeric check (versements_deduits_pct between 0 and 100);
