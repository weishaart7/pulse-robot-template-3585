-- Aligne les actifs existants sur le nouveau comportement de transfert_immobilier :
-- ce champ est désormais forcé automatiquement à true pour toute nature de la famille
-- "actifs immobiliers" (cf. useAssetForm.ts::handleSubmit), et n'est plus piloté par une
-- case à cocher manuelle sauf pour "Parts de SCI" (seule nature à la fois immobilière et
-- éligible société), qui reste exclusive avec transfert_societe.
UPDATE public.assets
SET transfert_immobilier = true
WHERE nature IN (
  'Résidence principale',
  'Résidences secondaires',
  'Terrains',
  'Terrains agricoles',
  'Immeubles locatifs (loués nus)',
  'Immeubles locatifs (LMNP)',
  'Immeubles locatifs (LMP)',
  'Immeubles professionnels (hors LMP)',
  'Autres immeubles de rapport',
  'Parts de SCI',
  'Parts de SCPI',
  'Parts de groupements fonciers',
  'Parts de GFA, GAF, GFV et GFR',
  'Bois & forêts',
  'Parts de sociétés d''épargne forestière',
  'Maison mobile (péniche, etc.)',
  'Parking / Garage / Box',
  'Autres biens d''usage'
)
AND NOT (nature = 'Parts de SCI' AND transfert_societe = true)
AND (transfert_immobilier IS DISTINCT FROM true);
