-- Champs déclaratifs requis pour l'alerte de conseil #7 (référentiel §12.8) :
-- communauté + parts sociales non négociables souscrites pendant le mariage
-- (le conjoint peut revendiquer la qualité d'associé, art. 1832-2).
-- Déclaratif plutôt que dérivé de societes.type_societe (texte libre non
-- normalisé, un mapping heuristique produirait des faux positifs/négatifs
-- silencieux). date_souscription est distincte de date_creation (date de
-- création de la société, pas date d'entrée du client au capital).
ALTER TABLE public.societes ADD COLUMN parts_negociables boolean DEFAULT false;
ALTER TABLE public.societes ADD COLUMN date_souscription date;
