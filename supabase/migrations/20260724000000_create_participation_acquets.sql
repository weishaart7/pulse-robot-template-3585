-- Participation aux acquêts (art. 1569-1581 C. civ.) — chantier créance de
-- participation, décès uniquement pour cette v1 (divorce = chantier séparé
-- plus tard). Deux tables plates, même moule que recompenses/
-- creances_entre_epoux (20260723170000_create_recompenses_creances.sql) :
-- transactions individuelles à auditer une par une, pas un bloc JSONB.
--
-- patrimoine_originaire : ce que chaque époux possédait au jour du mariage
-- (ou reçu depuis par succession/donation, art. 1570).
-- patrimoine_final : ce que chaque époux possède au jour de la dissolution.
-- Le moteur de calcul (src/lib/patrimoine/participationAcquets.ts) fait
-- Σfinal − Σoriginaire par époux pour obtenir l'acquêt net.

CREATE TABLE public.patrimoine_originaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
  epoux TEXT NOT NULL CHECK (epoux IN ('user', 'spouse')),
  nature TEXT NOT NULL,
  valeur NUMERIC NOT NULL,
  bien_professionnel BOOLEAN NOT NULL DEFAULT false,
  bien_concerne_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.patrimoine_final (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
  epoux TEXT NOT NULL CHECK (epoux IN ('user', 'spouse')),
  nature TEXT NOT NULL,
  valeur NUMERIC NOT NULL,
  bien_professionnel BOOLEAN NOT NULL DEFAULT false,
  bien_concerne_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patrimoine_originaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimoine_final ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patrimoine_originaire"
ON public.patrimoine_originaire
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patrimoine_originaire"
ON public.patrimoine_originaire
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patrimoine_originaire"
ON public.patrimoine_originaire
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patrimoine_originaire"
ON public.patrimoine_originaire
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own patrimoine_final"
ON public.patrimoine_final
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patrimoine_final"
ON public.patrimoine_final
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patrimoine_final"
ON public.patrimoine_final
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patrimoine_final"
ON public.patrimoine_final
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_patrimoine_originaire_updated_at
BEFORE UPDATE ON public.patrimoine_originaire
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patrimoine_final_updated_at
BEFORE UPDATE ON public.patrimoine_final
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
