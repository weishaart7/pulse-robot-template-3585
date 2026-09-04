# Module Fiscalité

> Audit de fond produit le 2026-08-27, **de zéro** (aucun audit préexistant pour ce module — même
> situation que `docs/immobilier.md` et `docs/societes.md`). Méthode : lecture intégrale des 20
> fichiers du périmètre déclaré (pages, composants `ifi/`, moteurs `lib/ifi/` et `lib/fiscal/`), plus
> les fichiers liés découverts en cours de route (`src/hooks/useIFI.ts`, `src/services/ifiService.ts`,
> `src/types/ifi.ts`, `src/hooks/useFamilyData.ts`, `src/hooks/useSocietesIntegration.ts`), lecture du
> schéma réel en base via le MCP Supabase (`execute_sql` sur les colonnes/FK/policies/RLS des 7 tables
> `ifi_*` du projet `npypkocowjkszxtecxzq`, `get_advisors` sécurité), et `git log --oneline` sur les
> fichiers du périmètre. Toute valeur citée comme « en base » a été vérifiée par requête directe le
> 2026-08-27 (données réelles : 1 immeuble bâti, 1 immeuble non bâti, 2 passifs, 0 hypothèse
> enregistrée, 0 bien indirect, 0 bien professionnel exonéré, 0 ligne `ifi_hors_france`). Ce document
> corrige au passage une inexactitude de `docs/patrimoine.md` §6.4 (voir §2) : l'IFI de ce module ne
> lit ni `societes.pourcentage_ifi` ni `valeur_ifi` — c'est un calcul totalement distinct de celui déjà
> documenté dans `docs/societes.md` (`useSocietesIFI`).

## 1. Vue d'ensemble

L'onglet « Fiscalité » héberge **trois blocs largement indépendants, qui ne communiquent pas entre
eux**, malgré une UI qui les présente les uns au-dessus/à côté des autres :

1. **La déclaration 2042, regroupée derrière le bouton « 2042 - Déclaration générale »** : ouvre
   `Declaration2042Interface.tsx` (overlay plein écran + sidebar de sections, calqué sur le pattern
   `IFIInterface`/`IFISidebar` déjà en place pour l'IFI — voir §2). Contient aujourd'hui trois sections :
   - **Ménage — état civil et nombre de parts (Phase 1, fonctionnel)** : `MenageSection.tsx`
     (wrapper de `MenageForm.tsx` + `SyntheseFoyerFiscal.tsx`), adossé à la table Supabase
     `foyer_fiscal` et au moteur pur `src/lib/fiscalite/calculerPartsFiscales.ts`. Seul morceau du
     module qui calcule et persiste une donnée réelle, propre à l'utilisateur.
   - **Traitements et salaires — cadre 1 de la 2042, déclarants 1/2 (Phases 2.1 et 2.2, fonctionnel)** :
     `RevenusSalairesForm.tsx`, adossé à la table Supabase `revenus_salaires`. Capture de données
     brute (pas de moteur de calcul dans cette sous-phase) ; codes de case vérifiés contre la
     brochure officielle DGFiP (2042-K/2042-C, revenus 2024). Inclut les frais réels (`1AK`/`1BK`,
     Phase 2.2), qui remplacent l'abattement forfaitaire de 10 % sur `1AJ`/`1BJ` — remplacement non
     appliqué automatiquement, saisie manuelle indépendante des deux champs (aucun calcul en Phase 2).
   - **Gains d'actionnariat salarié — stock-options, actions gratuites, carried-interest (Phase 2.3,
     fonctionnel)** : `GainsActionnariatSalarieForm.tsx`, adossé à la table Supabase
     `gains_actionnariat_salarie`, **distincte** de `revenus_salaires` (voir §2). Mélange volontaire
     de codes du cadre 1 « Salaires, gains d'actionnariat salarié » et du cadre 3 « Plus-values et
     gains divers » du CERFA 2042-C (options attribuées avant le 28.9.2012) — même objet réel, scindé
     administrativement par date d'attribution sur le formulaire papier.

   Avant cette réorganisation, `MenageForm`/`SyntheseFoyerFiscal`/`RevenusSalairesForm` étaient montés
   à plat dans `FiscaliteSection.tsx`, en dehors de tout bouton « 2042 » (qui n'avait alors aucun
   `onClick`) — la section Fiscalité ne compte plus désormais qu'un seul point d'entrée vers ces
   formulaires.
2. **Un tableau de bord IR entièrement statique** (`FiscaliteSection.tsx` → `FiscalDeclarationsCard`,
   `FiscalOverviewCard`, `TaxRateCard`) : liste de déclarations fiscales (2042, 2044, 2047, 2074,
   2086, 2042-IFI), graphique de répartition IR/PS/IFI, taux marginal d'imposition, tranches. **Aucune
   donnée réelle n'y est affichée** — voir §2. Le nombre de parts calculé au point 1 et les salaires
   saisis au point 2 n'alimentent pas ce tableau de bord (aucun barème IR n'existe encore dans le
   repo pour les utiliser, voir §4).
3. **Un simulateur IFI complet, avec sa propre saisie** (`IFIInterface.tsx`, ouvert depuis le bouton
   « 2042-IFI » de `FiscalDeclarationsCard`), organisé en 5 sections dans une sidebar
   (`IFISidebar.tsx`) : Hypothèses, Liste des biens à l'IFI, Barème de l'IFI, Réduction &
   Plafonnement, Montant redevable. Ce simulateur a ses propres tables Supabase, indépendantes de
   `assets`/`societes` (Patrimoine/Sociétés/Immobilier) — voir §2.

**Écrans** :

