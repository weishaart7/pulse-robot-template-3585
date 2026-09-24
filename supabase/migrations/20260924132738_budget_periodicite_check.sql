-- Budget : restreint la périodicité des revenus/charges saisis dans le module aux 5 valeurs du formulaire
-- (useBudgetEntryForm.ts, PERIODICITE_OPTIONS). Vérifié avant application le 2026-09-24 : aucune ligne
-- existante hors de ces valeurs ni NULL.
ALTER TABLE public.revenus ALTER COLUMN periodicite SET NOT NULL;
ALTER TABLE public.charges ALTER COLUMN periodicite SET NOT NULL;

ALTER TABLE public.revenus ADD CONSTRAINT revenus_periodicite_check
  CHECK (periodicite = ANY (ARRAY['mensuel','trimestriel','semestriel','annuel','ponctuel']));
ALTER TABLE public.charges ADD CONSTRAINT charges_periodicite_check
  CHECK (periodicite = ANY (ARRAY['mensuel','trimestriel','semestriel','annuel','ponctuel']));
