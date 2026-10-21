-- Suivi des appels de fonds et distributions (FCPR / FPCI, fonds de dette privée).
-- Montant appelé de l'actif = somme des appels ; distributions enregistrées sans traitement fiscal.
CREATE TABLE public.fonds_mouvements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('appel', 'distribution')),
  date_mouvement DATE NOT NULL,
  montant NUMERIC NOT NULL CHECK (montant > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX fonds_mouvements_asset_id_idx ON public.fonds_mouvements(asset_id);

ALTER TABLE public.fonds_mouvements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fund movements" ON public.fonds_mouvements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fund movements" ON public.fonds_mouvements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fund movements" ON public.fonds_mouvements
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fund movements" ON public.fonds_mouvements
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
