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
   `IFIInterface`/`IFISidebar` déjà en place pour l'IFI — voir §2). Contient aujourd'hui quatre sections :
   - **Ménage — état civil et nombre de parts (Phase 1, fonctionnel)** : `MenageSection.tsx`
     (wrapper de `MenageForm.tsx` + `SyntheseFoyerFiscal.tsx`), adossé à la table Supabase
     `foyer_fiscal` et au moteur pur `src/lib/fiscalite/calculerPartsFiscales.ts`. Seul morceau du
     module qui calcule et persiste une donnée réelle, propre à l'utilisateur.
   - **Traitements et salaires — cadre 1 de la 2042, déclarants 1/2 (Phases 2.1, 2.2 et 2.4,
     fonctionnel)** : `RevenusSalairesForm.tsx`, adossé à la table Supabase `revenus_salaires`.
     Capture de données brute (pas de moteur de calcul dans cette sous-phase) ; codes de case
     vérifiés contre la brochure officielle DGFiP (2042-K/2042-C, revenus 2024). Inclut les frais
     réels (`1AK`/`1BK`, Phase 2.2), qui remplacent l'abattement forfaitaire de 10 % sur `1AJ`/`1BJ`
     — remplacement non appliqué automatiquement, saisie manuelle indépendante des deux champs (aucun
     calcul en Phase 2), ainsi que les cas spécifiques restants (Phase 2.4) : indemnités pour
     préjudice moral (`1PM`/`1QM`), salariés impatriés (`1DY`/`1EY`), sommes exonérées du CET
     (`1SM`/`1DN`) — ajoutées ici plutôt qu'à `gains_actionnariat_salarie` car elles appartiennent au
     même cadre 1 « Salaires » du CERFA, sans rapport avec les stock-options.
   - **Salaires & pensions exonérés retenus pour le calcul du taux effectif (fonctionnel)** :
     `RevenusExoneresTauxEffectifForm.tsx`, adossé à la table Supabase dédiée
     `revenus_exoneres_taux_effectif`, **distincte** de `revenus_salaires` (voir §2) — encart séparé
     du CERFA (2042-C, pages 99/116), mélangeant salaires et pensions, servant un mécanisme distinct
     (taux effectif appliqué au reste du revenu par convention fiscale internationale ou art. 81 A
     CGI, pas une base imposable en France). `1AF`/`1BF` (déjà dans `revenus_salaires`, Phase 2.1)
     désigne un mécanisme apparenté mais différent — crédit d'impôt égal à l'impôt français, pas taux
     effectif — les deux méthodes restent non implémentées dans le moteur de calcul (voir §4).
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
2. **Un tableau de bord IR désormais branché sur les données réelles, couvrant les salaires, la part
   barème et la part à taux forfaitaire des gains d'actionnariat salarié.**
   (`FiscaliteSection.tsx` → `FiscalDeclarationsCard`, `FiscalOverviewCard`, `TaxRateCard`) : liste de
   déclarations fiscales (2042, 2044, 2047, 2074, 2086, 2042-IFI), graphique de répartition, taux
   marginal d'imposition, tranches. Le hook [useFiscalOverview.ts](src/hooks/useFiscalOverview.ts)
   agrège `foyer_fiscal` + `revenus_salaires` + `gains_actionnariat_salarie` +
   `revenus_exoneres_taux_effectif`, calcule le revenu net imposable, le nombre de parts et l'impôt sur
   le revenu réel (voir §2), et alimente les deux cartes. **Prélèvements sociaux et IFI restent affichés
   comme « non calculé »** (pas de moteur pour ces deux impôts dans ce tableau de bord — l'IFI dispose
   de son propre simulateur, point 3 ci-dessous). Le carried-interest (1NX/1OX) et les gains
   d'actionnariat à taux forfaitaire (3VD/3VI/3VF) sont désormais couverts, à taux proportionnel
   (12,8 %/18 %/30 %/41 %, hors barème — voir §2) ; toute autre catégorie de revenu future (fonciers,
   capitaux mobiliers…) n'entre pas encore dans ce calcul (voir §4).
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
| Traitements et salaires (section 2042) | [RevenusSalairesForm.tsx](src/components/fiscalite/RevenusSalairesForm.tsx) | 18 paires de champs déclarant 1/déclarant 2 (cadre 1 de la 2042, hors colonnes C/D et gains d'actionnariat), code officiel + libellé français côte à côte |
| Salaires & pensions exonérés — taux effectif (section 2042) | [RevenusExoneresTauxEffectifForm.tsx](src/components/fiscalite/RevenusExoneresTauxEffectifForm.tsx) | 5 lignes (`1AC`/`1BC`, `1GE`/`1HE` case à cocher, `1AE`/`1BE`, `1AH`/`1BH`, `RSE`/`RSF` texte libre), encart CERFA distinct (2042-C pages 99/116) — alimente désormais le taux effectif dans le tableau de bord IR (Vision générale) |
| Gains d'actionnariat salarié (section 2042) | [GainsActionnariatSalarieForm.tsx](src/components/fiscalite/GainsActionnariatSalarieForm.tsx) | 13 lignes du CERFA (stock-options, actions gratuites, carried-interest, options pré-28.9.2012), regroupées par sous-bloc visuel ; champs à case unique sans colonne déclarant 2 pour `1TZ`/`1UZ`/`1WZ`/`1VZ` et `3VD`/`3VI`/`3VF`/`3VN`, conformément au CERFA |
| Imposition totale | [FiscalOverviewCard.tsx](src/pages/fiscalite/components/FiscalOverviewCard.tsx) | Donut IR (salaires, calculé) — PS et IFI affichés « non calculé » |
| Taux marginal | [TaxRateCard.tsx](src/pages/fiscalite/components/TaxRateCard.tsx) | Barème IR réel, tranche active (TMI), quotient familial, marge avant tranche suivante, impôt net |
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

**Moteur de calcul de l'IR** (impôt lui-même, distinct du nombre de parts) : pas de table dédiée —
cinq fonctions pures composées par [useFiscalOverview.ts](src/hooks/useFiscalOverview.ts) :
[calculerRevenuSalaires.ts](src/lib/fiscalite/calculerRevenuSalaires.ts) (revenu net imposable du cadre
1 Salaires), [calculerGainsActionnariatSalarie.ts](src/lib/fiscalite/calculerGainsActionnariatSalarie.ts)
(part barème et part à taux forfaitaire — carried-interest, gains pré-28.9.2012 — des gains
d'actionnariat salarié), [calculerRevenuExonereTauxEffectif.ts](src/lib/fiscalite/calculerRevenuExonereTauxEffectif.ts)
(revenus exonérés retenus pour le taux effectif), [calculerPartsFiscales.ts](src/lib/fiscalite/calculerPartsFiscales.ts)
(quotient familial) et [calculerImpot.ts](src/lib/fiscalite/calculerImpot.ts) (barème, plafonnement,
méthode du taux effectif, réduction outre-mer, décote, impôt forfaitaire, TMI) — voir §2. Périmètre
encore hors calcul : revenus fonciers, capitaux mobiliers, etc. (§4).

**Flux clés** :
- L'utilisateur clique « 2042-IFI » → `IFIInterface` s'ouvre en plein écran, saisit ses biens/passifs
  un par un via `AjouterBienForm`/`AjouterPassifForm`, coche des hypothèses (abattement RP, plafonnement
  actif, revenus N-1), puis navigue vers « Barème de l'IFI » où `computeIFI()` (`lib/ifi/calcul.ts`)
  calcule en temps réel l'assiette, les tranches, la décote, le plafonnement et le montant final. Ce
  résultat n'alimente toujours pas `FiscalOverviewCard`, qui affiche l'IFI comme « non calculé » plutôt
  que de dupliquer ou d'approximer le résultat du simulateur.
- La saisie du foyer fiscal (Ménage) et des salaires (Traitements et salaires) alimente désormais en
  temps réel `FiscalOverviewCard`/`TaxRateCard` via `useFiscalOverview` — un changement dans l'un des
  deux formulaires, une fois enregistré, se répercute sur le tableau de bord au prochain chargement de
  l'écran Fiscalité (pas de recalcul en direct pendant la saisie elle-même, contrairement à
  `SyntheseFoyerFiscal`).

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
  plafonds en € en simple métadonnée (`plafondUnitaire`/`plafondComplementaire`) — **non appliquée par
  cette fonction elle-même** : le plafonnement réel de l'avantage fiscal (art. 197 CGI) est calculé en
  aval par [calculerImpot.ts](src/lib/fiscalite/calculerImpot.ts) (voir plus bas), qui consomme ces
  métadonnées. 29 tests couvrent l'intégralité du tableau de règles de `calculerPartsFiscales`, y
  compris les combinaisons (enfant en résidence alternée et invalide simultanément, etc.).
- **`src/lib/fiscalite/calculerRevenuSalaires.ts` — revenu net imposable du cadre 1 « Salaires ».**
  Fonction pure : pour chaque déclarant, agrège les cases imposables soumises à abattement (1AJ, 1AA,
  1GF, 1GG, 1AP, 1AG et symétriques déclarant 2), déduit l'abattement spécifique 1GA/1HA (journalistes,
  assistants maternels) avant d'appliquer le plus favorable entre l'abattement forfaitaire de 10 %
  (plancher 509 €, plafond 14 555 €, jamais supérieur à la base) et les frais réels (1AK/1BK). 1PM/1QM
  (indemnités pour préjudice moral, déjà limitées par le formulaire à la fraction taxable au-delà d'1
  M€) s'ajoutent sans abattement. **Exclues volontairement du calcul** (`CASES_SALAIRES_EXCLUES_DU_CALCUL`) :
  1GH/1HH, 1PB/1PC, 1AD/1BD, 1DY/1EY, 1SM/1DN (exonérées d'IR par nature), 1AV/1BV (majoration du seuil
  d'exonération de 1AD/1BD — sans effet possible ici puisque 1AD/1BD est déjà traité comme intégralement
  exonéré, quel que soit le seuil), 1GK/1GL (case informative « ne perçoit plus de salaires… », sans
  montant propre), 1AF/1BF (revenus étrangers à crédit d'impôt égal à l'impôt français — mécanisme
  différent du taux effectif de `revenus_exoneres_taux_effectif`, ces cases restent hors périmètre, cf.
  §3 🟠) et 1GB/1HB (régime de frais professionnels des gérants art. 62 CGI non arbitré) — voir §3, 🟠.
  13 tests couvrent
  l'abattement standard, les bornes plancher/plafond, le choix frais réels vs abattement, et les cases
  exclues. La fonction `calculerDeclarant` (abattement 10 %/frais réels d'un déclarant) est exportée et
  réutilisée telle quelle par `calculerRevenuExonereTauxEffectif.ts` (ci-dessous).
- **`src/lib/fiscalite/calculerRevenuExonereTauxEffectif.ts` — revenus exonérés retenus pour le calcul
  du taux effectif.** Fonction pure : 1AC/1BC (salaires de source étrangère exonérés) reçoivent le même
  abattement 10 %/frais réels (1AE/1BE) que les salaires français, via `calculerDeclarant` réutilisée de
  `calculerRevenuSalaires.ts`. 1AH/1BH (pensions de source étrangère) reçoivent l'abattement de 10 %
  standard applicable aux pensions (revenus 2025/impôt 2026) : plancher 454 €/pensionné (jamais
  supérieur à la pension elle-même), plafond **global** de 4 439 € pour l'ensemble du foyer (pas par
  pensionné — la somme des abattements individuels est plafonnée une fois calculée). **Bug corrigé** :
  la première version ajoutait ces pensions brutes, sans abattement, faute de module Pensions dans le
  repo pour calibrer un montant — l'abattement pension est en réalité un barème CGI autonome
  (indépendant de tout moteur de pensions françaises), pas une extension d'un module qui n'existe pas ;
  écart constaté par comparaison avec un autre logiciel (40 000 € de pension → 303 € d'écart d'impôt
  avant correction). 1GE/1HE (case à cocher marins-pêcheurs) et RSE/RSF (pays, texte libre) sont
  purement informatifs — listées dans `CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL`, même pattern que
  `CASES_SALAIRES_EXCLUES_DU_CALCUL`/`CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL` (ajouté après un audit
  champ par champ, cf. §3). 11 tests couvrent l'abattement des salaires exonérés, le plancher/plafond de
  l'abattement pension (y compris le plafond global à deux pensionnés) et le total.
