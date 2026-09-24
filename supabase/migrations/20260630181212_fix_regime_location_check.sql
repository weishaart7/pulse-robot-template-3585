-- Fix duplicate/conflicting CHECK constraints on assets.regime_location.
-- Migration 20251009145525 created "regime_location_check" (old values).
-- Migration 20251009153307 tried to drop "assets_regime_location_check" (wrong name),
-- leaving the old constraint alive. This migration cleans up both names and
-- re-creates the single authoritative constraint with the current value set.

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS regime_location_check;
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_regime_location_check;

-- Abort if any existing row would violate the new constraint.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assets
    WHERE regime_location IS NOT NULL
      AND regime_location NOT IN ('Micro-foncier', 'Réel', 'Micro-BIC', 'BIC')
  ) THEN
    RAISE EXCEPTION
      'Rows in assets.regime_location contain values outside the new allowed set. Migration aborted.';
  END IF;
END $$;

ALTER TABLE public.assets
  ADD CONSTRAINT assets_regime_location_check
  CHECK (regime_location IN ('Micro-foncier', 'Réel', 'Micro-BIC', 'BIC') OR regime_location IS NULL);
