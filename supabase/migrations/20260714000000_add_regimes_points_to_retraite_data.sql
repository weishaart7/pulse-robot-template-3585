ALTER TABLE public.retraite_data
  ADD COLUMN regimes_points jsonb NOT NULL DEFAULT '[]'::jsonb;