| Écran | Composant | Rôle |
|---|---|---|
| Fiscalité (page principale) | [FiscaliteSection.tsx](src/pages/fiscalite/FiscaliteSection.tsx) | Grille 3 colonnes : déclarations (gauche), imposition totale + TMI (droite) — plus aucun formulaire monté à plat |
| Déclarations fiscales | [FiscalDeclarationsCard.tsx](src/pages/fiscalite/components/FiscalDeclarationsCard.tsx) | Liste de formulaires CERFA ; « 2042 » ouvre `Declaration2042Interface`, « 2042-IFI » ouvre `IFIInterface` — les deux seuls liens cliquables |
| Déclaration 2042 (overlay) | [Declaration2042Interface.tsx](src/pages/fiscalite/components/Declaration2042Interface.tsx) → [Declaration2042Sidebar.tsx](src/pages/fiscalite/components/2042/Declaration2042Sidebar.tsx) | Overlay plein écran + sidebar de sections pilotée par [declaration2042Sections.ts](src/pages/fiscalite/components/2042/declaration2042Sections.ts) (config `{id, label, icon, component}` — ajouter une sous-phase future = une entrée) ; pas de bouton « Enregistrer » global, chaque section garde sa propre sauvegarde |
| Ménage (section 2042) | [MenageSection.tsx](src/pages/fiscalite/components/2042/MenageSection.tsx) → `MenageForm.tsx` + `SyntheseFoyerFiscal.tsx` | Situation familiale, enfants à charge (liste dynamique), personnes invalides à charge (liste dynamique), enfants majeurs rattachés, cases à cocher (parent isolé, invalidité, ancien combattant, veuve de guerre...), synthèse du nombre de parts recalculée en direct pendant la saisie (avant même l'enregistrement) |
| Traitements et salaires (section 2042) | [RevenusSalairesForm.tsx](src/components/fiscalite/RevenusSalairesForm.tsx) | 15 paires de champs déclarant 1/déclarant 2 (cadre 1 de la 2042, hors colonnes C/D et gains d'actionnariat), code officiel + libellé français côte à côte |
| Gains d'actionnariat salarié (section 2042) | [GainsActionnariatSalarieForm.tsx](src/components/fiscalite/GainsActionnariatSalarieForm.tsx) | 13 lignes du CERFA (stock-options, actions gratuites, carried-interest, options pré-28.9.2012), regroupées par sous-bloc visuel ; champs à case unique sans colonne déclarant 2 pour `1TZ`/`1UZ`/`1WZ`/`1VZ` et `3VD`/`3VI`/`3VF`/`3VN`, conformément au CERFA |
| Imposition totale | [FiscalOverviewCard.tsx](src/pages/fiscalite/components/FiscalOverviewCard.tsx) | Donut IR/PS/IFI + détail revenus — **données 100 % codées en dur** |
| Taux marginal | [TaxRateCard.tsx](src/pages/fiscalite/components/TaxRateCard.tsx) | Barème IR, tranche active, marge avant tranche suivante — **données 100 % codées en dur** |
| Simulateur IFI | [IFIInterface.tsx](src/pages/fiscalite/components/IFIInterface.tsx) → 5 sous-écrans `ifi/*.tsx` | Wizard de déclaration IFI : hypothèses, biens/passifs, barème, montant dû |

**Tables Supabase du simulateur IFI** (toutes `user_id → auth.users(id) ON DELETE CASCADE`, RLS
`auth.uid() = user_id` par opération, vérifiées en base) : `ifi_immeubles_batis`,
`ifi_immeubles_non_batis`, `ifi_biens_detenus_indirectement`, `ifi_biens_professionnels_exoneres`,
`ifi_passifs_deductions`, `ifi_hypotheses` (table générique clé/valeur), `ifi_hors_france` (schéma
existant, **jamais consommé par aucun code** — ni service ni hook, cf. §3). Aucune de ces 7 tables ne
porte de FK vers `assets` ou `societes` : la saisie est **intégralement indépendante** de Patrimoine,
Immobilier et Sociétés.

**Table/moteur du foyer fiscal (Phase 1, quotient familial)** : `foyer_fiscal` (`user_id →
auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)` — une ligne par utilisateur, comme
`marital_status` ; RLS 4 policies), indépendante de `family_profiles`/`marital_status`/`family_links`
(saisie manuelle, aucune FK vers Famille — décision explicite de cette phase, à rapprocher
éventuellement d'une phase ultérieure). Le calcul du nombre de parts est fait par
[src/lib/fiscalite/calculerPartsFiscales.ts](src/lib/fiscalite/calculerPartsFiscales.ts), fonction pure
couvrant l'art. 193-197 CGI (revenus 2025/impôt 2026) — voir §2. `src/lib/fiscal/calcul.ts` (dossier
**sans** « ite ») ne contient plus que `compterEnfantsFiscalementACharge`, toujours utilisée par le
module **Famille** (`useFamilyData.ts`, pour synchroniser `marital_status.nombre_enfants_charges`) —
les deux dossiers `lib/fiscal/` et `lib/fiscalite/` sont volontairement distincts (cf. §2).

**Tables/moteur pour l'IR** (calcul de l'impôt lui-même, distinct du nombre de parts) : aucune table ni
fonction n'existe — voir §4.

**Flux clés** :
- L'utilisateur clique « 2042-IFI » → `IFIInterface` s'ouvre en plein écran, saisit ses biens/passifs
  un par un via `AjouterBienForm`/`AjouterPassifForm`, coche des hypothèses (abattement RP, plafonnement
  actif, revenus N-1), puis navigue vers « Barème de l'IFI » où `computeIFI()` (`lib/ifi/calcul.ts`)
  calcule en temps réel l'assiette, les tranches, la décote, le plafonnement et le montant final.
- Rien de tout cela n'alimente le reste de l'écran Fiscalité : `FiscalOverviewCard`/`TaxRateCard`
  affichent des valeurs fixes (« IFI : 0 € », revenu imposable 54 000 €, etc.) qui ne bougent jamais,
  quel que soit ce que l'utilisateur a saisi dans le simulateur IFI juste à côté.

## 2. Architecture & décisions

- **Navigation de la déclaration 2042 : pattern overlay + sidebar réutilisé de l'IFI, pas réinventé.**
  `Declaration2042Interface.tsx` reprend à l'identique la mécanique de `IFIInterface.tsx` (overlay
  `fixed inset-0` plein écran, sidebar de navigation par section) plutôt que d'introduire un nouveau
  mécanisme d'affichage (accordéon, route dédiée, modal) à côté de celui déjà en place. Seule
  divergence assumée : pas de bouton « Enregistrer » global avec `flush()` séquentiel comme sur l'IFI
  — chaque section (`MenageSection`, `RevenusSalairesForm`) garde son propre bouton et son propre hook
  de sauvegarde, pour ne pas toucher à leur logique interne dans une session de pure navigation, et
  parce que chaque formulaire a un rythme de saisie/sauvegarde indépendant de l'autre. La liste des
  sections vit dans un fichier de config unique,
  [declaration2042Sections.ts](src/pages/fiscalite/components/2042/declaration2042Sections.ts)
  (tableau `{id, label, icon, component}`), lu à la fois par `Declaration2042Interface` (rendu de la
  section active, une seule montée à la fois — pas d'appel réseau simultané des deux formulaires) et
  par `Declaration2042Sidebar` (liste des boutons de navigation) : ajouter une future sous-phase (2.2
  frais réels, 2.3 gains d'actionnariat, 2.4 cas spécifiques, ou un futur cadre 2042 hors « Salaires »)
  se limite à une entrée supplémentaire dans ce tableau, sans toucher aux deux composants qui le
  consomment. `MenageForm`/`SyntheseFoyerFiscal` sont regroupés dans un wrapper `MenageSection.tsx`
  (état `foyerDraft` local) pour préserver à l'identique leur couplage préexistant (recalcul du nombre
  de parts en direct pendant la saisie, avant l'enregistrement) — ce composant n'était pas nommé
  explicitement dans le brief de session, qui ne mentionnait que les deux « formulaires », mais son
  déplacement solidaire du `MenageForm` était nécessaire pour ne pas casser ce comportement existant.
- **`src/lib/ifi/calcul.ts` mérite sa réputation de code de référence — c'est le seul point du
  périmètre audité qui la mérite pleinement.** Fonctions pures, sans effet de bord, chacune
  documentée par un commentaire citant l'article du CGI visé
  ([calcul.ts](src/lib/ifi/calcul.ts)) : `valeurDeclareeBienDirect` (abattement résidence principale
  30 %, abattement bois/forêts 75 %, fraction taxable des biens mixtes), `calculerAssietteTaxable`,
  `getDetailedCalculation`/`calculerIFITheorique` (barème à 6 tranches, taux et seuils **conformes**
  au barème IFI en vigueur : 0 % jusqu'à 800 k€, 0,5 % / 0,7 % / 1 % / 1,25 % / 1,5 % au-delà, seuils
  800 k€/1,3 M€/2,57 M€/5 M€/10 M€ — vérifié exact), `calculerDecote` (formule 17 500 € − 1,25 % ×
  assiette entre 1,3 M€ et 1,4 M€ — conforme à l'art. 977 CGI), `calculerPlafonnement` (art. 979 CGI,
  seuil 75 % des revenus N-1, réduction plafonnée à l'IFI lui-même — conforme). Le code est même plus
  rigoureux que les moteurs équivalents des autres modules : contrairement à `lib/societes/`
  (formules IS/IFI dupliquées, cf. `docs/societes.md`), il n'existe ici **qu'un seul point de calcul**
  (`computeIFI`), appelé à l'identique par `ListeBiensIFISection` et `BaremeIFISection`.
- **Mais ce moteur bien conçu encadre une saisie qui, elle, ignore une partie de ses propres champs**
  (cf. §3, 🔴 indivision et biens indirects) — la qualité du calcul central ne suffit pas à garantir un
  résultat juste si les données qui l'alimentent sont mal transformées en amont.
- **`src/lib/fiscalite/calculerPartsFiscales.ts` — moteur du quotient familial (Phase 1), désormais
  réellement branché à `MenageForm.tsx`/`SyntheseFoyerFiscal.tsx`.** Fonction pure couvrant l'art.
  193-197 CGI (revenus 2025/impôt 2026) : parts de base (dont veuf avec enfant(s) à charge = 2 parts,
  identique à un couple — corrigé par rapport à l'ancienne implémentation, voir ci-dessous), enfants à
  charge et enfants majeurs rattachés dans une seule séquence de rang (progression 0,5 pour les 1er/2e,
  1 part entière à partir du 3e), résidence alternée (moitié des droits, y compris pour la majoration
  invalidité elle-même — confirmé BOFiP BOI-IR-LIQ-10-20-20-20), personne invalide à charge hors enfant
  (+1 part entière, distincte de la majoration invalidité du foyer), parent isolé (case T, +1 part),
  ancien parent isolé (case L, +0,5), invalidité et ancien combattant déclarant 1/2 (deux lignes
  toujours distinctes, jamais fusionnées même si identiques), veuf d'ancien combattant (art. 195-1-f,
  plafond **sans** complément) et veuve de guerre (art. 195-1-c, disposition **distincte** du veuf
  d'ancien combattant, plafond **avec** complément — à ne pas confondre). Chaque majoration est une
  ligne séparée de `PartsFiscalesResult.majorations[]`, dans l'ordre du formulaire, portant ses
  plafonds en € en simple métadonnée (`plafondUnitaire`/`plafondComplementaire`) — **jamais appliquée**
  par cette fonction : le plafonnement réel de l'avantage fiscal (art. 197 CGI) suppose un barème IR
  qui n'existe pas encore dans le repo (voir §4, Phase différée). 29 tests couvrent l'intégralité du
  tableau de règles, y compris les combinaisons (enfant en résidence alternée et invalide simultanément,
  etc.).
- **`revenus_salaires` (Phases 2.1 et 2.2) — capture brute du cadre 1 de la 2042, sans moteur de
  calcul.** Table `user_id → auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies,
  même pattern que `foyer_fiscal`. 30 colonnes `case_1xx`/`case_1yy` (convention `1AJ` → `case_1aj`,
  préfixe imposé par SQL pour un identifiant commençant par un chiffre), dont 4 booléennes (cases à
  cocher `1AV`/`1BV`, `1GK`/`1GL`). `case_1ak`/`case_1bk` (frais réels) ajoutées par migration
  séparée en Phase 2.2, à la suite de `1AG`/`1BG` dans le formulaire — ordre du CERFA (dernière ligne
  du bloc « Traitements, salaires » avant « Pensions, retraites, rentes »). Périmètre validé en
  session : les codes ont été vérifiés contre la
  brochure officielle DGFiP (« LA 2042 K/2042 C ET SES RÉFÉRENCES DANS LA BROCHURE », revenus 2024)
  plutôt que supposés — cette vérification a corrigé deux points du brief initial avant migration :
  1) `1GG`/`1HG` (agents généraux d'assurance, salaires imposables) a été ajoutée au périmètre 2.1 sur
  demande explicite, alors qu'initialement classée en sous-phase 2.4 différée ; 2) le découpage
  initial en quatre paires `1AF1`/`1AG1`/`1AF2`/`1BG2` pour les salaires de source étrangère ne
  correspondait à aucune case réelle du CERFA — la brochure ne montre que deux cases (`1AF`/`1BF` et
  `1AG`/`1BG`), utilisées à la place. `RevenusSalairesForm.tsx` affiche le libellé officiel comme
  texte principal (décision explicite de Titouan de ne pas le remplacer), avec des compléments entre
  parenthèses quand ils reprennent une mention déjà présente sur le CERFA (ex. « Autres revenus
  imposables (chômage, préretraite) » pour `1AP`) ou quand ils lèvent une ambiguïté de portée (ex.
  `1GK`/`1GL`, à cocher seulement si les quatre catégories référencées cessent simultanément), et un
  tooltip « ? » pour les cas nécessitant une explication plus longue que ne le permet une parenthèse
  (`1AA`, `1AV`).
- **`gains_actionnariat_salarie` (Phase 2.3) — table dédiée, distincte de `revenus_salaires` par
  choix délibéré.** Même pattern que les autres tables du module (`user_id → auth.users(id) ON
  DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies). 18 colonnes `NUMERIC` couvrant 13 lignes du
  CERFA, mélangeant volontairement deux cadres du formulaire 2042-C : le cadre 1 « Salaires, gains
  d'actionnariat salarié » (`1TP`/`1UP`, `1TT`/`1UT`, `1TZ`, `1UZ`, `1WZ`, `1VZ`, `1NX`/`1OX`,
  `1NY`/`1OY`) et le cadre 3 « Plus-values et gains divers » pour les options attribuées avant le
  28.9.2012 (`3VD`, `3VI`, `3VF`, `3VJ`/`3VK`, `3VN`) — décision de conception : ces deux cadres
  décrivent le même objet réel (stock-options/actions gratuites), scindé administrativement par date
  d'attribution sur le papier ; les regrouper sous `revenus_salaires` aurait dénaturé le nom de cette
  dernière avec des codes qui ne sont pas, sur le CERFA, des « salaires ». **Découverte non triviale,
  vérifiée visuellement (capture haute résolution du CERFA, pas seulement l'extraction texte de la
  brochure) avant migration** : contrairement à tous les autres champs du module, 8 des 13 lignes
  (`1TZ`, `1UZ`, `1WZ`, `1VZ`, `3VD`, `3VI`, `3VF`, `3VN`) n'ont qu'**une seule case** sur le
  formulaire papier, sans colonne déclarant 2 — rompant le schéma déclarant 1/déclarant 2 systématique
  ailleurs dans `revenus_salaires`/`foyer_fiscal`. `GainsActionnariatSalarieForm.tsx` reflète cette
  asymétrie (composant `SingleMontantLigne` dédié, distinct de `MontantLigne`) plutôt que de forcer
  une colonne déclarant 2 fictive.
- **`src/lib/fiscal/calcul.ts` (dossier séparé, sans « ite ») a été nettoyé de son unique fonction
  orpheline.** L'ancienne `calculerPartsFiscales` de ce dossier n'avait aucun appelant dans le repo
  (`grep` confirmé avant suppression) et divergeait de plusieurs règles CGI (veuf avec enfant(s)
  compté à 1 part au lieu de 2, parent isolé à +0,5 au lieu de +1, résidence alternée absente,
  invalidité déclarant/conjoint/enfants conflée dans une seule majoration uniforme). Elle a été
  supprimée avec ses types (`FoyerFiscalInput`/`PartsFiscalesResult`/`EnfantPartsInput`) dans un commit
  séparé, avant l'écriture du nouveau moteur — pour ne pas mélanger nettoyage et nouvelle logique dans
  le même diff. Seule `compterEnfantsFiscalementACharge` (toujours utilisée par
  [useFamilyData.ts](src/hooks/useFamilyData.ts) pour `marital_status.nombre_enfants_charges`) reste
  dans ce dossier. Les deux dossiers `lib/fiscal/` et `lib/fiscalite/` coexistent volontairement : le
  premier reste un point de calcul ponctuel consommé par Famille, le second est le futur moteur complet
  du module Fiscalité — pas de fusion prévue.
- **`FiscalOverviewCard.tsx` et `TaxRateCard.tsx` sont des maquettes statiques, pas des écrans
  fonctionnels.** Aucun des deux ne lit Supabase ni aucun hook (`grep` confirmé : zéro import
  `supabase`/`useIFI`/`useAssets`/`useSocietes`) :
  [FiscalOverviewCard.tsx:9-23](src/pages/fiscalite/components/FiscalOverviewCard.tsx:9-23) déclare en
  dur `chartData` (IR 9 365 €, PS 2 500 €, IFI 0 €) et un commentaire explicite « Données aléatoires
  pour le graphique » ; [TaxRateCard.tsx:6-36](src/pages/fiscalite/components/TaxRateCard.tsx:6-36)
  fixe `currentIncome = 54000` et des tranches figées. Ce ne sont pas des valeurs par défaut en
  attente de données (comme un formulaire vide) : ce sont des chiffres fixes qui s'affichent à
  l'identique pour tout utilisateur, y compris un utilisateur ayant rempli un IFI de plusieurs
  centaines de milliers d'euros dans le simulateur juste à côté (§3).
- **Le simulateur IFI a son propre modèle de données, entièrement indépendant de Patrimoine et
  Sociétés — pas une friction ponctuelle mais une duplication de saisie totale et assumée par
  construction.** `docs/patrimoine.md` §6.4 affirmait que l'IFI « lit `societes.pourcentage_ifi`/
  `valeur_ifi` et ses propres tables » : la seconde moitié est confirmée (7 tables `ifi_*` propres),
  mais la première est **infirmée** — aucun fichier de `src/lib/ifi/`, `src/pages/fiscalite/`,
  `src/hooks/useIFI.ts` ni `src/services/ifiService.ts` ne référence `societes` ou `assets` (`grep`
  confirmé, zéro occurrence). La lecture de `societes.pourcentage_ifi`/`valeur_ifi` documentée dans
  `docs/patrimoine.md` appartient en réalité à `useSocietesIntegration.ts::useSocietesIFI`, un calcul
  du module **Sociétés** (déjà documenté dans `docs/societes.md`), sans aucun rapport avec le
  simulateur IFI de ce module. **Il existe donc dans l'application deux calculateurs d'IFI totalement
  étanches** : l'un basé sur les sociétés déjà saisies (`useSocietesIFI`, alimente la carte « Impact
  IFI » de la Synthèse Sociétés), l'autre basé sur une ressaisie manuelle complète dans le wizard
  2042-IFI (`computeIFI`, ce module). Un utilisateur possédant une société valorisée dans Sociétés et
  voulant l'inclure dans sa déclaration IFI doit la ressaisir de zéro dans « Biens détenus
  indirectement », sans aucun pont, pré-remplissage ni avertissement de cohérence entre les deux
  montants.
- **Corollaire : aucune cohérence vérifiée entre le statut « bien professionnel » de Patrimoine/
  Sociétés et l'exonération IFI.** Le formulaire « Biens professionnels exonérés »
  ([AjouterBienForm.tsx:846-1033](src/pages/fiscalite/components/ifi/AjouterBienForm.tsx:846-1033))
  ressaisit intégralement les critères d'exonération (activité principale, fonction de dirigeant,
  pourcentage de détention) sans lire `assets.qualification_bien`, ni le champ
  `participationAcquets`-style `bien_professionnel` utilisé côté régime matrimonial (Famille,
  `types/participationAcquets.ts`), ni `useSocietesIntegration.ts::isHoldingAnimatrice` (Sociétés).
  Trois modules du même produit peuvent donc avoir trois avis différents sur le caractère
  professionnel d'un même bien, sans qu'aucun ne le signale à l'utilisateur.
