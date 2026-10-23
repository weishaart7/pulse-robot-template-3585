-- Charges déductibles du revenu global (cadre 6 de la 2042 et de la 2042-C, revenus 2025) — phase 6.1.
-- Colonne personne à charge (6NU, 6RU, 6PU, 6OU, 6QU) hors périmètre, comme au cadre 5.
CREATE TABLE public.charges_deductibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  case_6de NUMERIC, -- CSG déductible calculée sur les revenus du patrimoine
  case_6el NUMERIC, -- pension alimentaire versée à un enfant majeur (1er enfant)
  case_6em NUMERIC, -- pension alimentaire versée à un enfant majeur (2e enfant)
  case_6gu NUMERIC, -- autres pensions alimentaires (enfants mineurs, ascendants…)
  case_6gi NUMERIC, -- décision de justice définitive avant 2006 : enfant majeur (1er enfant)
  case_6gj NUMERIC, -- décision de justice définitive avant 2006 : enfant majeur (2e enfant)
  case_6gp NUMERIC, -- décision de justice définitive avant 2006 : autres personnes

  case_6ns NUMERIC, -- cotisations PER déductibles du revenu global, déclarant 1
  case_6nt NUMERIC, -- cotisations PER déductibles du revenu global, déclarant 2
  case_6rs NUMERIC, -- cotisations PERP, Préfon, Corem, CGOS, déclarant 1
  case_6rt NUMERIC, -- cotisations PERP, Préfon, Corem, CGOS, déclarant 2
  case_6ps NUMERIC, -- plafond de déduction (avis d'impôt), déclarant 1
  case_6pt NUMERIC, -- plafond de déduction (avis d'impôt), déclarant 2
  case_6qr BOOLEAN, -- vous souhaitez bénéficier du plafond de votre conjoint
  case_6qw BOOLEAN, -- vous êtes nouvellement domicilié en France en 2025
  case_6os NUMERIC, -- cotisations PER déduites des BIC, BNC, BA, art. 62, déclarant 1
  case_6ot NUMERIC, -- cotisations PER déduites des BIC, BNC, BA, art. 62, déclarant 2
  case_6qs NUMERIC, -- autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires, déclarant 1
  case_6qt NUMERIC, -- autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires, déclarant 2

  case_6dg NUMERIC, -- charges foncières des monuments historiques (art. 156 II CGI)
  case_6dd NUMERIC, -- autres déductions (art. 156 II et 156 bis CGI)
  case_6ev INTEGER, -- nombre de personnes de plus de 75 ans accueillies sous votre toit
  case_6eu NUMERIC, -- frais d'accueil de ces personnes
  case_6hp NUMERIC, -- grosses réparations des nus-propriétaires : report 2015
  case_6hq NUMERIC, -- grosses réparations des nus-propriétaires : report 2016
  case_6hr NUMERIC, -- grosses réparations des nus-propriétaires : report 2017
  case_6gh NUMERIC, -- sommes à ajouter au revenu imposable
  case_6fa NUMERIC, -- déficit global 2019 non encore déduit
  case_6fb NUMERIC, -- déficit global 2020 non encore déduit
  case_6fc NUMERIC, -- déficit global 2021 non encore déduit
  case_6fd NUMERIC, -- déficit global 2022 non encore déduit
  case_6fe NUMERIC, -- déficit global 2023 non encore déduit
  case_6fl NUMERIC, -- déficit global 2024 non encore déduit

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.charges_deductibles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own charges deductibles" ON public.charges_deductibles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charges deductibles" ON public.charges_deductibles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charges deductibles" ON public.charges_deductibles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charges deductibles" ON public.charges_deductibles
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_charges_deductibles_updated_at
  BEFORE UPDATE ON public.charges_deductibles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
