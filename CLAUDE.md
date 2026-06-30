# CLAUDE.md

## Projet

Logiciel de gestion de patrimoine — outil interne (pas un produit grand public). Manipule des données patrimoniales et fiscales sensibles : montants d'actifs, identités de bénéficiaires, données de succession (DMTG), IFI, etc.

Stack : React + Vite + TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Auth). Backend = Supabase managé (projet `npypkocowjkszxtecxzq`, région eu-west-3), pas de backend custom.

## Règles permanentes

Ces règles s'appliquent à tout le code du projet, pas seulement aux zones en cours de modification.

- **RGPD strict.** Aucune donnée personnelle ou patrimoniale sensible (montants, identités de bénéficiaires, adresses, etc.) ne doit apparaître dans un log exécuté en production.
- **Pas de `console.log` actif en production.** Si un log est utile en développement, l'encadrer systématiquement avec `if (import.meta.env.DEV)`.
- **FK avec `ON DELETE CASCADE` sur toutes les tables métier.** Toute nouvelle table portant un `user_id` doit avoir une FK vers `auth.users(id) ON DELETE CASCADE`. Toute table fille (rattachée à un parent métier comme `assets` ou `societes`) doit avoir une FK vers la table parente, également en `ON DELETE CASCADE`.
- **Pas de credentials hardcodés.** URL et clés Supabase exclusivement via `import.meta.env.VITE_*`. `.env` doit rester listé dans `.gitignore`.
- **Vérification avant migration destructive.** Avant toute modification de contrainte ou suppression de données, vérifier l'absence de lignes orphelines / de violations sur les données existantes en base (pas seulement en théorie sur le schéma).

## Méthode de travail attendue

- Pour toute fonctionnalité impliquant des règles métier non triviales (fiscalité, calculs réglementaires), exposer les règles et la séquence d'intervention fichier par fichier **avant** de coder, et attendre validation explicite.
- Travailler par phases validées une à une : ne pas enchaîner une phase suivante sans résumé de la précédente et accord explicite de l'utilisateur.
- Signaler toute découverte de code mort, d'incohérence ou d'élargissement de périmètre dès qu'elle est constatée, plutôt que de l'absorber silencieusement dans le travail en cours.

## État d'avancement

### Terminé

- **Étape 1** — Correction de la contrainte `CHECK` dupliquée sur `assets.regime_location` (deux migrations contradictoires unifiées) ; suppression des `console.log` sensibles en production (notamment dans `src/lib/dmtg/`, qui loggeait des montants et identités de bénéficiaires) ; nettoyage des credentials Supabase hardcodés dans `src/integrations/supabase/client.ts`.
- **Étape 2** — Audit des 28 tables sans FK vers `auth.users` ; suppression des lignes orphelines détectées (`asset_revenus`) ; ajout des FK manquantes (`user_id → auth.users`, et tables filles → tables parentes) avec `ON DELETE CASCADE`.
- **Étape 3** — Suppression de `src/lib/security/secureStorage.ts` (code mort, jamais importé nulle part).
- **Étape 4 — module IFI, Phase 0** — Migration ajoutant la colonne `abattement_bois_forets` sur `ifi_immeubles_non_batis`.
- **Étape 4 — module IFI, Phase A** — Services et hooks CRUD complets pour `ifi_passifs_deductions` et `ifi_hypotheses` ; branchement de `AjouterPassifForm.tsx` et `HypothesesSection.tsx` sur ces services (auparavant non persistés) ; implémentation de `handleSave` dans `IFIInterface.tsx`.

### À faire

- **Étape 4 — module IFI, Phase B** *(en cours)* — Compléter `AjouterBienForm.tsx` (catégories "immeubles non bâtis", "biens détenus indirectement" et "biens professionnels exonérés" actuellement sans rendu ni soumission) ; créer le module de calcul centralisé `src/lib/ifi/` ; intégrer dans le calcul : passifs déductibles, exclusion des biens professionnels exonérés, abattement bois/forêts (75%), `fraction_taxable`, plafonnement.
- **Étape 4 — module IFI, Phase C** — Suppression de 14 fichiers de code mort IFI : les 6 stubs identifiés (`BaseImposableSection.tsx`, `BaremeSection.tsx`, `PassifsDeductionsSection.tsx`, `IFIHorsFranceSection.tsx`, `ResumeSection.tsx`, `SituationsParticulieresSection.tsx`) + les 8 fichiers `Section`/`Form` orphelins découverts en cours d'analyse (`ImmeublesBatisSection.tsx`, `ImmeublesBatisForm.tsx`, `ImmeublesNonBatisSection.tsx`, `ImmeublesNonBatisForm.tsx`, `BiensDetenusIndirectementSection.tsx`, `BiensDetenusIndirectementForm.tsx`, `BiensProfessionnelsExoneresSection.tsx`, `BiensProfessionnelsExoneresForm.tsx`) ; nettoyage de `const passifs: any[] = []` dans `ListeBiensIFISection.tsx`.
- **Étape 4 — module IFI, Phase D** — Module "Biens hors de France" : service, hook, intégration sidebar/UI, intégration au calcul.
- **Étape 4 — module Transmission** — Pas commencé. Même méthode que l'IFI : diagnostic du code existant + exposition des règles fiscales à valider avant tout codage.
- **Étapes 5 et 6** — Non définies à ce stade.

## Décisions d'architecture (module IFI)

- **Calcul centralisé.** La logique de calcul IFI vit dans `src/lib/ifi/` (types + fonctions pures), sur le modèle de `src/lib/dmtg/` déjà existant dans le projet. `BaremeIFISection.tsx` et `ListeBiensIFISection.tsx` doivent tous deux consommer ce module plutôt que dupliquer la logique (c'était le cas avant : l'abattement résidence principale était codé en dur à deux endroits différents).
- **`fraction_taxable` en pourcentage.** Ce champ est saisi et stocké comme un pourcentage 0–100 (cohérent avec l'UI existante). Le calcul applique `valeur × (fraction_taxable / 100)`, pas `valeur × fraction_taxable` au sens littéral.
- **Plafonnement sans nouvelle colonne.** Les deux valeurs du plafonnement (revenus N-1 du foyer, IR + prélèvements sociaux N) sont stockées comme deux lignes supplémentaires dans la table générique clé/valeur `ifi_hypotheses` (`type_hypothese = 'plafonnement_revenus_n1'` / `'plafonnement_ir_ps_n'`), pas comme colonnes dédiées.
- **Exonération biens professionnels binaire.** Le champ existant dans `ifi_biens_professionnels_exoneres` suffit ; pas de vérification automatique des conditions légales (seuils de détention, fonction de direction, etc.) — ces biens sont simplement exclus de l'assiette taxable si le champ est coché.
- **Abattement bois/forêts par bien, pas par catégorie.** Case à cocher dédiée (`abattement_bois_forets` sur `ifi_immeubles_non_batis`), appliquée uniquement si cochée — pas de règle automatique liée à la sélection de la catégorie "Bois, forêt ou parts de GF".
- **Biens hors de France (Phase D, à venir).** Imposés comme des biens français pour un résident fiscal français, dans la même assiette et le même barème, sans crédit d'impôt étranger dans un premier temps (fonctionnalité prévue plus tard).