- **L'immobilier (module dédié) n'est référencé nulle part dans l'IFI.** Aucun champ, hook ni service
  du périmètre IFI ne lit `assets`/`asset_charges`/`asset_revenus` (le socle du module Immobilier). Le
  double-transfert Immobilier/Sociétés déjà documenté dans `docs/immobilier.md` et `docs/societes.md`
  (un même actif avec `transfert_immobilier=true` **et** `transfert_societe=true`, confirmé sur 4
  actifs réels) n'a donc **aucun équivalent ni aucun risque direct côté IFI** : l'IFI ne double-compte
  jamais un bien Immobilier/Sociétés, pour la bonne raison qu'il ne les lit jamais — l'utilisateur doit
  ressaisir un bien immobilier ou une société une troisième fois s'il veut qu'il apparaisse dans sa
  déclaration IFI. La question posée en amont de cet audit (« comment le double-transfert est-il géré
  côté IFI ? ») a donc pour réponse : il n'est pas géré, parce que rien de commun n'existe entre les
  deux modèles de données.
- **Sidebar IFI : le contenu affiché à chaque section ne correspond pas toujours à son libellé.** La
  section « Barème de l'IFI » ([BaremeIFISection.tsx](src/pages/fiscalite/components/ifi/BaremeIFISection.tsx))
  affiche en réalité tout le calcul de bout en bout — tranches, décote, plafonnement **et** montant
  final dû (« Montant de l'IFI dû », ligne 168-171) — alors que les deux sections suivantes dans la
  sidebar, « Réduction & Plafonnement de l'IFI »
  ([ReductionsPlafonnementSection.tsx](src/pages/fiscalite/components/ifi/ReductionsPlafonnementSection.tsx))
  et « Montant redevable à l'IFI »
  ([MontantRedevableSection.tsx](src/pages/fiscalite/components/ifi/MontantRedevableSection.tsx)),
  sont toutes deux des stubs (« Cette section sera développée prochainement »). Le wizard promet 5
  étapes progressives mais n'en livre fonctionnellement que 3 (Hypothèses, Liste des biens, Barème) —
  voir §3/§4.
- **Persistance résiliente des hypothèses, bien conçue.** `HypothesesSection.tsx` utilise
  `useImperativeHandle`/`forwardRef` pour exposer une méthode `flush()` appelée uniquement au clic sur
  « Enregistrer » ([IFIInterface.tsx:45-48](src/pages/fiscalite/components/IFIInterface.tsx:45-48)),
  qui persiste les 6 hypothèses en parallèle via `Promise.all` + `upsertByType` (idempotent, une ligne
  par `type_hypothese`, cf. [ifiService.ts:303-334](src/services/ifiService.ts:303-334)) plutôt qu'à
  chaque changement de champ — évite l'écriture en base à chaque frappe. `type_hypothese` n'a
  cependant **aucune contrainte d'unicité en base** (confirmé par le commentaire du code lui-même,
  [ifiService.ts:299-302](src/services/ifiService.ts:299-302)) : `upsertByType` relit puis écrit en
  deux requêtes séquentielles non transactionnelles, une sauvegarde concurrente (deux onglets ouverts)
  pourrait créer un doublon silencieux du même `type_hypothese`, auquel cas `hypotheses.find(...)`
  côté lecture ne prendrait que le premier trouvé.
