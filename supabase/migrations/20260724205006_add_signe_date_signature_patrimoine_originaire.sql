-- Champs déclaratifs requis pour l'alerte de conseil #8 (référentiel §12.8) :
-- participation aux acquêts sans état descriptif du patrimoine originaire
-- signé (art. 1570). L'existence de lignes saisies dans l'outil ne suffit
-- pas à établir qu'un état descriptif a été effectivement signé devant
-- notaire — d'où ce statut explicite, distinct du simple remplissage.
ALTER TABLE public.patrimoine_originaire ADD COLUMN signe boolean DEFAULT false;
ALTER TABLE public.patrimoine_originaire ADD COLUMN date_signature date;
