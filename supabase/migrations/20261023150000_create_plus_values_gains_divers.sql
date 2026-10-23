-- Plus-values et gains divers (cadre 3 de la 2042-C, revenus 2025) — phase 3.1.
-- Comme le cadre 2, aucune colonne déclarant 1/déclarant 2 : un montant par foyer.
-- Périmètre volontairement exclu (dette assumée, cf. docs/fiscalite.md) : exit tax (3WM…3YA),
-- BSPCE (3SJ…3PE), plus-values en report 150-0 B ter (3WH…3WT), impatriés (3VQ/3VR),
-- capital-risque (3VC), non-résidents (3SE), PEAC (3EX). Les gains d'actionnariat
-- 3VD/3VI/3VF/3VJ/3VK/3VN restent dans gains_actionnariat_salarie.

CREATE TABLE public.plus_values_gains_divers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Gains de cession de valeurs mobilières et assimilés
  case_3vg NUMERIC, -- plus-value avant abattement
  case_3sg NUMERIC, -- abattement pour durée de détention de droit commun
  case_3vh NUMERIC, -- moins-value 2025
  case_3ua NUMERIC, -- plus-value avant abattement renforcé / départ à la retraite
  case_3sl NUMERIC, -- abattement pour durée de détention renforcé
  case_3va NUMERIC, -- abattement fixe départ à la retraite d'un dirigeant de PME
  case_3vt NUMERIC, -- gain sur retrait ou rachat du PEA / PEA-PME avant 5 ans
  case_3pi NUMERIC, -- profits sur instruments financiers taxables à 50 %
  case_3sb NUMERIC, -- plus-values 150-0 D bis dont le report a expiré en 2025, imposables
  case_3we NUMERIC, -- complément de prix perçu en 2025

  -- Actifs numériques (report de la 2086)
  case_3an NUMERIC, -- plus-value
  case_3bn NUMERIC, -- moins-value
  case_3cn BOOLEAN, -- option pour l'imposition au barème

  -- Plus-values immobilières (revenu fiscal de référence)
  case_3vz NUMERIC, -- plus-values nettes de cession d'immeubles déjà imposées à 19 %
  case_3vw NUMERIC, -- plus-value exonérée, première cession d'un logement autre que la RP, sous condition de remploi

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.plus_values_gains_divers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plus values gains divers" ON public.plus_values_gains_divers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plus values gains divers" ON public.plus_values_gains_divers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plus values gains divers" ON public.plus_values_gains_divers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plus values gains divers" ON public.plus_values_gains_divers
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_plus_values_gains_divers_updated_at
  BEFORE UPDATE ON public.plus_values_gains_divers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