- **Services `ifiService.ts` sans filtre `user_id` applicatif sur `getAll`/`update`/`delete`**, comme
  la majorité des services déjà documentés dans `docs/patrimoine.md`/`docs/societes.md`/
  `docs/immobilier.md` avant le durcissement du commit `ea3a695` — RLS correctement en place et
  vérifiées en base (`auth.uid() = user_id` sur les 4 opérations, sur les 7 tables), risque réel donc
  faible, mais ce module n'a **jamais reçu** le durcissement « défense en profondeur » appliqué à
  Patrimoine/Sociétés le même jour : `git log` ne montre aucun commit touchant `ifiService.ts` après
  sa création (`c0cf6bd`, `06c2b4c`).
- **Non-conformité RGPD/logs systématique sur tout `useIFI.ts`.** Les 22 occurrences de
  `console.error` du fichier ([useIFI.ts](src/hooks/useIFI.ts), une par branche `catch` des 6 hooks)
  sont **toutes** non encadrées par `import.meta.env.DEV`, contrairement à la règle `CLAUDE.md`
  (« Pas de `console.log` actif en production ») déjà appliquée au reste de Patrimoine/Sociétés par le
  commit `ea3a695`. Le message loggé est un libellé français fixe suivi de l'objet `error` brut de
  Supabase (pas de montant ni d'identité directement, mais l'objet d'erreur peut selon le cas inclure
  des fragments de la requête) — non conforme à la lettre de la règle même si le risque de fuite de
  donnée patrimoniale sensible reste faible en pratique. `ifiService.ts`, lui, ne logge rien (se
  contente de `throw`) — la non-conformité est localisée au hook, pas au service.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)

