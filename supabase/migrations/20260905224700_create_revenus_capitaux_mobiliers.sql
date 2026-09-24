-- Revenus de capitaux mobiliers (cadre 2 de la 2042, revenus 2025).
-- Codes vérifiés visuellement sur les brochures officielles DGFiP 2042-K (formulaire de base) et
-- 2042-C (complémentaire), IR 2026. Contrairement au cadre 1 (Salaires), ce cadre ne porte AUCUNE
-- colonne déclarant 1/déclarant 2 sur le CERFA : chaque case est un montant unique par foyer.
-- Regroupement en 6 catégories + 1 case hors catégorie, conforme à la déclaration en ligne
-- impots.gouv.fr (validé en session, distinct du regroupement thématique du CERFA papier).
-- Périmètre volontairement exclu de cette table (dette assumée, cf. docs/fiscalite.md) :
-- 2DM (impatriés), et le bloc « précisions CDHR » (2DK/2DL/2XY/2XZ/2XW/2VJ/2VK/2VL/2EF/2EG/2EH/
-- 8KD/8KE/8KF/8KG/8CD), cas limite propre à la contribution différentielle sur les hauts revenus.

CREATE TABLE public.revenus_capitaux_mobiliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 1. Produits des contrats d'assurance-vie et de capitalisation de 8 ans et plus
  case_2dh NUMERIC, -- produits soumis au prélèvement libératoire (versements avant 27.9.2017)
  case_2ch NUMERIC, -- autres produits (versements avant 27.9.2017)
  case_2uu NUMERIC, -- total perçu à répartir (versements à compter du 27.9.2017)
  case_2vv NUMERIC, -- produits imposables à 7,5 % (primes ≤ 150 000 €)
  case_2ww NUMERIC, -- produits imposables à 12,8 % (primes > 150 000 €)

  -- 2. Produits des contrats d'assurance-vie et de capitalisation de moins de 8 ans
  case_2xx NUMERIC, -- produits soumis au prélèvement libératoire (versements avant 27.9.2017)
  case_2yy NUMERIC, -- autres produits (versements avant 27.9.2017)
  case_2zz NUMERIC, -- produits des versements effectués à compter du 27.9.2017

  -- 3. Revenus des valeurs et capitaux mobiliers ouvrant droit à abattement
  case_2dc NUMERIC, -- revenus des actions et parts, abattement 40 % si option barème
  case_2fu NUMERIC, -- dividendes imposables des titres non cotés détenus dans le PEA/PEA-PME

  -- 4. Revenus des valeurs et capitaux mobiliers n'ouvrant pas droit à abattement
  case_2tr NUMERIC, -- intérêts et autres produits de placement à revenu fixe
  case_2tt NUMERIC, -- intérêts des prêts participatifs et minibons
  case_2tq NUMERIC, -- intérêts imposables des obligations remboursables en actions (PEA-PME)
  case_2ts NUMERIC, -- autres revenus distribués et assimilés
  case_2tz NUMERIC, -- produits des plans d'épargne retraite, sortie en capital
  case_2go NUMERIC, -- revenus réputés distribués et revenus de structures hors de France à régime fiscal privilégié
  case_2tu NUMERIC, -- pertes nettes sur prêts participatifs/minibons non imputées, provenant de 2021
  case_2tv NUMERIC, -- idem, provenant de 2022
  case_2tw NUMERIC, -- idem, provenant de 2023
  case_2tx NUMERIC, -- idem, provenant de 2024
  case_2ty NUMERIC, -- idem, provenant de 2025

  -- 5. Autres revenus des valeurs et capitaux mobiliers
  case_2cg NUMERIC, -- revenus déjà soumis aux prélèvements sociaux, sans CSG déductible
  case_2bh NUMERIC, -- idem, avec CSG déductible si option barème
  case_2df NUMERIC, -- autres revenus déjà soumis aux prélèvements sociaux avec CSG déductible
  case_2dg NUMERIC, -- revenus déjà soumis au seul prélèvement de solidarité de 7,5 %
  case_2di NUMERIC, -- revenus soumis au seul prélèvement de solidarité, à soumettre à la CSG/CRDS
  case_2ca NUMERIC, -- frais et charges déductibles si option barème
  case_2ab NUMERIC, -- crédits d'impôt sur valeurs étrangères
  case_2ck NUMERIC, -- prélèvement forfaitaire non libératoire déjà versé
  case_2ee NUMERIC, -- autres revenus soumis à un prélèvement ou une retenue libératoire
  case_2aa NUMERIC, -- déficits des années antérieures non encore déduits, provenant de 2019
  case_2al NUMERIC, -- idem, provenant de 2020
  case_2am NUMERIC, -- idem, provenant de 2021
  case_2an NUMERIC, -- idem, provenant de 2022
  case_2aq NUMERIC, -- idem, provenant de 2023
  case_2ar NUMERIC, -- idem, provenant de 2024

  -- 6. Gains de cession des bons et contrats de capitalisation et d'assurance-vie
  case_2vm NUMERIC, -- gains soumis au prélèvement libératoire (versements avant 27.9.2017)
  case_2vn NUMERIC, -- autres gains (versements avant 27.9.2017)
  case_2vo NUMERIC, -- gains imposables à 7,5 % (versements à compter du 27.9.2017)
  case_2vp NUMERIC, -- gains imposables à 12,8 % (versements à compter du 27.9.2017)
  case_2vq NUMERIC, -- moins-values de cession non imputées à reporter sur 2026, provenant de 2021
  case_2vr NUMERIC, -- idem, provenant de 2022
  case_2vs NUMERIC, -- idem, provenant de 2023
  case_2vt NUMERIC, -- idem, provenant de 2024
  case_2vu NUMERIC, -- idem, provenant de 2025

  -- Hors catégorie : option pour l'imposition au barème (case à cocher, en pied de cadre)
  case_2op BOOLEAN,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.revenus_capitaux_mobiliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenus capitaux mobiliers" ON public.revenus_capitaux_mobiliers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus capitaux mobiliers" ON public.revenus_capitaux_mobiliers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus capitaux mobiliers" ON public.revenus_capitaux_mobiliers
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus capitaux mobiliers" ON public.revenus_capitaux_mobiliers
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_revenus_capitaux_mobiliers_updated_at
  BEFORE UPDATE ON public.revenus_capitaux_mobiliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
