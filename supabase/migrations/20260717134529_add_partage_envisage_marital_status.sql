-- Le droit de partage (art. 746 CGI) n'est dû que si un acte de partage est
-- effectivement dressé entre les héritiers — il ne doit jamais être présumé
-- par un outil de simulation (cf. netBreakdown.ts::computeNetPerHeir). Cette
-- colonne permet à l'utilisateur d'indiquer explicitement qu'un partage est
-- envisagé ; sans effet si un héritier est en démembrement (usufruit/nue-propriété).
ALTER TABLE public.marital_status
  ADD COLUMN IF NOT EXISTS partage_envisage boolean NOT NULL DEFAULT false;