- **Un bien détenu en indivision partielle est compté à 100 % de sa valeur dans l'assiette IFI, pas à
  la quote-part réelle de l'utilisateur.** `bien_en_indivision`/`pourcentage_indivision` sont saisis
  dans `AjouterBienForm` ([AjouterBienForm.tsx:404-422](src/pages/fiscalite/components/ifi/AjouterBienForm.tsx:404-422))
  et persistés sur les 3 tables de biens concernées, mais **`IFIBienDirectInput`
  ([types.ts:3-9](src/lib/ifi/types.ts:3-9)) ne porte aucun champ d'indivision**, et ni
  `ListeBiensIFISection.tsx` ni `BaremeIFISection.tsx` ne lisent `bien.pourcentage_indivision` lors de
  la construction de l'input de `computeIFI`. Un bien détenu à 30 % en indivision avec un tiers hors
  foyer fiscal est donc taxé sur 100 % de sa valeur au lieu de 30 % — surestimation directe et
  potentiellement lourde de l'IFI affiché au client, sans qu'aucun message n'avertisse que le champ
  saisi n'a aucun effet.
- **Les biens détenus indirectement (SCI, SCPI, assurance-vie…) reposent sur un champ de valeur libre
  jamais rapproché du pourcentage de détention saisi à côté.** Le formulaire propose trois champs
  indépendants sans lien de calcul entre eux : `pourcentage_capital`, `valeur_venale_parts`,
  `valeur_bien` ([AjouterBienForm.tsx:766-841](src/pages/fiscalite/components/ifi/AjouterBienForm.tsx:766-841)).
  `computeIFI`/`ListeBiensIFISection`/`BaremeIFISection` ne lisent **que** `bien.valeur_bien`
  ([ListeBiensIFISection.tsx:162-169](src/pages/fiscalite/components/ifi/ListeBiensIFISection.tsx:162-169)) ;
  `pourcentage_capital` et `valeur_venale_parts` ne sont que des informations affichées nulle part et
  jamais utilisées pour calculer `valeur_bien` à la place de l'utilisateur. Si l'utilisateur (ou le
  conseiller) remplit la valeur vénale des parts et le pourcentage détenu en pensant que l'outil fait
  le produit, mais laisse « Valeur du bien » vide, le bien contribue pour **0 €** à l'assiette IFI —
  omission silencieuse d'un bien potentiellement significatif, sans avertissement.
