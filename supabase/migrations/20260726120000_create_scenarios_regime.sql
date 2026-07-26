-- Scénarios de changement de régime matrimonial (réalisé ou envisagé),
-- support de l'alerte #15 (changement de régime avant donation, risque
-- d'abus de droit L. 64 LPF). Plusieurs scénarios possibles dans le temps
-- pour un même utilisateur : pas de contrainte d'unicité.
-- regime_cible reste en texte libre (sans CHECK), cohérent avec
-- marital_status.regime_matrimonial qui n'a pas non plus de contrainte en
-- base : les 6 valeurs fermées sont imposées côté UI (Select), pas en SQL.
CREATE TABLE public.scenarios_regime (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('realise', 'envisage')),
  regime_cible TEXT NOT NULL,
  date DATE NOT NULL,
  motivation_civile TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios_regime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scenarios_regime"
ON public.scenarios_regime
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios_regime"
ON public.scenarios_regime
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios_regime"
ON public.scenarios_regime
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios_regime"
ON public.scenarios_regime
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_scenarios_regime_updated_at
BEFORE UPDATE ON public.scenarios_regime
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
