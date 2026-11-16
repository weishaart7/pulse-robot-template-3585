-- Rattachement d'enfants mariés, pacsés ou chargés de famille (cases N et P) : abattement art. 196 B CGI.
ALTER TABLE public.foyer_fiscal
  ADD COLUMN personnes_rattachees_foyer_distinct INTEGER NOT NULL DEFAULT 0 CHECK (personnes_rattachees_foyer_distinct >= 0),
  ADD COLUMN petits_enfants_rattaches_alternee INTEGER NOT NULL DEFAULT 0 CHECK (petits_enfants_rattaches_alternee >= 0);
