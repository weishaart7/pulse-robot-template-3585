alter table public.family_links
  add column if not exists lien_fratrie text
  check (lien_fratrie in ('germain', 'consanguin', 'uterin'));
comment on column public.family_links.lien_fratrie is
  'Frère/Sœur uniquement : germain (mêmes père et mère), consanguin (même père), uterin (même mère). NULL = germain. Partage de la fratrie par lignes, C. civ. art. 752.';
