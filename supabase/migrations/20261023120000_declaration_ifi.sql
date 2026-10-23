-- Déclaration 2042-IFI (patrimoine immobilier au 1er janvier), une par foyer et par année
-- d'imposition. Calcul : src/lib/fiscalite/calculerDeclarationIFI.ts. Les actifs et dettes sont
-- préremplis depuis Patrimoine / Passifs au moment de l'affichage (preremplissageIFI.ts) et seules
-- les surcharges sont persistées. Convention : colonne à NULL = valeur préremplie ; une valeur =
-- surcharge. Remplace à terme les tables ifi_* du simulateur historique (vides en base au 2026-10-23).

CREATE TABLE public.declarations_ifi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annee INTEGER NOT NULL CHECK (annee >= 2018),                                   -- IFI au 1.1.annee
  deduire_ifi_theorique BOOLEAN NOT NULL DEFAULT true,                            -- 9GH
  biens_professionnels_exoneres BOOLEAN NOT NULL DEFAULT false,                   -- 9BZ (annexe 1 déposée)
  dons_france NUMERIC CHECK (dons_france >= 0),                                   -- 9NC
  dons_ue NUMERIC CHECK (dons_ue >= 0),                                           -- 9NG
  impots_revenus_n1 NUMERIC CHECK (impots_revenus_n1 >= 0),                       -- 9PR (NULL = repris de la 2042)
  revenus_n1 NUMERIC CHECK (revenus_n1 >= 0),                                     -- 9PX (NULL = repris de la 2042)
  revenus_hors_2042 NUMERIC CHECK (revenus_hors_2042 >= 0),                       -- 9PX : revenus exonérés, étrangers…
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, annee)
);

-- Annexes 2 et 3 : un bien détenu directement ou une part de société par ligne.
CREATE TABLE public.declaration_ifi_actifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID NOT NULL REFERENCES public.declarations_ifi(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  denomination TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  -- Case du Cerfa ; 'indirect' = 9CA.
  categorie TEXT CHECK (categorie IN ('residencePrincipale', 'autreBati', 'boisForets',
    'biensRurauxBailLongTerme', 'partsGfaGaf', 'autreNonBati', 'indirect')),
  valeur NUMERIC CHECK (valeur >= 0),                                             -- part du foyer, avant abattement
  fraction_taxable NUMERIC CHECK (fraction_taxable BETWEEN 0 AND 100),
  exclu BOOLEAN NOT NULL DEFAULT false,                                           -- actif prérempli écarté
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (declaration_id, asset_id)
);

-- Annexe 4 : une dette par ligne.
CREATE TABLE public.declaration_ifi_dettes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID NOT NULL REFERENCES public.declarations_ifi(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emprunt_id UUID REFERENCES public.emprunts(id) ON DELETE CASCADE,
  denomination TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  ligne TEXT CHECK (ligne IN ('9GF', '9GH')),
  montant NUMERIC CHECK (montant >= 0),                                           -- restant dû au 1.1, part du foyer
  -- Catégorie du bien financé (prorata des biens partiellement exonérés).
  categorie_bien TEXT CHECK (categorie_bien IN ('residencePrincipale', 'autreBati', 'boisForets',
    'biensRurauxBailLongTerme', 'partsGfaGaf', 'autreNonBati', 'indirect')),
  exclue BOOLEAN NOT NULL DEFAULT false,                                          -- dette préremplie écartée
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (declaration_id, emprunt_id)
);

CREATE INDEX idx_declaration_ifi_actifs_declaration ON public.declaration_ifi_actifs(declaration_id);
CREATE INDEX idx_declaration_ifi_actifs_asset ON public.declaration_ifi_actifs(asset_id);
CREATE INDEX idx_declaration_ifi_actifs_user ON public.declaration_ifi_actifs(user_id);
CREATE INDEX idx_declaration_ifi_dettes_declaration ON public.declaration_ifi_dettes(declaration_id);
CREATE INDEX idx_declaration_ifi_dettes_emprunt ON public.declaration_ifi_dettes(emprunt_id);
CREATE INDEX idx_declaration_ifi_dettes_user ON public.declaration_ifi_dettes(user_id);

ALTER TABLE public.declarations_ifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaration_ifi_actifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.declaration_ifi_dettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own declarations IFI" ON public.declarations_ifi
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users manage their own declaration IFI actifs" ON public.declaration_ifi_actifs
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users manage their own declaration IFI dettes" ON public.declaration_ifi_dettes
  FOR ALL USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE TRIGGER update_declarations_ifi_updated_at
  BEFORE UPDATE ON public.declarations_ifi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_declaration_ifi_actifs_updated_at
  BEFORE UPDATE ON public.declaration_ifi_actifs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_declaration_ifi_dettes_updated_at
  BEFORE UPDATE ON public.declaration_ifi_dettes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
