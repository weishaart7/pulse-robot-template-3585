-- Étend le modèle de qualification propre/commun (déjà sur `assets`, cf.
-- migration 20260417104130) aux passifs et emprunts, pour fusionner les deux
-- implémentations divergentes de "part revenant à l'utilisateur"
-- (lib/patrimoine/succession.ts::getPartSuccessorale vs la logique dupliquée
-- basée sur `detenteur` seul dans usePatrimoineCalculations.ts) sur une
-- source unique. Décision actée le 2026-07-18.

ALTER TABLE public.passifs
  ADD COLUMN IF NOT EXISTS qualification_bien text,
  ADD COLUMN IF NOT EXISTS qualification_auto boolean DEFAULT true;

ALTER TABLE public.emprunts
  ADD COLUMN IF NOT EXISTS qualification_bien text,
  ADD COLUMN IF NOT EXISTS qualification_auto boolean DEFAULT true;

-- Backfill des lignes existantes à partir de `detenteur` (déjà renseigné) :
-- ne devine jamais un cas ambigu, seuls les cas univoques sont déduits. Un
-- détenteur `user`/`spouse` implique nécessairement "Bien propre" (100/0,
-- pas de tiers possible sur une dette personnelle) ; `common` implique "Bien
-- commun" (50/50, régime légal). Tout le reste (NULL, valeur inattendue)
-- reste `NULL` → qualification_auto reste true mais qualifierBien() n'a pas
-- encore été exécuté dessus : ces lignes seront bloquées par le garde-fou
-- "à qualifier" tant qu'un écran ne les aura pas fait passer par
-- qualifierBien() ou qu'elles n'auront pas été qualifiées manuellement (cf.
-- getPartSuccessorale, lib/patrimoine/succession.ts — jamais de traitement
-- par défaut deviné).
UPDATE public.passifs
SET qualification_bien = CASE
  WHEN lower(detenteur) IN ('user', 'spouse') THEN 'Bien propre'
  WHEN lower(detenteur) IN ('common', 'commun', 'couple', 'le couple') THEN 'Bien commun'
  ELSE NULL
END
WHERE qualification_bien IS NULL;

UPDATE public.emprunts
SET qualification_bien = CASE
  WHEN lower(detenteur) IN ('user', 'spouse') THEN 'Bien propre'
  WHEN lower(detenteur) IN ('common', 'commun', 'couple', 'le couple') THEN 'Bien commun'
  ELSE NULL
END
WHERE qualification_bien IS NULL;
