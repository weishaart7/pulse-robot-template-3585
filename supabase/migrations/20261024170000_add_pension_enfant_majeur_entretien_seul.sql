-- Hors CERFA : plafond 6EL/6EM doublé (13 710 €) quand le parent entretient seul l'enfant majeur
-- marié/pacsé, ou célibataire, veuf ou divorcé chargé de famille (art. 156 II 2° CGI) — phase 6.1.
ALTER TABLE public.charges_deductibles
  ADD COLUMN entretien_seul_6el BOOLEAN,
  ADD COLUMN entretien_seul_6em BOOLEAN;
