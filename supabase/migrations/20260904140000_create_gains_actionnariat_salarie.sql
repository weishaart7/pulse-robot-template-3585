-- Gains d'actionnariat salarié (Fiscalité, Phase 2.3 : stock-options, actions gratuites,
-- carried-interest). Une ligne par utilisateur, saisie indépendante.
-- Table distincte de revenus_salaires (Phase 2.1/2.2) : ce périmètre mélange volontairement des
-- codes du cadre 1 "Salaires, gains d'actionnariat salarié" et du cadre 3 "Plus-values et gains
-- divers" du CERFA 2042-C (options attribuées avant le 28.9.2012), qui décrivent le même objet
-- réel scindé administrativement par date d'attribution — regrouper sous revenus_salaires aurait
-- dénaturé le nom de cette table avec des codes qui ne sont pas, sur le papier, des "salaires".
-- Codes vérifiés visuellement sur la brochure officielle DGFiP (2042-C, revenus 2023).
--
-- Cases 1TZ/1UZ/1WZ/1VZ (actions gratuites 8.8.2015-30.12.2016, ou post-31.12.2016 <= 300 000 €)
-- et 3VD/3VI/3VF/3VN (options attribuées avant le 28.9.2012) n'ont qu'UNE seule case sur le CERFA,
-- sans colonne déclarant 2 — décision actée en session (2026-09-04), fidèle au formulaire officiel.

CREATE TABLE public.gains_actionnariat_salarie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rabais excédentaire sur options sur titres
  case_1tp NUMERIC,
  case_1up NUMERIC,

  -- Gains de levée d'options / actions gratuites attribuées à compter du 28.9.2012
  case_1tt NUMERIC,
  case_1ut NUMERIC,

  -- Actions gratuites attribuées du 8.8.2015 au 30.12.2016, ou post-31.12.2016 pour leur fraction
  -- n'excédant pas 300 000 € — une seule case chacune, pas de colonne déclarant 2 (cf. CERFA)
  case_1tz NUMERIC,
  case_1uz NUMERIC,
  case_1wz NUMERIC,
  case_1vz NUMERIC,

  -- Gains et distributions de parts ou actions de carried-interest
  case_1nx NUMERIC,
  case_1ox NUMERIC,

  -- Carried-interest soumis à la contribution salariale de 30 %
  case_1ny NUMERIC,
  case_1oy NUMERIC,

  -- Options attribuées avant le 28.9.2012 : gains taxables à 18 %/30 %/41 % — une seule case chacune
  case_3vd NUMERIC,
  case_3vi NUMERIC,
  case_3vf NUMERIC,

  -- Gains imposables sur option dans la catégorie des salaires (options avant le 28.9.2012)
  case_3vj NUMERIC,
  case_3vk NUMERIC,

  -- Options/actions gratuites attribuées à compter du 16.10.2007, contribution salariale de 10 %
  case_3vn NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.gains_actionnariat_salarie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gains actionnariat salarie" ON public.gains_actionnariat_salarie
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gains actionnariat salarie" ON public.gains_actionnariat_salarie
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gains actionnariat salarie" ON public.gains_actionnariat_salarie
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gains actionnariat salarie" ON public.gains_actionnariat_salarie
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_gains_actionnariat_salarie_updated_at
  BEFORE UPDATE ON public.gains_actionnariat_salarie
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