- **Aucune fonction de calcul de l'impôt sur le revenu n'existe dans le code : le module Fiscalité
  n'affiche jamais un IR réel, seulement des valeurs fixes.** `FiscalOverviewCard.tsx` et
  `TaxRateCard.tsx` affichent des montants strictement codés en dur (« Imposition totale : 9 365 € »,
  « Revenu imposable : 54 000 € », tranche à 30 % marquée `active: true` en dur) quelle que soit la
  situation réelle de l'utilisateur — y compris `« Plafonnement du quotient familial : Non »`
  ([TaxRateCard.tsx:34](src/pages/fiscalite/components/TaxRateCard.tsx:34)), affirmation qui ne peut
  être vraie ou fausse puisqu'aucun calcul ne la détermine. Il n'y a pas de bug de calcul à proprement
  parler ici (rien n'est calculé), mais un écran qui se présente comme un tableau de bord fiscal
  personnalisé alors qu'il montre un mockup figé à tout utilisateur — risque concret qu'un
  conseiller ou un client lise ces chiffres comme sa situation réelle.
- **Le simulateur IFI et le reste de l'écran Fiscalité affichent des montants d'IFI contradictoires
  côte à côte, sans lien entre eux.** `FiscalOverviewCard.tsx` affiche en dur « IFI : 0 € » (ligne 13,
  32) alors que le simulateur IFI ouvert depuis le même écran peut calculer un IFI de plusieurs
  milliers d'euros à partir des biens réellement saisis (`ifi_immeubles_batis`/`ifi_immeubles_non_batis`
  contiennent chacun 1 ligne en base au moment de l'audit). Un utilisateur qui ouvre l'un puis l'autre
  voit deux montants incompatibles pour le même impôt sans qu'aucune synchronisation ni note
  n'explique l'écart.

### 🟠 À surveiller (cas limite, peu probable)

- **Réduction IFI pour dons (art. 978 CGI, 75 % du don plafonné à 50 000 €) absente du moteur de
  calcul**, alors que la catégorie de dépense « Dons aux organismes d'intérêt général (réduction IFI) »
  existe déjà comme libellé dans le module Budget
  ([budgetTypes.ts:65](src/constants/budgetTypes.ts:65)). `IFICalculInput`
  ([types.ts:24-30](src/lib/ifi/types.ts:24-30)) ne porte aucun champ de don, et la section
  « Réduction & Plafonnement de l'IFI » censée l'accueillir est un stub vide (cf. §2). Un utilisateur
  ayant fait un don éligible verra son IFI surestimé du montant de la réduction manquante, jusqu'à
  50 000 €.
- **Plafonnement des dettes « in fine » / anti-abus (art. 973 II et III CGI) non modélisé.** Le
  formulaire de passif ([AjouterPassifForm.tsx](src/pages/fiscalite/components/ifi/AjouterPassifForm.tsx))
  copie automatiquement le « Montant restant dû » saisi dans « Dette déductible »
  ([AjouterPassifForm.tsx:32-38](src/pages/fiscalite/components/ifi/AjouterPassifForm.tsx:32-38)),
  implicitement 100 % déductible, sans tenir compte des règles de plafonnement dégressif applicables
  aux emprunts sans amortissement contractés pour l'acquisition de biens taxables au-delà de certains
  seuils, ni des dettes contractées auprès de membres du groupe familial (présomption de non-
  déductibilité sauf preuve contraire). Le champ reste éditable manuellement après la copie
  automatique, donc l'utilisateur avisé peut corriger, mais rien ne le signale.
- **`ifi_hypotheses.type_hypothese` sans contrainte d'unicité en base**, malgré un commentaire de code
  qui présente `upsertByType` comme la garantie anti-doublon
  ([ifiService.ts:299-302](src/services/ifiService.ts:299-302)) — une sauvegarde concurrente (deux
  onglets, ou double-clic rapide sur « Enregistrer ») peut créer deux lignes pour le même
  `type_hypothese`, avec un comportement de lecture (`hypotheses.find`) qui ne prend que la première
  rencontrée, potentiellement pas la plus récente.
- **`ifiService.ts` sans filtre `user_id` applicatif** sur `getAll`/`update`/`delete`, à la différence
  du reste du durcissement « défense en profondeur » déjà appliqué ailleurs dans le repo (commit
  `ea3a695`) — RLS vérifiées correctes en base sur les 7 tables, risque réel faible.
- **`ifi_hors_france` : table et type persistés en base, aucun code applicatif ne les consomme.**
  `IFIHorsFrance` est importé dans `ifiService.ts` mais aucun `ifiHorsFranceService` n'est exporté, et
  aucun hook/composant n'y fait référence — chantier « biens hors de France » commencé au niveau du
  schéma seulement, cohérent avec le gap `assets.bien_etranger` déjà documenté comme non construit
  dans `docs/patrimoine.md`.

### 🟡 Mineur (cosmétique, ergonomie, refactor)

- **`foyerFiscalService.ts` ne type-check pas avec `tsc --noEmit --project tsconfig.app.json`**
  (repéré en Phase 2.2, préexistant — confirmé par `git stash` avant les commits de cette session,
  aucun lien avec `revenus_salaires`). Erreur TS2769 sur `upsertFoyerFiscal`
  ([foyerFiscalService.ts:91](src/services/foyerFiscalService.ts:91)) : `foyerFiscalToRow` construit
  `enfants_charge`/`personnes_invalides_charge` typés `EnfantCharge[]`/`PersonneInvalideCharge[]`
  ([types.ts](src/lib/fiscalite/types.ts)), mais les colonnes Supabase générées attendent `Json`
  (colonnes `jsonb`) — `EnfantCharge` n'a pas de signature d'index `[key: string]: Json`, donc TS
  refuse l'affectation par typage structurel strict, malgré `strict: false` dans `tsconfig.app.json`.
  **Aucun impact runtime** (le client Supabase sérialise la valeur en JSON à l'exécution, l'erreur
  n'existe qu'à la compilation) et **le module racine `npx tsc --noEmit -p .` ne la détecte pas** (ce
  tsconfig n'a que des `references`, sans véritable vérification sans `--build` — seul
  `--project tsconfig.app.json` la révèle). À corriger la prochaine fois qu'on touche
  `foyerFiscalService.ts`/`foyerFiscalToRow`, par exemple en castant `as unknown as Json` au point de
  sérialisation ou en élargissant `EnfantCharge`/`PersonneInvalideCharge` avec un index signature.
- **22 occurrences de `console.error` non encadrées par `import.meta.env.DEV`** dans
  [useIFI.ts](src/hooks/useIFI.ts) — non-conformité systématique à la règle `CLAUDE.md`, jamais
  corrigée dans ce fichier contrairement au reste de Patrimoine/Sociétés (commit `ea3a695`).
- **Sidebar IFI trompeuse sur le contenu réel de chaque section** (§2) : « Barème de l'IFI » contient
  en réalité le montant final dû, tandis que « Montant redevable à l'IFI » et « Réduction &
  Plafonnement de l'IFI » sont des stubs vides — à renommer ou à compléter pour que le libellé
  corresponde au contenu.
- **Fonctionnalité « Modifier un bien/passif » non implémentée**, malgré un bouton Edit visible sur
  chaque ligne : `handleEditBien`
  ([ListeBiensIFISection.tsx:114-120](src/pages/fiscalite/components/ifi/ListeBiensIFISection.tsx:114-120))
  affiche un simple toast « sera bientôt disponible » au lieu d'ouvrir un formulaire pré-rempli —
  seule la suppression fonctionne, obligeant à supprimer puis ressaisir intégralement un bien pour le
  corriger.
- **`AjouterPassifForm.tsx` : `nomCreancier` mappé sur le champ générique `commentaire`**
  ([AjouterPassifForm.tsx:50](src/pages/fiscalite/components/ifi/AjouterPassifForm.tsx:50)) plutôt que
  sur un champ dédié — fonctionne, mais la sémantique du champ base (« commentaire libre ») ne reflète
  pas son usage réel dans ce formulaire (nom du créancier), au risque d'un affichage confus si
  `commentaire` est un jour réutilisé ailleurs pour autre chose.
- **La session applicative ne survit pas à un rechargement complet de la page (`navigate`/F5),
  observé pendant la vérification manuelle du formulaire `MenageForm` (2026-09-03).** Après connexion,
  un rechargement complet de `http://localhost:8080` ramène systématiquement à la page d'accueil non
  connectée, alors qu'un Supabase Auth correctement configuré (`persistSession: true` dans
  [client.ts](src/integrations/supabase/client.ts)) devrait restaurer la session depuis
  `localStorage`. Non spécifique au module Fiscalité ni à cette phase — observé seulement à l'occasion
  de la vérification navigateur de cette session, jamais creusé (hors périmètre de ce chantier). À
  investiguer séparément : config `storage`/`persistSession` du client, ou éventuel comportement propre
  à l'environnement de prévisualisation utilisé.
