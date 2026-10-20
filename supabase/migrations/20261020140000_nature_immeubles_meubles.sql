-- LMNP / LMP : statut du loueur (art. 155 IV CGI), apprécié pour tout le foyer, et non nature du
-- bien. Les deux natures fusionnent en « Immeubles locatifs (meublés) » ; le statut est porté par
-- type_location (valeurs inchangées, contrainte type_location_check intacte).
UPDATE public.assets
SET type_location = CASE
      WHEN nature = 'Immeubles locatifs (LMP)' THEN 'Location meublée professionnelle (LMP)'
      WHEN type_location IS NULL OR type_location = 'Location nue' THEN 'Location meublée non professionnelle (LMNP)'
      ELSE type_location
    END,
    nature = 'Immeubles locatifs (meublés)'
WHERE nature IN ('Immeubles locatifs (LMNP)', 'Immeubles locatifs (LMP)');
