-- Revenus salaires (Fiscalité, Phase 2.1 : traitements et salaires, déclaration 2042).
-- Une ligne par utilisateur, saisie indépendante (pas de lien Famille/Patrimoine/Sociétés).
-- Colonnes C/D (revenus propres des personnes à charge), frais réels (1AK/1BK), cas
-- spécifiques restants (impatriés, indemnités préjudice moral, CET) et gains d'actionnariat
-- salarié sont hors périmètre de cette sous-phase (voir docs/fiscalite.md).

CREATE TABLE public.revenus_salaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Traitements et salaires
  case_1aj NUMERIC,
  case_1bj NUMERIC,

  -- Revenus des salariés des particuliers employeurs
  case_1aa NUMERIC,
  case_1ba NUMERIC,

  -- Abattement forfaitaire (assistants maternels/familiaux, journalistes)
  case_1ga NUMERIC,
  case_1ha NUMERIC,

  -- Heures supplémentaires et jours RTT exonérés
  case_1gh NUMERIC,
  case_1hh NUMERIC,

  -- Pourboires exonérés
  case_1pb NUMERIC,
  case_1pc NUMERIC,

  -- Primes de partage de la valeur exonérées
  case_1ad NUMERIC,
  case_1bd NUMERIC,

  -- Majoration du seuil d'exonération (case à cocher)
  case_1av BOOLEAN NOT NULL DEFAULT false,
  case_1bv BOOLEAN NOT NULL DEFAULT false,

  -- Revenus des associés et gérants (art. 62 CGI)
  case_1gb NUMERIC,
  case_1hb NUMERIC,

  -- Ne perçoit plus de salaires 1GB/1GF/1GG/1AG (case à cocher)
  case_1gk BOOLEAN NOT NULL DEFAULT false,
  case_1gl BOOLEAN NOT NULL DEFAULT false,

  -- Droits d'auteur, fonctionnaires chercheurs
  case_1gf NUMERIC,
  case_1hf NUMERIC,

  -- Agents généraux d'assurance, option pour le régime fiscal des salariés (salaires imposables)
  case_1gg NUMERIC,
  case_1hg NUMERIC,

  -- Autres revenus imposables (chômage, préretraite)
  case_1ap NUMERIC,
  case_1bp NUMERIC,

  -- Salaires perçus par les non-résidents et salaires de source étrangère
  -- avec crédit d'impôt égal à l'impôt français
  case_1af NUMERIC,
  case_1bf NUMERIC,

  -- Autres salaires imposables de source étrangère
  case_1ag NUMERIC,
  case_1bg NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.revenus_salaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own revenus salaires" ON public.revenus_salaires
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own revenus salaires" ON public.revenus_salaires
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenus salaires" ON public.revenus_salaires
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own revenus salaires" ON public.revenus_salaires
FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_revenus_salaires_updated_at
  BEFORE UPDATE ON public.revenus_salaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