- **`FiscalOverviewCard.tsx`/`TaxRateCard.tsx` : incohérence interne des seuils de tranches affichés.**
  Les seuils textuels sous la barre de progression
  ([TaxRateCard.tsx:80-87](src/pages/fiscalite/components/TaxRateCard.tsx:80-87) : 11 498 €, 29 316 €,
  83 824 €, 180 295 €) ne correspondent pas aux seuils numériques utilisés pour calculer
  `currentBracket`/`marginBeforeNext` dans le même fichier
  ([TaxRateCard.tsx:6-19](src/pages/fiscalite/components/TaxRateCard.tsx:6-19) : 11 294, 28 797,
  82 341, 177 106) — deux jeux de seuils différents cohabitent dans le même composant, sans impact
  réel puisque tout l'écran est un mockup statique (§3, 🔴), mais qui deviendrait une source d'erreur
  si l'écran était un jour rebranché sur des données réelles sans remarquer cette divergence.

## 4. Périmètre V1 / différé

- **V1 — en place** : moteur de calcul IFI complet et fidèle au barème 2024-2025 (tranches, décote,
  abattement résidence principale, abattement bois/forêts, plafonnement art. 979), saisie manuelle de
  biens directs/indirects/exonérés et passifs déductibles avec persistance Supabase par utilisateur
  (RLS + CASCADE conformes), hypothèses réutilisables d'une session à l'autre, compteur d'enfants
  fiscalement à charge partagé avec Famille ; **foyer fiscal — état civil et nombre de parts (Phase 1)**
  : saisie complète (situation familiale, lieu de résidence, enfants à charge et personnes invalides à
  charge en listes dynamiques, enfants majeurs rattachés, toutes les cases de majoration T/L/invalidité/
  ancien combattant/veuve de guerre), persistance Supabase (`foyer_fiscal`, une ligne par utilisateur),
  calcul du nombre de parts fidèle à l'art. 193-197 CGI avec détail ligne par ligne affiché en direct
  pendant la saisie ; **traitements et salaires — cadre 1 de la 2042, déclarants 1/2 (Phases 2.1 et
  2.2)** : saisie des 15 paires de champs du cadre 1 (salaires, particuliers employeurs, abattements
  et exonérations spécifiques, associés/gérants art. 62 CGI, agents généraux d'assurance, droits
  d'auteur, autres revenus imposables, salaires de source étrangère, frais réels), persistance
  Supabase (`revenus_salaires`, une ligne par utilisateur), codes de case vérifiés contre la brochure
  officielle DGFiP — capture brute, sans moteur de calcul ; **gains d'actionnariat salarié (Phase
  2.3)** : saisie des 13 lignes couvrant stock-options, actions gratuites et carried-interest (cadre 1
  de la 2042-C) ainsi que les options attribuées avant le 28.9.2012 (cadre 3, incluses sur demande
  explicite malgré le changement de cadre), persistance Supabase (`gains_actionnariat_salarie`, table
  dédiée), codes vérifiés visuellement sur le CERFA — capture brute, sans moteur de calcul.
