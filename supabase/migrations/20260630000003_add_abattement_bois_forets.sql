-- Adds the "Abattement de 75%" checkbox column for bois/forêts assets (ifi_immeubles_non_batis).
-- When true, the asset's taxable value is reduced to valeur_totale * 0.25 in the IFI calculation.

ALTER TABLE public.ifi_immeubles_non_batis
  ADD COLUMN IF NOT EXISTS abattement_bois_forets boolean DEFAULT false;
