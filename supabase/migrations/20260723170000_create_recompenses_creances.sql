-- Récompenses (art. 1468-1478 C. civ.) et créances entre époux (art. 1479,
-- 1543 C. civ.) — chantier 3A. Tables dédiées (transactions individuelles à
-- auditer une par une), pas un bloc JSONB comme clauses_contrat : cf.
-- décision actée avec Titouan.
--
-- montant_calculé n'est volontairement pas une colonne : dérivé par le
-- moteur de calcul (src/lib/famille/recompenses.ts, chantier suivant),
-- recalculé à la volée pour ne jamais se désynchroniser de la logique de
-- calcul si celle-ci évolue.

CREATE TABLE public.recompenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sens TEXT NOT NULL CHECK (sens IN ('communaute_vers_epoux', 'epoux_vers_communaute')),
  -- 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
  epoux TEXT NOT NULL CHECK (epoux IN ('user', 'spouse')),
  bien_concerne_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,

  depense_faite NUMERIC NOT NULL,
  valeur_bien_acquisition NUMERIC,
  valeur_bien_liquidation NUMERIC,
  nature_depense TEXT NOT NULL CHECK (nature_depense IN ('acquisition', 'conservation', 'amelioration', 'autre')),
  mode_evaluation_conventionnel TEXT CHECK (mode_evaluation_conventionnel IN ('nominal', 'profit_subsistant', 'plafonne')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.creances_entre_epoux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  epoux_creancier TEXT NOT NULL CHECK (epoux_creancier IN ('user', 'spouse')),
  epoux_debiteur TEXT NOT NULL CHECK (epoux_debiteur IN ('user', 'spouse')),
  bien_concerne_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,

  depense_faite NUMERIC NOT NULL,
  valeur_bien_avant NUMERIC,
  valeur_bien_apres NUMERIC,
  nature_depense TEXT NOT NULL CHECK (nature_depense IN ('acquisition', 'conservation', 'amelioration', 'autre')),
  mode_evaluation_conventionnel TEXT CHECK (mode_evaluation_conventionnel IN ('nominal', 'profit_subsistant')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recompenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creances_entre_epoux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recompenses"
ON public.recompenses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recompenses"
ON public.recompenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recompenses"
ON public.recompenses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recompenses"
ON public.recompenses
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own creances_entre_epoux"
ON public.creances_entre_epoux
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own creances_entre_epoux"
ON public.creances_entre_epoux
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creances_entre_epoux"
ON public.creances_entre_epoux
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creances_entre_epoux"
ON public.creances_entre_epoux
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_recompenses_updated_at
BEFORE UPDATE ON public.recompenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creances_entre_epoux_updated_at
BEFORE UPDATE ON public.creances_entre_epoux
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