- **Différé, déductible du code** :
  - **Tout calcul réel de l'impôt sur le revenu** : ni le nombre de parts (Phase 1) ni les salaires ou
    gains d'actionnariat saisis (Phases 2.1/2.2/2.3) ne sont appliqués à un barème ; aucune fonction de
    calcul IR (tranches, décote, quotient familial appliqué au revenu) n'existe dans le repo —
    dépendance de la Phase 10 prévue. En particulier, le choix entre abattement forfaitaire de 10 %
    (`1AJ`/`1BJ`) et frais réels (`1AK`/`1BK`) n'est ni calculé ni arbitré : les deux montants peuvent
    être saisis simultanément sans qu'aucune logique n'indique lequel est retenu par l'administration.
    De même pour les 3 taux de `3VD`/`3VI`/`3VF` (18 %/30 %/41 %) : rien n'empêche de saisir les trois
    simultanément alors qu'un seul est normalement applicable par situation.
  - **Traitements et salaires — colonnes C/D (Phase 2.1, dette assumée)** : les revenus propres des
    personnes à charge (ex. enfants majeurs rattachés ayant leurs propres salaires) ne sont pas
    saisis — cas rare, traité dans une session ultérieure.
  - **Cas spécifiques restants (sous-phase 2.4)** : salariés impatriés, indemnités pour préjudice
    moral, sommes exonérées provenant du CET — non saisis, différés à une session séparée. (Les
    agents généraux d'assurance, initialement prévus dans cette sous-phase, ont finalement été inclus
    dès la Phase 2.1 — `1GG`/`1HG` — sur demande explicite en session.)
  - **Plafonnement effectif du quotient familial (art. 197 CGI, Phase 10 prévue)** : chaque majoration
    du foyer fiscal porte déjà ses plafonds en € en métadonnée
    (`plafondUnitaire`/`plafondComplementaire` dans `MajorationDetail`), mais aucun code n'applique
    encore la comparaison « impôt sur le nombre de parts réel » vs « impôt sur les parts de base plus
    les plafonds » — ce calcul suppose un barème IR qui n'existe pas encore (dépendance directe du
    point précédent).
  - **Pont entre `foyer_fiscal` et le module Famille** (`family_profiles`/`marital_status`/
    `family_links`) : saisie intégralement manuelle et indépendante par décision explicite de cette
    phase — aucune lecture croisée, aucun pré-remplissage depuis les enfants déjà saisis dans Famille.
  - **Réduction IFI pour dons** (art. 978 CGI) : absente du modèle de données et du moteur de calcul.
  - **Sections « Réduction & Plafonnement de l'IFI » et « Montant redevable à l'IFI »** : stubs vides
    dans la sidebar du simulateur, le contenu correspondant existant déjà (de façon mal nommée) dans
    « Barème de l'IFI ».
  - **Pont entre le simulateur IFI et les données déjà saisies dans Patrimoine/Immobilier/Sociétés** :
    aucune lecture croisée n'existe ; la saisie IFI est un système fermé, distinct du calcul
    `useSocietesIFI` du module Sociétés — chantier de rapprochement non commencé.
  - **Biens hors de France** : table `ifi_hors_france` créée en base, aucun code applicatif ne
    l'exploite (service, hook, UI) — cohérent avec le gap `assets.bien_etranger` déjà identifié côté
    Patrimoine.
  - **Édition d'un bien/passif existant** : seule la création et la suppression fonctionnent.
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un rapprochement des trois moteurs
  d'IFI de l'application (`lib/ifi::computeIFI`, `useSocietesIntegration::useSocietesIFI`, et les deux
  formules d'IS/IFI déjà documentées comme divergentes dans `docs/societes.md`) serait nécessaire avant
  de présenter un montant d'IFI unique et fiable à un client détenant à la fois des biens en direct, des
  parts de société et des biens immobiliers transférés dans le module dédié.