- **`src/lib/fiscalite/calculerImpot.ts` — barème progressif, plafonnement du quotient familial, méthode
  du taux effectif, réduction d'impôt outre-mer, décote, TMI.** Barème 2026 (revenus 2025, art. 4 LF
  2026, tranches 0 %/11 %/30 %/41 %/45 %, seuils 11 600 €/29 579 €/84 577 €/181 917 €) appliqué au
  quotient du **revenu mondial fictif** (revenu imposable en France + revenu exonéré retenu pour le taux
  effectif, paramètre optionnel `revenuExonereTauxEffectif`, 0 par défaut — comportement inchangé quand
  il est nul ou omis), puis plafonnement art. 197 CGI (compare l'avantage procuré par les majorations à
  la somme de leurs `plafondUnitaire` ; **si une majoration ne porte aucun `plafondUnitaire` —
  actuellement le cas de « personne invalide à charge » dans `calculerPartsFiscales.ts` — le
  plafonnement est désactivé pour tout le foyer plutôt que d'inventer un montant**, cf. §3 🟠), puis
  **proratisation** (méthode du taux effectif : `impôt sur le revenu mondial fictif × (revenu imposable
  en France / revenu mondial fictif)` — seule la part française paie, mais au taux moyen du revenu
  mondial ; sans revenu exonéré, ce ratio vaut 1 et n'a aucun effet), puis **réduction d'impôt outre-mer**
  (art. 197 I 3° CGI, BOI-IR-LIQ-20-30-10 : 30 % plafonnés à 2 450 € en Guadeloupe/Martinique/Réunion,
  40 % plafonnés à 4 050 € en Guyane/Mayotte, appliquée après le plafonnement du quotient et avant la
  décote — paramètre optionnel `lieuResidence`, `'metropole'` par défaut, aucun effet dans ce cas), puis
  décote (897 € − 45,25 % × impôt pour un célibataire sous 1 982 €, 1 483 € − 45,25 % × impôt pour un
  couple marié/pacsé sous 3 277 €), puis arrondi à l'euro, puis **ajout de l'impôt à taux forfaitaire**
  (nouveau paramètre optionnel `impotForfaitaire`, 0 par défaut — carried-interest et gains
  d'actionnariat à taux historique, `calculerGainsActionnariatSalarie.ts`) : ajouté tel quel après
  l'arrondi, **hors quotient familial, plafonnement, réduction outre-mer et décote**, mécanismes propres
  au barème progressif (la décote est explicitement limitée par l'art. 197 I 4° CGI à la « cotisation
  résultant du barème »). Le TMI reflète la tranche du revenu mondial fictif (pas seulement la part
  française, ni l'impôt forfaitaire qui n'entre dans aucun quotient), cohérent avec le taux marginal réel
  du foyer sur la part barème. Le `plafondComplementaire` (cumul de plusieurs majorations sur une même
  personne) n'est pas appliqué. 45 tests couvrent le barème tranche par tranche, le quotient à plusieurs
  parts, le plafonnement (actif/inactif/désactivé), le taux effectif (progressivité, non-imposition de la
  part exonérée, TMI sur le revenu mondial, cas limites à zéro), la réduction outre-mer (métropole
  neutre, 30 %/40 % sous et au-delà du plafond, impact sur l'impôt net par rapport à la métropole),
  l'impôt forfaitaire (ajout après décote, indépendance vis-à-vis du quotient/plafonnement/réduction
  outre-mer/décote, cumul avec le taux effectif, garde-fou si négatif), la décote (seuils céliba/couple)
  et l'arrondi.
- **Bug corrigé — `lieuResidence` était saisi, persisté et affiché sans jamais influencer le calcul
  d'IR.** Trouvé par un audit champ par champ des 4 types de cases (`FoyerFiscalInput`,
  `RevenusSalairesInput`, `GainsActionnariatSalarieInput`, `RevenusExoneresTauxEffectifInput`) contre
  chaque moteur de calcul, demandé explicitement pour détecter les « cases mortes ». Un résident DOM-TOM
  saisissant sa vraie situation voyait un IR surestimé de plusieurs milliers d'euros (la réduction
  outre-mer, ci-dessus, atteint jusqu'à 2 450 €/4 050 €), sans aucun signalement à l'écran. Le même audit
  a aussi trouvé 1AV/1BV et 1GK/1GL (`revenus_salaires`) sans effet et absentes de
  `CASES_SALAIRES_EXCLUES_DU_CALCUL` — gravité mineure (1AV/1BV n'a de toute façon aucun effet possible
  tant que 1AD/1BD reste traité comme intégralement exonéré ; 1GK/1GL est purement informatif), corrigé
  en les ajoutant à la liste d'exclusion documentée plutôt qu'en les laissant orphelines. Même correctif
  de cohérence appliqué à `revenus_exoneres_taux_effectif` (nouvelle constante
  `CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL` pour 1GE/1HE/RSE/RSF, qui n'en avaient pas).
- **Bug corrigé — `revenusSalairesService.ts` renvoyait les cases numériques en chaînes de caractères,
  faussant tout calcul arithmétique.** Les colonnes `revenus_salaires.case_1xx` sont de type Postgres
  `numeric` ; PostgREST (donc `supabase-js`) les sérialise en **chaîne** (`"50000"`, pas `50000`) pour
  préserver la précision, alors que `RevenusSalairesRow` déclarait `number | null`. Sans conversion, `+`
  entre une chaîne et un nombre fait une concaténation JS (`"50000" + 0 → "500000"`) au lieu d'une
  addition — corrompait silencieusement tout le revenu imposable calculé par
  `calculerRevenuSalaires.ts` (constaté en base : `case_1aj` vaut la chaîne `"50000"`, confirmé par
  `pg_typeof` = `numeric`). Corrigé par `toNumberOrNull()` dans `rowToRevenusSalaires`
  ([revenusSalairesService.ts](src/services/revenusSalairesService.ts)). **Même correctif appliqué à
  `gainsActionnariatSalarieService.ts`** (colonnes `numeric` déclarées `number | null` sans coercition,
  même `toNumberOrNull()` ajouté dans `rowToGainsActionnariatSalarie`) au moment de brancher les gains
  d'actionnariat sur `calculerImpot` — corrigé avant, pas après, l'intégration arithmétique.
- **`src/lib/fiscalite/calculerGainsActionnariatSalarie.ts` — part barème et part à taux forfaitaire
  des gains d'actionnariat salarié.** Fonction pure, deux résultats distincts. `totalNetImposable`
  (barème, plus simple que `calculerRevenuSalaires.ts` : pas d'abattement à arbitrer, les montants du
  CERFA sont déjà nets) : additionne 1TP/1UP (rabais excédentaire sur options, imposé comme un salaire),
  1TT/1UT (gains de levée d'options / actions gratuites post-28.9.2012, sans abattement), 1TZ (gain
  après abattement — case unique, pas de déclarant 2, déjà net des abattements 1UZ/1WZ/1VZ) et 3VJ/3VK
  (option barème pour les gains pré-28.9.2012, en lieu et place des taux forfaitaires 3VD/3VI/3VF).
  `impotForfaitaire` (impôt déjà calculé, pas un revenu — distinct de `totalNetImposable`, ne s'y ajoute
  jamais) : 1NX/1OX (carried-interest, art. 150-0 A II 8° CGI, PFU **12,8 %** — IR seul, PS hors
  périmètre du module) + 3VD/3VI/3VF (gains pré-28.9.2012 à taux historique, respectivement **18 %/30 %/
  41 %** — le CERFA impose déjà au déclarant de ventiler son gain par tranche de taux dans la case
  correspondante, aucun seuil de 152 500 € à recalculer côté outil). Cases et taux vérifiés visuellement
  sur la brochure officielle DGFiP (2042-C, revenus 2025, page 3, cases 111/150) avant codage. **Exclues
  du calcul** (`CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL`) : 1UZ/1WZ/1VZ (montants d'abattement déjà
  déduits de 1TZ — les ajouter serait un double-comptage), 1NY/1OY et 3VN (contributions salariales de
  30 %/10 % sur le carried-interest/les options, pas de l'IR) — voir §3, 🟠. 26 tests couvrent
  l'agrégation des cases barème, l'impôt forfaitaire (chaque taux isolément, cumul, indépendance vis-à-vis
  du barème) et la non-inclusion des cases exclues.
- **`src/hooks/useFiscalOverview.ts` — point de calcul unique consommé par `FiscalOverviewCard` et
  `TaxRateCard`.** Compose `useFoyerFiscal` + `useRevenusSalaires` + `useGainsActionnariatSalarie` +
  `useRevenusExoneresTauxEffectif` (un seul fetch Supabase de chacun), applique les cinq fonctions
  ci-dessus (revenu imposable France = salaires + part barème des gains d'actionnariat ; revenu exonéré,
  `foyerInput.lieuResidence` et `gainsActionnariat.impotForfaitaire` passés séparément à `calculerImpot`
  pour la méthode du taux effectif, la réduction outre-mer et l'impôt forfaitaire), et renvoie un objet
  unique
  (`revenuSalaires`, `gainsActionnariat`, `revenuExonereTauxEffectif`, `parts`, `impot`, plus
  `foyerRenseigne`/`revenusRenseignes` pour distinguer un foyer non encore rempli d'un foyer réellement à
  0 €). En l'absence de données, utilise des valeurs par défaut (célibataire, 1 part, aucun revenu)
  plutôt que de ne rien afficher — les deux cartes signalent alors explicitement que le résultat n'est
  pas personnalisé, pour ne jamais laisser croire qu'un célibataire sans revenu est la situation réelle
  de l'utilisateur.
- **`revenus_salaires` (Phases 2.1, 2.2 et 2.4) — capture brute du cadre 1 de la 2042, sans moteur de
  calcul.** Table `user_id → auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies,
  même pattern que `foyer_fiscal`. 36 colonnes `case_1xx`/`case_1yy` (convention `1AJ` → `case_1aj`,
  préfixe imposé par SQL pour un identifiant commençant par un chiffre), dont 4 booléennes (cases à
  cocher `1AV`/`1BV`, `1GK`/`1GL`). `case_1ak`/`case_1bk` (frais réels) ajoutées par migration
  séparée en Phase 2.2, à la suite de `1AG`/`1BG` dans le formulaire — ordre du CERFA (dernière ligne
  du bloc « Traitements, salaires » avant « Pensions, retraites, rentes »). `case_1pm`/`case_1qm`
  (indemnités préjudice moral), `case_1dy`/`case_1ey` (salariés impatriés) et `case_1sm`/`case_1dn`
  (CET) ajoutées par migration séparée en Phase 2.4, à la suite de `1GG`/`1HG` dans le formulaire —
  même symétrie de raisonnement que pour `1GG` (Phase 2.1) : ce sont des cas particuliers du cadre 1
  « Salaires », sans rapport avec les stock-options de `gains_actionnariat_salarie` (Phase 2.3), donc
  logés ici plutôt que dans une quatrième table. Périmètre validé en
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
- **`revenus_exoneres_taux_effectif` — table dédiée, distincte de `revenus_salaires`, même logique de
  séparation que `gains_actionnariat_salarie`.** Même pattern que les autres tables du module. 10
  colonnes couvrant l'encart CERFA « Salaires et pensions exonérés retenus pour le calcul du taux
  effectif » (2042-C, pages 99/116) : `1AC`/`1BC` (salaires), `1GE`/`1HE` (case à cocher,
  marins-pêcheurs), `1AE`/`1BE` (frais réels), `1AH`/`1BH` (pensions de source étrangère), `RSE`/`RSF`
  (pays de provenance, `TEXT` — seules colonnes texte du module, le reste étant `NUMERIC`/`BOOLEAN`).
  Décision de conception validée en session : cet encart mélange salaires et pensions et sert un
  mécanisme distinct (taux effectif appliqué au reste du revenu par convention fiscale internationale
  ou art. 81 A CGI — **pas** une base imposable en France), justifiant une table à part plutôt qu'une
  extension de `revenus_salaires`. `RevenusExoneresTauxEffectifForm.tsx` reprend le pattern grid le
  plus récent (en-têtes « Déclarant 1/2 » regroupés en haut du formulaire, introduit par le commit
  `b94b9c1` sur `GainsActionnariatSalarieForm.tsx`) plutôt que l'ancien pattern par ligne de
  `RevenusSalairesForm.tsx` — écart de cohérence mineur entre les deux formulaires les plus anciens du
  module et les deux plus récents, non retouché rétroactivement (changement chirurgical, hors
  périmètre de cette session). Section enregistrée dans
  [declaration2042CasesIndex.ts](src/pages/fiscalite/components/2042/declaration2042CasesIndex.ts)
  pour la barre de recherche des cases (`b94b9c1`) — fichier à tenir à jour manuellement à chaque
  nouvelle case, aucune vérification automatique n'existe entre le formulaire et cet index (dette, cf.
  §3).
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
- **`FiscalOverviewCard.tsx` et `TaxRateCard.tsx` sont désormais des écrans fonctionnels pour l'IR
  salaires, statiques pour le reste.** Les deux reçoivent `overview: FiscalOverview` en prop depuis
  `FiscaliteSection.tsx` (calculé une seule fois par `useFiscalOverview`) plutôt que d'appeler
  Supabase chacun de leur côté — évite un double fetch et une double implémentation du même résultat.
  Ce qui reste affiché sans calcul réel, explicitement labellisé comme tel plutôt que remplacé par un
  chiffre inventé : prélèvements sociaux, IFI (renvoie vers le simulateur dédié), revenus de
  placements/fonciers/exceptionnels, contributions sur les hauts revenus, retenues et soldes
  (`FiscalOverviewCard.tsx`, onglet « Impôts sur le revenu »).
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
- **Résolu (voir §2) — un moteur de calcul de l'impôt sur le revenu existe désormais**
  (`calculerRevenuSalaires.ts` + `calculerGainsActionnariatSalarie.ts` +
  `calculerRevenuExonereTauxEffectif.ts` + `calculerPartsFiscales.ts` + `calculerImpot.ts`, consommés
  par `useFiscalOverview.ts`), couvrant les salaires, la part barème et la part à taux forfaitaire des
  gains d'actionnariat salarié (carried-interest 1NX/1OX à 12,8 % PFU, 3VD/3VI/3VF à 18 %/30 %/41 %,
  taux vérifiés visuellement sur la brochure DGFiP), et la méthode du taux effectif. **Reste hors
  calcul** : les revenus fonciers, les capitaux mobiliers, et les cases 1AF/1BF/1GB/1HB (voir §3 🟠) —
  voir §4.
- **Résolu — le simulateur IFI et le reste de l'écran Fiscalité n'affichent plus de montants d'IFI
  contradictoires.** `FiscalOverviewCard.tsx` affiche désormais « IFI : non calculé — voir le
  simulateur IFI » plutôt qu'un « 0 € » fixe qui contredisait le résultat du simulateur ouvert depuis
  le même écran. Les deux moteurs restent non rapprochés (aucun pont, cf. §4) mais l'écran ne prétend
  plus donner un second chiffre.

### 🟠 À surveiller (cas limite, peu probable)

- **`calculerRevenuSalaires.ts` exclut volontairement 1AF/1BF et 1GB/1HB du revenu net imposable**
  ([calculerRevenuSalaires.ts](src/lib/fiscalite/calculerRevenuSalaires.ts)) : 1AF/1BF (salaires de
  source étrangère avec crédit d'impôt égal à l'impôt français) nécessitent la méthode du taux
  effectif, non implémentée ; 1GB/1HB (gérants et associés art. 62 CGI) ont un régime de frais
  professionnels particulier distinct de l'abattement de 10 % standard, non arbitré. Un utilisateur
  saisissant des montants dans ces cases les verra ignorés du calcul d'IR sans qu'aucun message ne le
  signale à l'écran — à corriger avant d'afficher le calcul comme fiable pour ces profils
  (non-résidents, gérants majoritaires).
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

- **`declaration2042CasesIndex.ts` (barre de recherche des cases) tenu à jour manuellement, sans
  vérification automatique.** Chaque nouvelle case ajoutée dans un formulaire de la 2042 doit être
  répliquée à la main dans cet index (`code`, `label`, `sectionId`, `elementId`) pour rester
  cherchable — aucun test ni script ne garantit que les deux restent synchronisés. Un oubli futur
  rendrait une case invisible à la recherche sans erreur ni avertissement.
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
- **Résolu — `TaxRateCard.tsx` n'a plus qu'un seul jeu de seuils.** Les seuils textuels sous la barre
  de progression sont désormais générés depuis `BAREME_2026` (`calculerImpot.ts`), la même source que
  le calcul du TMI — l'ancienne divergence entre seuils affichés et seuils calculés (deux jeux de
  chiffres différents dans le même fichier) ne peut plus se reproduire.

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
  pendant la saisie ; **traitements et salaires — cadre 1 de la 2042, déclarants 1/2 (Phases 2.1, 2.2
  et 2.4)** : saisie des 18 paires de champs du cadre 1 (salaires, particuliers employeurs,
  abattements et exonérations spécifiques, associés/gérants art. 62 CGI, agents généraux d'assurance,
  droits d'auteur, autres revenus imposables, salaires de source étrangère, frais réels, indemnités
  pour préjudice moral, salariés impatriés, sommes exonérées du CET), persistance Supabase
  (`revenus_salaires`, une ligne par utilisateur), codes de case vérifiés contre la brochure
  officielle DGFiP — capture brute, sans moteur de calcul ; **gains d'actionnariat salarié (Phase
  2.3)** : saisie des 13 lignes couvrant stock-options, actions gratuites et carried-interest (cadre 1
  de la 2042-C) ainsi que les options attribuées avant le 28.9.2012 (cadre 3, incluses sur demande
  explicite malgré le changement de cadre), persistance Supabase (`gains_actionnariat_salarie`, table
  dédiée), codes vérifiés visuellement sur le CERFA — capture brute, sans moteur de calcul ; **salaires
  et pensions exonérés retenus pour le calcul du taux effectif** : saisie des 5 lignes de l'encart
  CERFA dédié (2042-C, pages 99/116), persistance Supabase (`revenus_exoneres_taux_effectif`, table
  dédiée), codes vérifiés visuellement. **Méthode du taux effectif implémentée** dans `calculerImpot.ts`
  via `calculerRevenuExonereTauxEffectif.ts` (voir §2) — ce n'est plus une capture brute.
  **Carried-interest et gains d'actionnariat à taux forfaitaire désormais couverts** (1NX/1OX à 12,8 %
  PFU, 3VD/3VI/3VF à 18 %/30 %/41 %, via `calculerGainsActionnariatSalarie.ts::impotForfaitaire`, ajouté
  après décote dans `calculerImpot.ts` — voir §2).

  **Sous-phases 2.1 à 2.4 du bloc « Salaires » toutes terminées, ainsi que l'encart taux effectif
  associé** : le cadre 1 de la 2042 est intégralement couvert par
  `RevenusSalairesForm.tsx`/`GainsActionnariatSalarieForm.tsx`/`RevenusExoneresTauxEffectifForm.tsx`, à
  l'exception des colonnes C/D (dette assumée ci-dessous). **Calcul de l'IR (Phase 10) — salaires, gains
  d'actionnariat (part barème et part à taux forfaitaire), méthode du taux effectif et réduction
  outre-mer couverts** : `calculerRevenuSalaires.ts` + `calculerGainsActionnariatSalarie.ts` +
  `calculerRevenuExonereTauxEffectif.ts` + `calculerPartsFiscales.ts` + `calculerImpot.ts` (barème 2026,
  quotient familial, plafonnement art. 197 CGI, proratisation taux effectif, réduction d'impôt outre-mer
  art. 197 I 3° CGI, décote, impôt à taux forfaitaire carried-interest/gains historiques, TMI), branchés
  en temps réel sur `FiscalOverviewCard`/`TaxRateCard` via `useFiscalOverview.ts` (voir §2). Prochaine
  étape de la feuille de route : un futur cadre 2042 hors « Salaires » (revenus fonciers, capitaux
  mobiliers, plus-values, etc.), ou les cases 1AF/1BF/1GB/1HB (point ci-dessous).
- **Différé, déductible du code** :
  - **1AF/1BF (salaires de source étrangère, crédit d'impôt égal à l'impôt français) et 1GB/1HB
    (gérants et associés art. 62 CGI) exclus de `calculerRevenuSalaires.ts`** — 1AF/1BF suit un
    mécanisme de crédit d'impôt distinct de la méthode du taux effectif désormais implémentée pour
    `revenus_exoneres_taux_effectif` (pas juste « pas encore fait » : une base de calcul différente),
    et le régime de frais professionnels des gérants art. 62 CGI reste non arbitré (voir §3, 🟠).
  - Le choix entre abattement forfaitaire de 10 % (`1AJ`/`1BJ`) et frais réels (`1AK`/`1BK`) est
    désormais arbitré par `calculerRevenuSalaires.ts` (le plus favorable des deux est retenu
    automatiquement).
  - **Traitements et salaires — colonnes C/D (Phase 2.1, dette assumée)** : les revenus propres des
    personnes à charge (ex. enfants majeurs rattachés ayant leurs propres salaires) ne sont pas
    saisis — cas rare, traité dans une session ultérieure.
  - **Plafonnement du quotient familial — cas de la personne invalide à charge non chiffré** : cette
    majoration (`calculerPartsFiscales.ts`) ne porte pas de `plafondUnitaire`, ce qui désactive tout
    plafonnement pour le foyer entier tant qu'un montant officiel n'a pas été recherché et intégré (voir
    §2/§3). Le `plafondComplementaire` (cumul de plusieurs majorations sur une même personne) n'est pas
    non plus appliqué par `calculerImpot.ts`.
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
