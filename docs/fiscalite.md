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
   `IFIInterface`/`IFISidebar` déjà en place pour l'IFI — voir §2). Contient aujourd'hui cinq sections :
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
   - **Pensions, retraites et rentes — cadre 1 de la 2042, déclarants 1/2 (fonctionnel)** :
     `PensionsRetraitesRentesForm.tsx`, adossé à la table Supabase dédiée `pensions_retraites_rentes`,
     **distincte** de `revenus_exoneres_taux_effectif` (voir §2) — 7 lignes du vrai cadre CERFA
     « Pensions, retraites, rentes » (pensions/retraites/rentes, pensions de retraite en capital
     taxables à 7,5 %, pensions en capital des plans d'épargne retraite, pensions d'invalidité,
     pensions alimentaires perçues, pensions non-résidents/source étrangère avec crédit d'impôt,
     autres pensions étrangères), codes vérifiés visuellement sur la brochure DGFiP (2042-K, pages
     115-119). Capture de données brute (pas de moteur de calcul). `1AH` (pensions étrangères
     exonérées, taux effectif) **reste** dans `RevenusExoneresTauxEffectifForm.tsx` — il n'appartient
     pas à ce cadre (aucun code en commun, mécanisme différent), décision explicite prise en session
     après vérification pour ne pas mélanger une case exonérée dans un cadre de revenus imposables.
   - **Gains d'actionnariat salarié — stock-options, actions gratuites, carried-interest (Phase 2.3,
     fonctionnel)** : `GainsActionnariatSalarieForm.tsx`, adossé à la table Supabase
     `gains_actionnariat_salarie`, **distincte** de `revenus_salaires` (voir §2). Mélange volontaire
     de codes du cadre 1 « Salaires, gains d'actionnariat salarié » et du cadre 3 « Plus-values et
     gains divers » du CERFA 2042-C (options attribuées avant le 28.9.2012) — même objet réel, scindé
     administrativement par date d'attribution sur le formulaire papier.
   - **Revenus des valeurs et capitaux mobiliers — cadre 2 de la 2042 (saisie brute, fonctionnel)** :
     `RevenusCapitauxMobiliersForm.tsx`, adossé à la table Supabase dédiée `revenus_capitaux_mobiliers`.
     45 cases numériques + `2OP` (case à cocher), regroupées en 6 catégories conformes à la déclaration
     en ligne impots.gouv.fr (pas au regroupement thématique du CERFA papier) — voir §2. Capture de
     données brute, sans moteur de calcul.

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
   `revenus_exoneres_taux_effectif` + `pensions_retraites_rentes`, calcule le revenu net imposable, le
   nombre de parts et l'impôt sur le revenu réel (voir §2), et alimente les deux cartes. **Prélèvements
   sociaux et IFI restent affichés comme « non calculé »** (pas de moteur pour ces deux impôts dans ce
   tableau de bord — l'IFI dispose de son propre simulateur, point 3 ci-dessous). Les gains
   d'actionnariat à taux forfaitaire (3VD/3VI/3VF) sont couverts, à taux proportionnel (18 %/30 %/41 %,
   hors barème) ; le carried-interest (1NX/1OX) rejoint désormais le barème comme un salaire ordinaire
   (voir « Bug corrigé » en §2 — 1NX/1OX n'est pas le carried-interest qualifiant du régime de faveur) ;
   les pensions/retraites/rentes le sont désormais
   aussi (abattement de 10 % classique, capital PER sans abattement, capital retraite à 7,5 %, rentes
   viagères par tranche d'âge — voir §2) ; toute autre catégorie de revenu future (fonciers, capitaux
   mobiliers…) n'entre pas encore dans ce calcul (voir §4).
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
| Traitements et salaires (section 2042) | [RevenusSalairesForm.tsx](src/components/fiscalite/RevenusSalairesForm.tsx) | 19 paires de champs déclarant 1/déclarant 2 (cadre 1 de la 2042, hors colonnes C/D et gains d'actionnariat), code officiel + libellé français côte à côte |
| Salaires & pensions exonérés — taux effectif (section 2042) | [RevenusExoneresTauxEffectifForm.tsx](src/components/fiscalite/RevenusExoneresTauxEffectifForm.tsx) | 5 lignes (`1AC`/`1BC`, `1GE`/`1HE` case à cocher, `1AE`/`1BE`, `1AH`/`1BH`, `RSE`/`RSF` texte libre), encart CERFA distinct (2042-C pages 99/116) — alimente désormais le taux effectif dans le tableau de bord IR (Vision générale) |
| Pensions, retraites et rentes (section 2042) | [PensionsRetraitesRentesForm.tsx](src/components/fiscalite/PensionsRetraitesRentesForm.tsx) | 7 lignes déclarant 1/déclarant 2 (`1AS`, `1AT`, `1AI`, `1AZ`, `1AO`, `1AL`, `1AM`) + rentes viagères à titre onéreux ventilées par tranche d'âge, pas déclarant (`1AW`/`1BW`/`1CW`/`1DW` rentes perçues, `1AR`/`1BR`/`1CR`/`1DR` non-résidents), vrai cadre 1 « Pensions, retraites, rentes » du CERFA (2042-K pages 115-119), hors colonnes C/D — capture brute, sans moteur de calcul |
| Gains d'actionnariat salarié (section 2042) | [GainsActionnariatSalarieForm.tsx](src/components/fiscalite/GainsActionnariatSalarieForm.tsx) | 16 lignes du CERFA (stock-options, actions gratuites, carried-interest, BSPCE, management packages, options pré-28.9.2012, système du quotient), regroupées par sous-bloc visuel ; champs à case unique sans colonne déclarant 2 pour `1TZ`/`1UZ`/`1WZ`/`1VZ`, `3VD`/`3VI`/`3VF`/`3VN` et `0XX`, conformément au CERFA |
| Revenus des valeurs et capitaux mobiliers (section 2042) | [RevenusCapitauxMobiliersForm.tsx](src/components/fiscalite/RevenusCapitauxMobiliersForm.tsx) | Cadre 2 de la 2042 (2042-K + 2042-C), 45 cases numériques + `2OP` (case à cocher, hors catégorie en pied de cadre) ; aucune colonne déclarant 1/déclarant 2 sur le CERFA — chaque case est un montant unique par foyer, contrairement au cadre 1 ; regroupées en 6 catégories conformes à la déclaration en ligne impots.gouv.fr : contrats d'assurance-vie ≥ 8 ans, < 8 ans, revenus ouvrant/n'ouvrant pas droit à abattement, autres revenus, gains de cession de bons et contrats — capture brute, sans moteur de calcul |
| Imposition totale | [FiscalOverviewCard.tsx](src/pages/fiscalite/components/FiscalOverviewCard.tsx) | Donut `SectorsDonut` (même composant que la répartition Patrimoine) montrant la vraie composition du revenu imposable (salaires/gains d'actionnariat/pensions, légende colorée) — PS et IFI affichés « non calculé » |
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
sept fonctions pures composées par [useFiscalOverview.ts](src/hooks/useFiscalOverview.ts) :
[calculerRevenuSalaires.ts](src/lib/fiscalite/calculerRevenuSalaires.ts) (revenu net imposable du cadre
1 Salaires), [calculerGainsActionnariatSalarie.ts](src/lib/fiscalite/calculerGainsActionnariatSalarie.ts)
(part barème — dont le carried-interest non qualifiant, 1NX/1OX — et part à taux forfaitaire —
gains pré-28.9.2012 — des gains d'actionnariat salarié), [calculerRevenuExonereTauxEffectif.ts](src/lib/fiscalite/calculerRevenuExonereTauxEffectif.ts)
(revenus exonérés retenus pour le taux effectif), [calculerPensionsRetraitesRentes.ts](src/lib/fiscalite/calculerPensionsRetraitesRentes.ts)
(pensions au barème avec/sans abattement selon la ligne, capital retraite à taux forfaitaire, rentes
viagères par tranche d'âge), [calculerRevenuCapitauxMobiliers.ts](src/lib/fiscalite/calculerRevenuCapitauxMobiliers.ts)
(cadre 2 — dividendes, intérêts, 2GO, frais/déficits si option barème, contrats d'assurance-vie
< 8 ans et ≥ 8 ans avec abattement et crédit d'impôt restituable, PFU sinon),
[calculerPartsFiscales.ts](src/lib/fiscalite/calculerPartsFiscales.ts) (quotient familial) et
[calculerImpot.ts](src/lib/fiscalite/calculerImpot.ts) (barème, plafonnement, méthode du taux effectif,
réduction outre-mer, décote, impôt forfaitaire, TMI) — voir §2. Périmètre encore hors calcul : revenus
fonciers, contrats d'assurance-vie et gains de cession du cadre 2, etc. (§4).

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
  métadonnées.
  **Résolu — personne invalide à charge (art. 196 A bis CGI) : la part entière est désormais scindée
  en 2 demi-parts plafonnées, levant la réserve documentée en dette qui désactivait le plafonnement
  pour tout le foyer dès qu'une telle personne était saisie.** Recherche demandée explicitement en
  session : brochure DGFiP IR 2026 p.84-85, texte explicite — « chaque personne invalide [...] vous
  donne droit à une augmentation du nombre de parts (une part par personne invalide recueillie). La
  réduction d'impôt en résultant est **limitée à 1 807 € par demi-part**. Toutefois, lorsque cette
  limite est atteinte pour la demi-part attribuée au titre de l'invalidité de la personne à charge, une
  réduction d'impôt complémentaire d'un montant maximal de **1 801 €** est appliquée. » Modélisé en 2
  lignes de `majorations[]` (0,5 part chacune, total inchangé = 1 part) : une demi-part « à charge »
  (plafond 1 807 €) et une demi-part « invalidité » (plafond 1 807 € + complément 1 801 €) — même
  mécanique que la majoration invalidité d'un enfant à charge, déjà en place. **Cas non modélisé,
  documenté plutôt que deviné** : lorsque le foyer ne compte à charge qu'une seule personne invalide ET
  coche la case T (parent isolé), le plafond spécifique de 4 262 € normalement associé à la case T ne
  s'applique pas à ces 2 demi-parts (brochure, même page) — interaction entre deux majorations que la
  somme indépendante des plafonds par ligne (architecture actuelle de `calculerImpot.ts`) ne peut pas
  représenter sans un changement plus large. 2 tests modifiés (29 au total, inchangé) démontrent la
  scission en 2 lignes avec leurs plafonds respectifs. Vérifié en base et à l'écran sur le compte réel
  (couple marié, TMI 30 %) : ajout d'une personne invalide à charge → synthèse affichant bien les 2
  lignes de +0,5 part (3 parts au total, inchangé par rapport à l'ancien comportement à 1 part) → IR
  passé de 13 478 € à 9 864 € (−3 614 €, avantage de quotient sur les 2 demi-parts), valeur nettoyée
  après vérification.
- **`src/lib/fiscalite/calculerRevenuSalaires.ts` — revenu net imposable du cadre 1 « Salaires ».**
  Fonction pure : pour chaque déclarant, agrège les cases imposables soumises à abattement (1AJ, 1AA,
  1GF, 1GG, 1AP, 1AG, **1GB** et symétriques déclarant 2), déduit l'abattement spécifique 1GA/1HA
  (journalistes, assistants maternels) avant d'appliquer le plus favorable entre l'abattement forfaitaire
  de 10 % (plancher 509 €, plafond 14 555 €, jamais supérieur à la base) et les frais réels (1AK/1BK).
  1PM/1QM (indemnités pour préjudice moral, déjà limitées par le formulaire à la fraction taxable
  au-delà d'1 M€) rejoignent le pool 1AJ/1AA/1GF/1GG/1AP/1AG/1GB du même déclarant, donc subissent le
  même abattement 10 %/frais réels — voir « Bug corrigé » ci-dessous. **1GH/1HH (heures supplémentaires/complémentaires et jours
  de repos/RTT monétisés, art. 81 quater CGI) et 1AD/1BD (prime de partage de la valeur) sont
  plafonnées, plus intégralement exclues** : vérifié visuellement sur la brochure officielle DGFiP (IR
  2026, revenus 2025, p.105-106) — l'exonération de 1GH/1HH est limitée à 7 500 € nets par an **par
  personne** (déclarant 1 et déclarant 2 plafonnés indépendamment, conforme aux colonnes distinctes
  1GH/1HH/1IH/1JH du CERFA, une par personne — pas un plafond de foyer), tous employeurs confondus pour
  une même personne ; celle de 1AD/1BD est limitée à 3 000 €/personne, porté à 6 000 € si 1AV/1BV est
  coché (`PLAFOND_EXONERATION_1AD`/`PLAFOND_EXONERATION_1AD_MAJORE`) — même texte de brochure pour les
  deux dispositifs (« la fraction qui excède [le plafond] sera automatiquement ajoutée au montant du
  salaire imposable »). Les fractions qui excèdent ces plafonds rejoignent le pool
  1AJ/1AA/1GF/1GG/1AP/1AG/1GB du même déclarant, donc subissent le même abattement 10 %/frais réels —
  pas ajoutées après coup sans abattement. Le plafond de 7 500 € de 1GH/1HH est partagé avec la
  monétisation des jours de repos/RTT (art. 5 LFR 2022), sans distinction possible côté app puisque les
  deux dispositifs partagent la même case CERFA (`case1gh`/`case1hh`). **Exclues volontairement du
  calcul** (`CASES_SALAIRES_EXCLUES_DU_CALCUL`) : 1PB/1PC, 1DY/1EY, 1SM/1DN (exonérées d'IR par nature,
  retenues seulement pour le RFR/plafond d'épargne retraite — hors périmètre du module) et 1GK/1GL (case
  informative « ne perçoit plus de salaires… », sans montant propre). 1GB/1HB, 1AF/1BF (crédit d'impôt
  égal à l'impôt français) et 1AD/1BD ne sont plus exclues, voir ci-dessous.
  **Bug corrigé — 1GB/1HB et 1AF/1BF avaient été exclues/isolées à tort, sur la base d'une hypothèse
  jamais vérifiée (« régime de frais professionnels particulier non arbitré » pour 1GB, « pas d'option
  frais réels identifiée » pour 1AF).** Vérification de la brochure DGFiP (IR 2026, p.107, section
  « Déduction forfaitaire de 10 % ») : texte explicite — « cette déduction est applicable à **tous les
  revenus imposés selon les règles des traitements et salaires** » et « le choix entre la déduction
  forfaitaire et la déduction des frais réels doit être **le même pour l'ensemble de ses activités**
  imposées selon les règles des traitements et salaires » — plancher (509 €) et plafond (14 555 €)
  s'appliquant eux aussi « pour chaque membre du foyer », donc une seule fois par déclarant, pas par
  case. 1GB/1HB (associés et gérants art. 62 CGI) ne relève d'aucun régime distinct : elle rejoint
  simplement le pool 1AJ/1AA/1GF/1GG/1AP/1AG comme n'importe quelle autre case du cadre. 1AF/1BF
  (salaires de source étrangère avec crédit d'impôt égal à l'impôt français) rejoint la **même base**
  que ce pool pour le calcul du plancher/plafond et le choix 10 %/frais réels — elle n'est **plus**
  calculée comme un pool isolé avec son propre plancher. `calculerDeclarant` a été étendu d'un 4ᵉ
  paramètre optionnel `remunerationsCreditImpot` (0 par défaut, comportement inchangé pour
  `calculerRevenuExonereTauxEffectif.ts` qui ne l'utilise pas) : la base totale (pool + crédit d'impôt)
  sert au calcul de l'abattement/frais réels, puis le résultat net est réparti **proportionnellement**
  entre `netImposable` (pool ordinaire, alimente `totalNetImposable`) et le nouveau champ
  `netImposableCreditImpot` (isolé pour `revenuCreditImpotEgalImpotFrancais`, toujours exclu de
  `totalNetImposable`) — répartition nécessaire car la formule officielle du crédit d'impôt a besoin du
  montant net attribuable spécifiquement à 1AF, que la base commune ne permet plus d'isoler
  directement. Vérifié à la main : 30 000 € sur 1AJ + 10 000 € sur 1AF (pas de frais réels) → base
  totale 40 000 €, abattement 10 % = 4 000 €, net total 36 000 €, réparti 27 000 €
  (1AJ, 90 %) / 9 000 € (1AF, 25 % — proportion tenant compte du prorata, voir tests) ; avec frais réels
  de 20 000 € (plus favorables que l'abattement de 4 000 €), net total 20 000 € réparti 15 000 €/5 000 €
  dans les mêmes proportions. Vérifié également en base et à l'écran sur le compte réel (couple marié,
  TMI 30 %) : +10 000 € sur 1GB → +2 700 € d'IR (9 000 € net après abattement 10 %, 30 % de 9 000 €),
  valeur nettoyée après vérification. **Bug corrigé — 1AD/1BD (prime de partage de la valeur) était
  traitée comme intégralement exonérée, sans le mécanisme de surplus taxable que la brochure décrit
  pourtant explicitement.** Même texte de brochure que pour 1GH/1HH (p.106) : « si vous avez plusieurs
  employeurs qui vous ont versé une [PPV], le plafond de 3 000 € (ou de 6 000 € le cas échéant) peut être
  dépassé au total sans qu'il le soit pour chaque employeur. Dans cette situation, la fraction de la PPV
  qui excède 3 000 € (ou 6 000 € le cas échéant) sera automatiquement ajoutée au montant du salaire
  imposable. » `PLAFOND_EXONERATION_1AD` (3 000 €) et `PLAFOND_EXONERATION_1AD_MAJORE` (6 000 €, si
  1AV/1BV coché) implémentent ce plafond exactement comme `PLAFOND_EXONERATION_1GH` : le surplus rejoint
  le pool commun du déclarant, donc subit le même abattement 10 %/frais réels. 1AV/1BV n'est donc plus
  une case sans effet. 30 tests (dont 4 sur 1GB, 4 sur 1AF partageant le pool, et 5 nouveaux sur le
  plafond 1AD/1AV : sous le seuil, au-dessus, 1AV portant le seuil à 6 000 €, dépassement au-delà de
  6 000 €, indépendance entre déclarants) couvrent l'abattement standard, les bornes plancher/plafond, le
  choix frais réels vs abattement, les plafonds de 7 500 €/3 000 €-6 000 € sur 1GH/1HH et 1AD/1BD, et les
  cases exclues. La fonction `calculerDeclarant` (abattement 10 %/frais réels d'un déclarant) est
  exportée et réutilisée telle quelle par `calculerRevenuExonereTauxEffectif.ts` (ci-dessous), qui
  n'utilise pas le 4ᵉ paramètre (comportement inchangé).
  **Bug corrigé — 1PM/1QM (indemnités pour préjudice moral, fraction taxable au-delà d'1 M€) étaient
  ajoutées après le calcul de l'abattement du déclarant, hors du choix abattement forfaitaire de
  10 %/frais réels, sur la base d'une hypothèse jamais vérifiée (« le champ ne capture déjà que la
  fraction taxable, non soumise à l'abattement forfaitaire »).** Le BOFiP
  (BOI-RSA-CHAMP-20-40-10-30, art. 80 4e alinéa CGI) qualifie cette fraction imposable « dans la
  catégorie des traitements et salaires » — donc soumise au même régime que le reste du pool, sans
  exception. Écart détecté par comparaison avec le simulateur officiel de l'impôt sur le revenu sur le
  compte réel (couple marié, dont 1PM = 50 000 €, 1AK = 5 500 € de frais réels par ailleurs plus
  favorables que l'abattement forfaitaire du seul pool hors 1PM) : Pulse annonçait 22 868 € d'impôt
  (revenu imposable 122 200 €) contre 21 443 € au simulateur officiel (revenu brut global 117 450 €).
  Cause exacte : en isolant 1PM hors du pool, l'abattement forfaitaire du déclarant restait sous-évalué
  (calculé sur la base hors 1PM), ce qui faisait paraître les frais réels plus favorables alors qu'une
  fois 1PM intégré à la base, l'abattement forfaitaire (10 % d'une base beaucoup plus grande) redevient
  le choix le plus favorable — un cas où l'erreur de périmètre du pool change le résultat de
  l'arbitrage forfaitaire/frais réels lui-même, pas seulement son montant. Corrigé en intégrant 1PM/1QM
  à `remunerations1`/`remunerations2` comme n'importe quelle autre case du pool ; `totalNetImposable`
  ne les rajoute plus séparément (double comptage). Rejoué sur le compte réel après correction : 117 450 €
  / 21 443 €, identiques au centime près au simulateur officiel. Test dédié mis à jour dans
  `calculerRevenuSalaires.test.ts`.
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
  la somme de leurs `plafondUnitaire` — désormais chiffré pour toutes les majorations, y compris
  « personne invalide à charge » depuis sa scission en 2 demi-parts, voir plus haut), puis
  **proratisation** (méthode du taux effectif : `impôt sur le revenu mondial fictif × (revenu imposable
  en France / revenu mondial fictif)` — seule la part française paie, mais au taux moyen du revenu
  mondial ; sans revenu exonéré, ce ratio vaut 1 et n'a aucun effet), puis **réduction d'impôt outre-mer**
  (art. 197 I 3° CGI, BOI-IR-LIQ-20-30-10 : 30 % plafonnés à 2 450 € en Guadeloupe/Martinique/Réunion,
  40 % plafonnés à 4 050 € en Guyane/Mayotte, appliquée après le plafonnement du quotient et avant la
  décote — paramètre optionnel `lieuResidence`, `'metropole'` par défaut, aucun effet dans ce cas), puis
  décote (897 € − 45,25 % × impôt pour un célibataire sous 1 982 €, 1 483 € − 45,25 % × impôt pour un
  couple marié/pacsé sous 3 277 €), puis arrondi à l'euro, puis **ajout de l'impôt à taux forfaitaire**
  (nouveau paramètre optionnel `impotForfaitaire`, 0 par défaut — gains
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
- **3 cases 2042 découvertes après vérification visuelle du formulaire officiel (revenus 2025),
  absentes du périmètre initial, ajoutées à la table et au calcul concernés.** `1AQ`/`1BQ` (agents
  généraux d'assurance, salaires **exonérés**) rejoignent `revenus_salaires`, à côté de `1GG`/`1HG`
  (salaires imposables, même bloc CERFA) — exonérées d'IR par nature, ajoutées à
  `CASES_SALAIRES_EXCLUES_DU_CALCUL` (même famille que `1AD`/`1BD`). `1AY`/`1BY` (BSPCE, gain d'exercice
  taxable en salaires sur option, à compter du 1.1.2025) et `1MP`/`1MQ` (management packages, gains de
  cession sur titres souscrits par salariés/dirigeants, part taxable en salaires, à compter du
  15.2.2025) rejoignent `gains_actionnariat_salarie` : les montants saisis sont déjà nets/taxables
  (même logique que le reste de ce cadre, qui ne recalcule jamais les montants CERFA), donc ajoutés tels
  quels à `totalNetImposable` dans `calculerGainsActionnariatSalarie.ts`, même famille que `1TT`/`1UT`.
  Vérifié en base et à l'écran : +10 000 € sur `1AY` augmente l'IR de +3 000 € (TMI 30 % du foyer de
  test), +1 234 € sur `1AQ` laisse l'IR inchangé (case bien exclue).
- **Système du quotient pour revenus exceptionnels (case `0XX`, art. 163-0 A CGI) — coefficient fixe 4,
  revenus différés à coefficient variable hors périmètre.** Recherche BOFiP (BOI-IR-LIQ-20-30-20) et
  notice DGFiP avant codage : un revenu exceptionnel (par nature non susceptible d'être perçu
  annuellement, dépasse la moyenne des 3 années précédentes, sauf exceptions type indemnités de
  licenciement) ouvre droit à un coefficient fixe de 4 ; un revenu différé (perçu une année mais se
  rapportant à des années antérieures, indépendant de la volonté du contribuable) a un coefficient
  variable (nombre d'années + 1) — **sans case CERFA dédiée pour ce nombre**, donc non modélisable sans
  deviner une règle : périmètre v1 limité aux revenus exceptionnels. Case `0XX` (montant unique, pas de
  colonne déclarant 2, conforme au CERFA) ajoutée à `gains_actionnariat_salarie` (même encart CERFA que
  ce formulaire) — **exclue** de `totalNetImposable`/`impotForfaitaire` (`CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL`),
  transmise telle quelle à `calculerImpot.ts` via le nouveau champ `revenuExceptionnelQuotient` de
  `GainsActionnariatSalarieResult`. Calcul (formule BOFiP) : `calculerImpotApresQuotientFamilial` (barème +
  quotient familial + plafonnement, factorisée depuis le code existant) est appelée une fois sur le
  revenu ordinaire (`ID1`), une fois sur le revenu ordinaire + `0XX / 4` (`ID2`) ; supplément
  = `(ID2 - ID1) × 4` ; impôt brut = `ID1 + supplément`. La décote (art. 197 I 4° CGI, dont le texte
  vise explicitement la « cotisation résultant du barème, y compris [...] revenus soumis à un système de
  quotient ») s'applique donc après, sur ce total — comportement inchangé (`revenuExceptionnelQuotient`
  optionnel, 0 par défaut) pour tous les appels existants. Le montant est traité comme un revenu français
  à part entière pour la proratisation du taux effectif (`revenuMondialFictif`/TMI incluent `0XX` en
  valeur pleine, pas divisée par 4) — combinaison système du quotient × taux effectif non vérifiée contre
  un exemple BOFiP chiffré (cas rare), à surveiller si les deux mécanismes coexistent en pratique (voir
  §3). Vérifié à la main (exemple chiffré dans `calculerImpot.test.ts`, célibataire 1 part, 70 000 €
  ordinaire + 200 000 € de 0XX : impôt brut attendu 89 690,11 €, contre 98 023,84 € sans quotient) puis en
  base et à l'écran sur le compte réel (40 000 € sur `0XX` → +12 000 € d'IR, cohérent avec le TMI 30 % du
  foyer de test : 40 000/4 × 30 % × 4).
- **Crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 1AR/1BR/1CR/1DR) — désormais couvert, via
  le même mécanisme que la méthode du taux effectif.** Recherche BOFiP avant codage : la formule
  officielle du crédit est `crédit = impôt total × (revenu étranger concerné / revenu net global
  imposable)` — mathématiquement identique à la formule déjà implémentée pour le taux effectif
  (`tauxEffectif × revenu`), dès lors que le crédit est imputé **avant** réduction outre-mer et décote
  (ordre non confirmé explicitement par le BOFiP consulté pour ce cas précis face à la décote — **hypothèse
  retenue en session**, documentée en dette, §3 🟠). Implémentation (§2 ci-dessus, section
  `calculerRevenuSalaires.ts`) : `1AF`/`1BF` partagent désormais le même pool que 1AJ/1AA/1GF/1GG/1AP/1AG/
  1GB (plancher/plafond et choix 10 %/frais réels uniques par déclarant, corrigé après vérification de la
  brochure — voir ci-dessus, l'hypothèse « pas d'option frais réels » était erronée) — nouveau champ
  `revenuCreditImpotEgalImpotFrancais` dans `calculerRevenuSalaires.ts`, isolé proportionnellement,
  n'entrant pas dans `totalNetImposable`. `1AL`/`1BL` rejoignent désormais le **même** pool que
  `1AS`/`1AZ`/`1AO`/`1AM` (plancher 454 €, plafond global **unique** de 4 439 € pour tout le foyer,
  conforme au texte explicite de la brochure — voir §2, section `calculerPensionsRetraitesRentes.ts` :
  l'ancien pool indépendant était une hypothèse jamais vérifiée, corrigée depuis). `1AR`
  reçoit la même fraction imposable par tranche d'âge que `1AW` (art. 158-6 CGI), sans abattement — même
  nouveau champ `revenuCreditImpotEgalImpotFrancais` dans `calculerPensionsRetraitesRentes.ts`.
  `useFiscalOverview.ts` additionne ces deux nouveaux champs à `revenuExonereTauxEffectif.totalRetenu`
  avant l'appel à `calculerImpot.ts` — **aucun changement dans `calculerImpot.ts` lui-même**, le paramètre
  existant porte désormais les deux mécanismes (docstring élargie). **1GB/1HB ne fait pas partie de ce
  mécanisme de crédit d'impôt** (sans rapport avec le crédit d'impôt égal à l'impôt français) mais
  **n'est plus exclue du calcul** depuis l'audit case par case de ce cadre : elle rejoint simplement le
  pool standard 1AJ/1AA/1GF/1GG/1AP/1AG comme n'importe quelle autre case (voir §2, section
  `calculerRevenuSalaires.ts`) — l'ancienne exclusion reposait sur une hypothèse de « régime particulier
  non arbitré » infirmée par la brochure DGFiP. Découverte notable en cours de recherche : la brochure
  officielle référence une case **8TK** (cadre 8, « Revenus de
  source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français ») qui agrège en théorie
  toutes les catégories concernées (salaires, pensions, revenus fonciers 4BK/4BL...) pour piloter le
  crédit réel — non implémentée ici : le calcul retenu applique directement la formule par case sans
  passer par cette case agrégée, ce qui donne le même résultat final mais ne reproduit pas exactement le
  cheminement du CERFA papier. Vérifié en base et à l'écran sur le compte réel : +30 000 € sur `1AF` (net
  27 000 € après abattement) → +3 183 € d'IR ; +20 000 € sur `1AL` → +2 299 € d'IR — ordres de grandeur
  cohérents avec le mécanisme du taux effectif déjà testé (aucune régression sur les 149 tests du
  module).
- **Bug corrigé — `lieuResidence` était saisi, persisté et affiché sans jamais influencer le calcul
  d'IR.** Trouvé par un audit champ par champ des 4 types de cases (`FoyerFiscalInput`,
  `RevenusSalairesInput`, `GainsActionnariatSalarieInput`, `RevenusExoneresTauxEffectifInput`) contre
  chaque moteur de calcul, demandé explicitement pour détecter les « cases mortes ». Un résident DOM-TOM
  saisissant sa vraie situation voyait un IR surestimé de plusieurs milliers d'euros (la réduction
  outre-mer, ci-dessus, atteint jusqu'à 2 450 €/4 050 €), sans aucun signalement à l'écran. Le même audit
  a aussi trouvé 1AV/1BV et 1GK/1GL (`revenus_salaires`) sans effet et absentes de
  `CASES_SALAIRES_EXCLUES_DU_CALCUL` — corrigé à l'époque en les ajoutant à la liste d'exclusion
  documentée plutôt qu'en les laissant orphelines. **1AV/1BV a depuis un effet réel** (voir plus haut,
  section `calculerRevenuSalaires.ts` : porte le seuil d'exonération de 1AD/1BD de 3 000 € à 6 000 €) ;
  1GK/1GL reste purement informatif. Même correctif
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
  (barème) : additionne 1TP/1UP (rabais excédentaire sur options, imposé comme un salaire),
  1TT/1UT (gains de levée d'options / actions gratuites post-28.9.2012), 1NX/1OX (carried-interest ne
  remplissant pas les conditions du régime de faveur — voir « Bug corrigé » ci-dessous), 1TZ (gain
  après abattement — case unique, pas de déclarant 2, déjà net des abattements 1UZ/1WZ/1VZ) et 3VJ/3VK
  (option barème pour les gains pré-28.9.2012, en lieu et place des taux forfaitaires 3VD/3VI/3VF).
  **Abattement forfaitaire de 10 % désormais appliqué à 1TP/1TT/1NX/1AY/1MP/3VJ** (pas 1TZ, déjà net d'un
  autre mécanisme, voir ci-dessous) — résolution de la réserve documentée en dette depuis la Phase 4
  (§3 🟡), voir paragraphe dédié ci-dessous.
  `impotForfaitaire` (impôt déjà calculé, pas un revenu — distinct de `totalNetImposable`, ne s'y ajoute
  jamais) : 3VD/3VI/3VF (gains pré-28.9.2012 à taux historique, respectivement **18 %/30 %/
  41 %** — le CERFA impose déjà au déclarant de ventiler son gain par tranche de taux dans la case
  correspondante, aucun seuil de 152 500 € à recalculer côté outil). Cases et taux vérifiés visuellement
  sur la brochure officielle DGFiP (2042-C, revenus 2025, page 3, cases 111/150) avant codage. **Exclues
  du calcul** (`CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL`) : 1UZ/1WZ/1VZ (montants d'abattement déjà
  déduits de 1TZ — les ajouter serait un double-comptage), 1NY/1OY et 3VN (contributions salariales de
  30 %/10 % sur le carried-interest/les options, pas de l'IR). 24 tests couvrent
  l'agrégation des cases barème, l'impôt forfaitaire (chaque taux isolément, cumul, indépendance vis-à-vis
  du barème) et la non-inclusion des cases exclues.
  **Bug corrigé — 1NX/1OX (carried-interest) étaient traitées comme le carried-interest *qualifiant*
  du régime de faveur (art. 150-0 A II 8° CGI), taxées à 12,8 % PFU hors barème, sur la base d'une
  lecture visuelle du CERFA (page/case) sans vérification du texte de loi.** Le CERFA place pourtant
  1NX/1OX dans le cadre 1 « SALAIRES, GAINS D'ACTIONNARIAT SALARIÉ », pas dans le cadre 3 « PLUS-VALUES
  ET GAINS DIVERS » où figure le carried-interest qualifiant (case 3VG, imposé comme une plus-value
  mobilière, PFU 12,8 %/30 % ou option barème via 2OP — hors périmètre du module, non modélisé). Le
  carried-interest qui ne remplit pas les conditions de l'art. 150-0 A II 8° CGI (durée de détention,
  investissement personnel minimal...) est requalifié en salaire ordinaire et imposé au barème dans la
  catégorie des traitements et salaires — c'est précisément ce que couvre 1NX/1OX sur le CERFA. Écart
  détecté par comparaison avec le simulateur officiel de l'impôt sur le revenu sur un compte réel
  (célibataire, 1NX = 20 000 €, plus 1TP/1TT/1AY/1MP/1TZ) : 18 854 € (Pulse, 1NX au PFU) contre
  22 874 € au simulateur officiel. En intégrant 1NX/1OX au pool barème/abattement 10 % comme 1TT, le
  calcul retombe exactement sur 22 874 €. Corrigé en déplaçant 1NX/1OX du calcul `impotForfaitaire` vers
  `baseAbattementDeclarant1`/`baseAbattementDeclarant2`. Tests mis à jour dans
  `calculerGainsActionnariatSalarie.test.ts`.
  **Résolu — abattement forfaitaire de 10 % appliqué à 1TP/1TT/1AY/1MP/3VJ, levant la réserve
  documentée en dette depuis l'audit initial de la Phase 4 (§3 🟡).** Reprise de la recherche demandée
  explicitement en session : la brochure DGFiP et le BOFiP consultés lors de l'audit initial
  (BOI-RSA-ES-20-10-20-20, BOI-RSA-BASE-30-50-10, FAQ officielle) ne tranchaient ni dans un sens ni
  dans l'autre pour ces cases précises. Nouvelle source trouvée et vérifiée verbatim (HTML brut de
  bofip.impots.gouv.fr, pas un résumé) : **BOI-IR-DOMIC-10-20-20-30** (« Retenue applicable sur les
  gains de source française provenant de dispositifs d'actionnariat salarié », retenue à la source des
  non-résidents, art. 182 A ter CGI, mise à jour du 12.08.2025). Cette page définit l'assiette de la
  retenue comme *identique* à l'avantage imposable ordinaire (art. 80 bis/80 quaterdecies CGI) et
  précise, textuellement et à plusieurs reprises : « l'assiette [...] est diminuée de la déduction
  forfaitaire pour frais professionnels de 10 %. Aucune déduction au titre des frais réels et justifiés
  ne peut être pratiquée » — confirmé pour les options sur titres (§350, avant **et** après le
  28.9.2012, y compris pour un bénéficiaire qui opte pour l'imposition selon les traitements et
  salaires — cas de 3VJ), pour les BSPCE sur option barème depuis le 1.1.2025 (1AY, ajouté à cette
  page BOFiP le 12.08.2025) et pour les « dispositifs innommés et plans non qualifiés » (§540 — la
  catégorie doctrinale des management packages, 1MP). Raisonnement retenu : il serait incohérent
  qu'un non-résident bénéficie d'un abattement refusé à un résident sur exactement le même avantage,
  légalement défini comme la même assiette — la retenue à la source d'un non-résident est conçue pour
  approximer l'impôt qu'un résident aurait payé sur le même gain, pas pour créer un régime plus
  favorable. **1TZ n'est volontairement pas concerné** : le gain d'acquisition d'actions gratuites
  bénéficie d'un mécanisme différent et exclusif (abattement pour durée de détention, 1UZ/1WZ/1VZ,
  déjà déduit du montant net saisi en 1TZ) — confirmé par ailleurs par BOI-RSA-ES-20-20-20 §43, qui
  précise explicitement pour un sous-régime d'actions gratuites que « la déduction forfaitaire de 10 %
  pour frais professionnels ne s'applique pas au gain d'acquisition ». **Implémentation validée en
  session : abattement autonome, sans plancher (509 €)/plafond (14 555 €) ni fusion avec le pool
  1AJ/1AA/1GF/1GG/1AP/1AG/1GB/1AF de `calculerRevenuSalaires.ts`** — le texte BOFiP exclut
  explicitement l'option frais réels pour ce gain, ce qui exclut le mécanisme de « choix unique par
  déclarant entre forfaitaire et frais réels » qui aurait justifié une fusion de pool (technique déjà
  utilisée pour 1GB/1AF/1AL). L'abattement de 10 % est calculé sur la somme de 1TP+1TT+1AY+1MP+3VJ par
  déclarant (`baseAbattementDeclarant1`/`baseAbattementDeclarant2`), puis multiplié par 0,9. 3 tests
  modifiés et 1 nouveau (24 au total pour le fichier) démontrent l'abattement par case, le pool commun
  par déclarant (plusieurs cases du même déclarant partagent un seul calcul de 10 %, pas case par
  case), et l'absence d'effet sur 1TZ. Vérifié en base et à l'écran sur le compte réel (couple marié,
  TMI 30 %) : +10 000 € sur `1TT` → **+2 700 € d'IR** (9 000 € net après abattement 10 %, 30 % de
  9 000 €), valeur nettoyée après vérification.
- **`src/lib/fiscalite/calculerPensionsRetraitesRentes.ts` — revenu net imposable et impôt forfaitaire
  du cadre 1 « Pensions, retraites, rentes ».** Fonction pure couvrant trois mécanismes distincts,
  vérifiés sur la brochure DGFiP (2042-K, pages 115-120, texte intégral) et le BOFiP (BOI-RSA-PENS) :
  (1) **abattement de 10 % classique** (art. 158-5-a CGI) sur le total 1AS+1AZ+1AO+1AM **et 1AL**, par
  déclarant puis somme — réutilise `abattementPensionDeclarant`/`PENSION_ABATTEMENT_PLAFOND_FOYER`,
  exportés de `calculerRevenuExonereTauxEffectif.ts` (même calcul que pour 1AH, plancher 454 €/pensionné,
  plafond global **4 439 € pour tout le foyer** — un seul plafond, pas un par pool) ; (2) **1AI** (capital
  des plans d'épargne retraite) imposable au barème **sans** abattement (texte explicite de la
  brochure) ; (3) **1AT** (capital retraite, option art. 163 bis CGI) hors barème : abattement spécifique
  de 10 % **non plafonné** puis taux forfaitaire **7,5 %**, dans `impotForfaitaire` — même famille que
  3VD/3VI/3VF de `calculerGainsActionnariatSalarie.ts`. Rentes viagères à titre onéreux (1AW) :
  fraction imposable par tranche d'âge (art. 158-6 CGI, 70 %/50 %/40 %/30 %, vérifiée contre l'exemple
  chiffré de la brochure p.120), incluse dans `totalNetImposable` **sans** l'abattement de 10 % classique
  (mécanismes exclusifs). **Exclue du calcul** (`CASES_PENSIONS_EXCLUES_DU_CALCUL`) : 1HK/1HL (case
  informative) seulement — 1AL/1BL et 1AR/1BR/1CR/1DR (pensions/rentes étrangères, crédit d'impôt égal à
  l'impôt français) ne sont pas exclues : `revenuCreditImpotEgalImpotFrancais` isole leur part du calcul
  (1AR/1BR/1CR/1DR : fraction par tranche d'âge, sans abattement, comme 1AW), n'entrant pas dans
  `totalNetImposable`.
  **Bug corrigé — 1AL/1BL était isolée dans un pool d'abattement indépendant, avec son propre plafond de
  4 439 €, au lieu de partager le plafond unique du foyer avec 1AS/1AZ/1AO/1AM.** Audit case par case
  contre le texte intégral de la brochure (p.117) : « L'abattement de 10 % est appliqué automatiquement
  au total des sommes portées lignes 1AS à 1DS, 1AZ à 1DZ, 1AO à 1DO, **1AL à 1DL et 1AM à 1DM**. » — un
  seul pool, documenté sans ambiguïté, contrairement à l'hypothèse retenue jusqu'ici (« pool indépendant,
  pour éviter une clé de répartition non documentée par la brochure »). 1AM était déjà correctement inclus
  dans le pool ordinaire ; seule 1AL en était exclue à tort. Corrigé en fusionnant 1AL/1BL dans la même
  base que 1AS/1AZ/1AO/1AM avant application du plancher (454 €/pensionné) et du plafond (4 439 €/foyer,
  désormais unique), puis en isolant proportionnellement la part de 1AL dans le résultat net — même
  technique que pour 1AF dans `calculerRevenuSalaires.ts` (Phase 1). Sans le fix, un foyer combinant
  pension française et pension étrangère pouvait bénéficier jusqu'à 8 878 € d'abattement cumulé au lieu
  de 4 439 €. Vérifié à la main (100 000 € sur 1AS + 100 000 € sur 1AL : base combinée 200 000 €,
  abattement brut 20 000 € plafonné à 4 439 €, net total 195 561 € réparti 50/50 puisque les deux
  montants sont égaux → 97 780,50 € de chaque côté) puis en base et à l'écran sur le compte réel :
  résultat affiché 97 781 € (arrondi), valeurs nettoyées après vérification. 29 tests (1 nouveau,
  démontrant le cas combiné 1AS+1AL) couvrent l'abattement (plancher, plafond par déclarant et par
  foyer), 1AI sans abattement, les 4 tranches d'âge des rentes viagères, l'impôt forfaitaire de 1AT, le
  crédit d'impôt égal à l'impôt français (seul dans le pool, plafonné, et désormais partagé avec 1AS) et
  la non-inclusion des cases exclues.
- **`src/hooks/useFiscalOverview.ts` — point de calcul unique consommé par `FiscalOverviewCard` et
  `TaxRateCard`.** Compose `useFoyerFiscal` + `useRevenusSalaires` + `useGainsActionnariatSalarie` +
  `useRevenusExoneresTauxEffectif` + `usePensionsRetraitesRentes` (un seul fetch Supabase de chacun),
  applique les six fonctions ci-dessus (revenu imposable France = salaires + part barème des gains
  d'actionnariat + revenu net imposable des pensions ; revenu exonéré, `foyerInput.lieuResidence` et la
  somme des `impotForfaitaire` de gains d'actionnariat et de pensions passés séparément à
  `calculerImpot` pour la méthode du taux effectif, la réduction outre-mer et l'impôt forfaitaire), et
  renvoie un objet unique
  (`revenuSalaires`, `gainsActionnariat`, `revenuExonereTauxEffectif`, `pensionsRetraitesRentes`,
  `parts`, `impot`, plus
  `foyerRenseigne`/`revenusRenseignes` pour distinguer un foyer non encore rempli d'un foyer réellement à
  0 €). En l'absence de données, utilise des valeurs par défaut (célibataire, 1 part, aucun revenu)
  plutôt que de ne rien afficher — les deux cartes signalent alors explicitement que le résultat n'est
  pas personnalisé, pour ne jamais laisser croire qu'un célibataire sans revenu est la situation réelle
  de l'utilisateur.
- **`revenus_salaires` (Phases 2.1, 2.2 et 2.4) — capture brute du cadre 1 de la 2042, sans moteur de
  calcul.** Table `user_id → auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies,
  même pattern que `foyer_fiscal`. 38 colonnes `case_1xx`/`case_1yy` (convention `1AJ` → `case_1aj`,
  préfixe imposé par SQL pour un identifiant commençant par un chiffre), dont 4 booléennes (cases à
  cocher `1AV`/`1BV`, `1GK`/`1GL`). `case_1ak`/`case_1bk` (frais réels) ajoutées par migration
  séparée en Phase 2.2, à la suite de `1AG`/`1BG` dans le formulaire — ordre du CERFA (dernière ligne
  du bloc « Traitements, salaires » avant « Pensions, retraites, rentes »). `case_1pm`/`case_1qm`
  (indemnités préjudice moral), `case_1dy`/`case_1ey` (salariés impatriés) et `case_1sm`/`case_1dn`
  (CET) ajoutées par migration séparée en Phase 2.4, à la suite de `1GG`/`1HG` dans le formulaire —
  même symétrie de raisonnement que pour `1GG` (Phase 2.1) : ce sont des cas particuliers du cadre 1
  « Salaires », sans rapport avec les stock-options de `gains_actionnariat_salarie` (Phase 2.3), donc
  logés ici plutôt que dans une quatrième table. `case_1aq`/`case_1bq` (agents généraux d'assurance,
  salaires exonérés) ajoutées ensuite, symétrique de `1GG`/`1HG` — voir §2. Périmètre validé en
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
  DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies). 23 colonnes `NUMERIC` couvrant 16 lignes du
  CERFA, mélangeant volontairement deux cadres du formulaire 2042-C : le cadre 1 « Salaires, gains
  d'actionnariat salarié » (`1TP`/`1UP`, `1TT`/`1UT`, `1TZ`, `1UZ`, `1WZ`, `1VZ`, `1NX`/`1OX`,
  `1NY`/`1OY`, `1AY`/`1BY`, `1MP`/`1MQ`) et le cadre 3 « Plus-values et gains divers » pour les options attribuées avant le
  28.9.2012 (`3VD`, `3VI`, `3VF`, `3VJ`/`3VK`, `3VN`) — décision de conception : ces deux cadres
  décrivent le même objet réel (stock-options/actions gratuites), scindé administrativement par date
  d'attribution sur le papier ; les regrouper sous `revenus_salaires` aurait dénaturé le nom de cette
  dernière avec des codes qui ne sont pas, sur le CERFA, des « salaires ». **Découverte non triviale,
  vérifiée visuellement (capture haute résolution du CERFA, pas seulement l'extraction texte de la
  brochure) avant migration** : contrairement à tous les autres champs du module, 8 des 15 lignes
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
  extension de `revenus_salaires`. **Résolu** — les 3 formulaires (`RevenusSalairesForm.tsx`,
  `GainsActionnariatSalarieForm.tsx`, `RevenusExoneresTauxEffectifForm.tsx`) partagent désormais un seul
  jeu de composants de ligne, [DeclarationLigne.tsx](src/components/fiscalite/DeclarationLigne.tsx)
  (`MontantLigne`/`SingleMontantLigne`/`CaseLigne`/`TexteLigne`/`DeclarantsHeader`/`AideTooltip`), qui
  remplace les définitions locales dupliquées à l'identique dans chaque fichier (l'ancien écart de
  cohérence entre `RevenusSalairesForm.tsx` et les deux formulaires plus récents n'existe plus). Au
  passage, corrige un bug d'alignement présent dans les trois : `items-end` sur une rangée où la colonne
  libellé n'a qu'une ligne de contenu alors que les colonnes de saisie en ont deux (code + champ)
  plaçait le libellé principal en bas, collé aux champs, avec les mini-labels « Déclarant 1/2 » flottant
  seuls en haut — remplacé par `items-start`. Section enregistrée dans
  [declaration2042CasesIndex.ts](src/pages/fiscalite/components/2042/declaration2042CasesIndex.ts)
  pour la barre de recherche des cases (`b94b9c1`) — fichier à tenir à jour manuellement à chaque
  nouvelle case, aucune vérification automatique n'existe entre le formulaire et cet index (dette, cf.
  §3).
- **`pensions_retraites_rentes` — table dédiée, vrai cadre 1 « Pensions, retraites, rentes » du CERFA,
  distincte de `revenus_exoneres_taux_effectif`.** Même pattern que les autres tables du module
  (`user_id → auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)`, RLS 4 policies). 14 colonnes
  `NUMERIC` couvrant les 7 lignes déclarant 1/2 du cadre : `1AS`/`1BS` (pensions, retraites et rentes),
  `1AT`/`1BT` (pensions de retraite en capital taxables à 7,5 %), `1AI`/`1BI` (pensions en capital des
  plans d'épargne retraite), `1AZ`/`1BZ` (pensions d'invalidité), `1AO`/`1BO` (pensions alimentaires
  perçues), `1AL`/`1BL` (pensions non-résidents/source étrangère avec crédit d'impôt égal à l'impôt
  français), `1AM`/`1BM` (autres pensions imposables de source étrangère). Codes vérifiés visuellement
  sur la brochure officielle DGFiP (2042-K, revenus 2025, pages 115-119, zoom haute résolution) — la
  case `1AH`, initialement envisagée pour cette section, n'appartient en réalité à aucune ligne de ce
  cadre (aucun code en commun avec le CERFA "Pensions, retraites, rentes") : c'est une case propre à
  l'encart taux effectif (2042-C), qui reste dans `RevenusExoneresTauxEffectifForm.tsx` plutôt que
  d'être déplacée dans un cadre de revenus imposables auquel elle n'appartient pas. **8 colonnes
  supplémentaires ajoutées ensuite pour les rentes viagères à titre onéreux** (même cadre CERFA, page
  119) : `1AW`/`1BW`/`1CW`/`1DW` (rentes perçues) et `1AR`/`1BR`/`1CR`/`1DR` (rentes perçues par les
  non-résidents/source étrangère avec crédit d'impôt), ventilées par **tranche d'âge d'entrée en
  jouissance de la rente** (moins de 50 ans/50-59/60-69/70+) et non par déclarant — seul point du module
  où une case n'est pas répartie déclarant 1/déclarant 2, un montant par foyer. Code vérifié via le
  texte natif du PDF (`pdftotext -layout`) plutôt que la capture visuelle seule : un filigrane
  « SPECIMEN » masquait partiellement le premier caractère du code `1AR` sur l'image zoomée. Affiché par
  `DeclarationLigne::MontantParTrancheAgeLigne`, composant dédié (4 colonnes tranche d'âge plutôt que 2
  colonnes déclarant, libellé principal sur sa propre ligne au-dessus faute de place). Capture brute,
  fraction imposable dégressive selon l'âge (art. 158 6 CGI) non calculée (voir §4). **2 colonnes
  supplémentaires** : `1HK`/`1HL` (case à cocher « Ne perçoit plus de pensions 1AO, 1AM »), équivalent
  pensions de `1GK`/`1GL` (`revenus_salaires`), purement informatif. Section positionnée
  entre « Salaires & pensions exonérés (taux effectif) » et « Gains d'actionnariat salarié »
  dans la sidebar, sur demande explicite.
- **`revenus_capitaux_mobiliers` — table dédiée, cadre 2 « Revenus de capitaux mobiliers » (2042-K +
  2042-C).** Même pattern que les autres tables du module (`user_id → auth.users(id) ON DELETE
  CASCADE`, `UNIQUE(user_id)`, RLS 4 policies). 45 colonnes `NUMERIC` + 1 `BOOLEAN` (`2OP`). **Découverte
  structurante, vérifiée visuellement sur les deux CERFA officiels avant migration** : contrairement au
  cadre 1 (Salaires), aucune case de ce cadre ne porte de colonne déclarant 1/déclarant 2 sur le
  formulaire papier — chaque case est un montant unique par foyer, d'où l'absence totale de suffixe
  déclarant dans cette table (seule table du module dans ce cas pour l'intégralité de ses colonnes).
  **Regroupement en 6 catégories validé en session, conforme à la déclaration en ligne
  impots.gouv.fr plutôt qu'au regroupement thématique du CERFA papier** (les deux ne coïncident pas :
  ex. les gains de cession de bons/contrats de capitalisation, catégorie 6, sont physiquement sur le
  2042-C alors que la plupart des autres catégories sont sur le 2042-K de base) : contrats
  d'assurance-vie/capitalisation ≥ 8 ans (`2DH`/`2CH`/`2UU`/`2VV`/`2WW`), idem < 8 ans
  (`2XX`/`2YY`/`2ZZ`), revenus ouvrant droit à abattement (`2DC`/`2FU`), revenus n'ouvrant pas droit à
  abattement (`2TR`/`2TT`/`2TQ`/`2TS`/`2TZ`/`2GO`/`2TU`-`2TY`), autres revenus
  (`2CG`/`2BH`/`2DF`/`2DG`/`2DI`/`2CA`/`2AB`/`2CK`/`2EE`/`2AA`/`2AL`/`2AM`/`2AN`/`2AQ`/`2AR`), gains de
  cession de bons et contrats de capitalisation/assurance-vie (`2VM`/`2VN`/`2VO`/`2VP`/`2VQ`-`2VU`).
  `2OP` (option pour l'imposition au barème) est hors catégorie, affichée seule en pied de cadre — pas
  un revenu mais un choix global qui s'applique à l'ensemble des cases ci-dessus. Les cases « par
  année » (pertes prêts participatifs non imputées, déficits antérieurs, moins-values non imputées)
  sont affichées via un nouveau composant partagé `DeclarationLigne::MontantEclateLigne` (généralisation
  de `MontantParTrancheAgeLigne` — même structure visuelle libellé au-dessus/sous-cases en grille, mais
  paramétrée par un tableau `{label, code, value, onChange}[]` générique plutôt que par tranche d'âge) :
  la première version utilisait `SingleMontantLigne` répétée dans une grille compacte, mais les
  libellés longs (« Moins-values non imputées à reporter sur 2026, provenant de 2021 ») se chevauchaient
  visuellement entre colonnes — corrigé avant tout commit. **Périmètre volontairement exclu** (dette,
  cf. §3/§4) : `2DM` (impatriés, revenus perçus à l'étranger exonérés à 50 %) et le bloc « précisions
  CDHR » du 2042-C (`2DK`/`2DL`/`2XY`/`2XZ`/`2XW`/`2VJ`/`2VK`/`2VL`/`2EF`/`2EG`/`2EH`/`8KD`-`8KG`/`8CD`),
  cas limite propre à la contribution différentielle sur les hauts revenus. **Résolu — un moteur de
  calcul (Phase 1) couvre désormais une partie de ce cadre**, voir `calculerRevenuCapitauxMobiliers.ts`
  ci-dessous.
- **`src/lib/fiscalite/calculerRevenuCapitauxMobiliers.ts` — revenu net imposable et impôt forfaitaire
  du cadre 2.** Recherche brochure DGFiP (IR 2026, pages 123-134) avant codage, catégorie par
  catégorie. **Phase 1** — périmètre couvert : `2DC`/`2FU` (dividendes, abattement de 40 % **uniquement
  si option barème** `2OP` — sans option, PFU 12,8 % sans abattement, conforme au texte brochure
  « l'abattement de 40 % est applicable uniquement en cas d'option globale ») ; `2TS`/`2TR`/`2TT`/`2TQ`/
  `2TZ` (sans abattement, dans les deux régimes) ; `2GO`, multiplié par un **coefficient de 1,25** avant
  taxation, quelle que soit la modalité d'imposition (règle explicite de la brochure, découverte en
  session, absente de la documentation initiale du cadre) ; `2CA` (frais et charges) et `2AA`-`2AR`
  (déficits antérieurs, plancher à 0, pas de report au-delà) déduits de la base globale, **mais
  seulement en cas d'option barème** (la brochure réserve ces deux mécanismes à cette option). `2OP`
  fait donc basculer la majorité du cadre entre deux régimes : coché → tout rejoint
  `totalNetImposable` (barème, après abattement/frais/déficits) ; non coché → tout est taxé au **PFU
  12,8 %** dans `impotForfaitaire`, sans aucun des trois mécanismes ci-dessus. **Phase 2a — contrats
  d'assurance-vie de moins de 8 ans** (`2XX`/`2YY`/`2ZZ`) : `2XX` (prélevé à titre définitif à la source
  lors du versement, taux 15/25/35/45 % selon durée) reste sans aucun effet sur l'IR (déjà taxé, comme
  les lignes PS) ; `2ZZ` (versements post-27.9.2017) suit le même switch `2OP` que le reste du cadre
  (PFU 12,8 % ou barème) ; **`2YY` échappe au switch** — la brochure est explicite (p.130) : ces
  produits sont « imposés au barème de l'impôt sur le revenu, **y compris sans option globale** ».
  **Phase 2b — contrats d'assurance-vie de 8 ans et plus** (`2CH`/`2DH`/`2VV`/`2WW`) : abattement
  annuel de **4 600 €** (personne seule) / **9 200 €** (couple marié/pacsé, `situationFamille` du foyer
  — nouveau paramètre de la fonction) imputé dans l'ordre impératif `2CH` → `2DH` → `2VV` → `2WW`,
  quelle que soit la modalité d'imposition (brochure p.129). **`2CH` échappe lui aussi au switch `2OP`**
  — confirmé par BOFiP BOI-RPPM-RCM-20-10-20-50 §75 (« les produits attachés à des primes versées
  jusqu'au 26 septembre 2017 sont soumis par principe au barème progressif de l'impôt sur le revenu, à
  défaut d'option pour le prélèvement forfaitaire libératoire ») : régime antérieur à la réforme PFU de
  2018, où le choix a été fait au moment du versement, indépendamment de `2OP`. `2DH` (déjà prélevé à
  7,5 % à la source à l'époque du versement) n'entre jamais dans le revenu imposable, mais génère un
  **crédit d'impôt restituable** égal à 7,5 % de la fraction d'abattement qui lui est imputée faute
  d'avoir été absorbée par `2CH` (BOI-RPPM-RCM-20-10-20-50 §330-365, confirmé restituable : « s'il
  excède l'impôt dû, l'excédent est restitué ») — voir l'extension de `calculerImpot.ts` ci-dessous.
  `2VV`/`2WW` (reliquat d'abattement) suivent le switch `2OP` standard (7,5 %/12,8 % PFU, ou barème).
  `2YY`/`2CH`, toujours au barème, rejoignent `totalNetImposable`.
  **Phase 2c — gains de cession de bons/contrats de capitalisation et d'assurance-vie
  (`2VM`-`2VU`).** Recherche brochure DGFiP IR 2026 (p.131-132) et BOFiP
  BOI-RPPM-RCM-20-10-20-50 (§450/460, recherche complémentaire) avant codage, soumise
  en tableau de conformité et validée avant implémentation. Texte explicite : « le
  régime d'imposition de ce gain est le même que celui applicable aux produits du bon
  ou contrat concerné », mais **contrairement aux produits (2CH/2DH/2VV/2WW), les
  gains de cession n'ouvrent jamais droit à l'abattement de 4 600 €/9 200 €** — « ce
  gain est retenu dans l'assiette de l'impôt pour son montant brut ». `2VN` (gains
  attachés à des primes versées avant le 27.9.2017, sans option pour le prélèvement
  libératoire) rejoint donc `toujoursBareme` comme `2CH`/`2YY` ; `2VO`/`2VP` (gains
  attachés à des primes versées à compter du 27.9.2017, imposables à 7,5 %/12,8 %)
  suivent le switch `2OP` comme `2VV`/`2WW`, mais sans jamais passer par l'abattement.
  **La règle d'imputation « par taux » des moins-values de cession (une moins-value à
  12,8 % ne s'impute que sur des gains à 12,8 %), envisagée en dette comme un
  mécanisme à modéliser, n'a en réalité rien à modéliser côté moteur** : la brochure
  (p.132) est explicite, cette imputation est faite par le déclarant lui-même avant
  de remplir sa déclaration — les montants inscrits en `2VM`-`2VP` sont déjà nets de
  cette imputation, comme le reste du module qui ne recalcule jamais les montants
  CERFA. `2VM` (gains attachés à des primes versées avant le 27.9.2017, déjà soumis
  au prélèvement libératoire lors du versement) reste donc sans effet sur l'IR, même
  famille que `2XX` ; `2VQ`-`2VU` (reliquat de moins-value non imputée, par année
  d'origine) restent purement informatifs pour l'année suivante, même famille que
  `2TU`-`2TY`. 8 nouveaux tests (40 au total pour le fichier) couvrent `2VN` toujours
  barème, `2VO`/`2VP` selon le switch `2OP` sans aucun abattement partagé avec
  `2CH`/`2DH`/`2VV`/`2WW`, `2VM` sans effet, et la combinaison des trois régimes.
  Vérifié en base et à l'écran sur le compte réel : +10 000 € sur `2VN` → +3 000 €
  d'IR (TMI 30 %) ; +10 000 € sur `2VO` → +750 € d'IR (10 000 × 7,5 %, brut, sans
  abattement bien que `2CH`/`2DH`/`2VV`/`2WW` soient vides et l'abattement disponible)
  ; +10 000 € sur `2VP` → +1 280 € d'IR (10 000 × 12,8 %) ; valeurs nettoyées après
  vérification. **Exclues du calcul**
  (`CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL`), différées en dette faute de mécanisme fiabilisable
  sans session dédiée : `2UU` (total informatif à répartir entre `2VV`/`2WW`, déjà comptés — pas un
  montant additionnel) ; `2VM` et `2VQ`-`2VU` (voir ci-dessus, gains déjà taxés à la
  source ou reliquat purement informatif) ; `2TU`-`2TY` (pertes
  non imputées, pur report sans effet sur l'année en cours) ; `2CG`/`2BH`/`2DF`/`2DG`/`2DI`/`2EE`
  (lignes exclusivement PS/revenu fiscal de référence, les deux hors périmètre du module —
  **découverte notable** : `2DI` doit en outre être inclus dans `2DG` d'après la brochure, ce n'est pas
  un montant additif indépendant). Branché dans `useFiscalOverview.ts` (qui passe désormais
  `foyerInput.situationFamille` à la fonction) : `totalNetImposable` s'ajoute au revenu imposable
  France, `impotForfaitaire` au pool déjà sommé pour `calculerImpot.ts` (3VD/3VI/3VF,
  capital
  retraite 7,5 %). 32 tests couvrent le PFU sans option, l'abattement de 40 % avec option, le
  coefficient de 2GO dans les deux régimes, les frais et déficits conditionnés à l'option (avec
  plancher à 0), la combinaison des mécanismes, `2YY` toujours au barème, `2ZZ` selon le switch, `2XX`
  sans effet, l'abattement 4 600 €/9 200 € (célibataire/couple), l'ordre d'imputation
  `2CH`→`2DH`→`2VV`→`2WW`, `2CH` toujours au barème, `2DH` jamais dans le revenu imposable, le crédit
  d'impôt sur abattement inutilisé (indépendant de `2OP`), `2VV`/`2WW` selon le switch, et la
  non-inclusion des cases exclues. Vérifié en base et à l'écran sur le compte réel : +10 000 € sur `2DC`
  sans option barème → +1 280 € d'IR (10 000 × 12,8 %) ; avec option barème cochée → +1 800 € d'IR
  (6 000 € net après abattement 40 %, TMI 30 % du foyer de test) ; +4 000 € sur `2YY` (sans `2OP`) →
  +1 200 € d'IR (TMI 30 %) ; +4 000 € sur `2ZZ` (sans `2OP`) → +512 € d'IR (4 000 × 12,8 %) ; sur le
  foyer réel (couple marié, abattement 9 200 €) : +15 000 € sur `2CH` → +1 740 € d'IR (5 800 € net après
  abattement, TMI 30 %) ; +10 000 € sur `2DH` (2CH vide, abattement 9 200 € entièrement disponible) →
  **−690 € d'IR** (crédit d'impôt de 9 200 × 7,5 %, restitution confirmée à l'écran).
- **`src/lib/fiscalite/calculerImpot.ts` étendu pour porter le crédit d'impôt assurance-vie,
  restituable.** Nouveau paramètre optionnel `creditImpotAssuranceVie` (0 par défaut), imputé en tout
  dernier sur `impotNet`, après la décote et l'impôt forfaitaire, **sans plancher à 0** — le BOFiP
  (BOI-RPPM-RCM-20-10-20-50 §340) qualifie ce crédit de restituable (« s'il excède l'impôt dû,
  l'excédent est restitué ») : `impotNet` peut donc devenir négatif, ce qui représente une restitution
  au foyer plutôt qu'un impôt à payer. Premier mécanisme du module dans ce cas — tous les autres
  montants agrégés dans `calculerImpot.ts` (impôt forfaitaire, taux effectif) restent positifs ou nuls.
  4 tests dédiés (nul par défaut, déduction intégrale de l'impôt net, restitution en négatif,
  garde-fou si transmis négatif par erreur) ; les 46 tests existants du fichier restent inchangés
  (paramètre optionnel, comportement par défaut préservé).
- **Crédits d'impôt sur valeurs étrangères (2AB/2CK) — mécanisme de crédit d'impôt général sur
  l'impôt dû, désormais couvert, levant la réserve documentée en dette sur l'ordre face à la
  décote.** Vérifié brochure DGFiP IR 2026 p.134 (même rubrique « Crédits d'impôt sur valeurs
  étrangères », CGI art. 199 ter I a et b) : `2AB` (contrepartie de la retenue à la source étrangère
  sur valeurs mobilières, imputable sur convention fiscale, établissement payeur en France) — « s'il
  excède le montant de l'impôt dû, ce crédit d'impôt n'est pas restituable » ; `2CK` (prélèvement
  forfaitaire non libératoire déjà versé) — « il est déduit du montant de l'impôt dû par votre foyer.
  S'il excède ce montant, l'excédent vous sera restitué. » Recherche BOFiP complémentaire sur l'ordre
  de liquidation : quotient familial + plafonnement → décote → réductions d'impôt (dont réduction
  outre-mer, déjà en place) → crédits d'impôt et retenues non libératoires, **en tout dernier** — même
  niveau que `creditImpotAssuranceVie`, déjà positionné en dernier. Implémentation :
  `calculerRevenuCapitauxMobiliers.ts` expose désormais `creditImpotEtranger2AB`
  (non plafonné, ce module ne connaît pas l'impôt dû) et `creditImpotValeursEtrangeres2CK`, retirées de
  `CASES_CAPITAUX_MOBILIERS_EXCLUES_DU_CALCUL` ; `calculerImpot.ts` reçoit deux nouveaux paramètres
  optionnels (0 par défaut) imputés en tout dernier sur `impotNet`, avec un ordre précis entre eux :
  `2AB` (non restituable) est plafonné sur l'impôt restant dû (`impotApresDecote + impotForfaitaire`)
  **avant** que les crédits restituables (`2CK`, `creditImpotAssuranceVie`) ne le réduisent encore —
  sinon une partie de la restitution due à `2CK` aurait été perdue à tort en laissant `2AB` la
  consommer en premier. `2CK` et `creditImpotAssuranceVie` sont ensuite soustraits librement, sans
  plancher. 8 tests dédiés dans `calculerImpot.test.ts` (nuls par défaut, `2CK` restituable sans
  plafond, `2AB` plafonné sans jamais restituer à lui seul, priorité `2AB` avant `2CK` sur un impôt dû
  connu, cumul des trois crédits finaux, garde-fous si négatifs transmis par erreur) et 2 tests dans
  `calculerRevenuCapitauxMobiliers.test.ts` (exposition brute, indépendance du switch `2OP`, valeurs
  nulles par défaut). Vérifié en base et à l'écran sur le compte réel : +500 € sur `2CK` → **−500 €
  d'IR** (13 478 € → 12 978 €, restitution confirmée) ; +20 000 € sur `2AB` (excède largement l'impôt
  dû du foyer) → **0 €** d'IR exactement, jamais négatif (plafonné, non restitué) ; valeurs nettoyées
  après vérification.
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
- **Vision générale Fiscalité (`FiscaliteSection.tsx`/`FiscalDeclarationsCard.tsx`/
  `FiscalOverviewCard.tsx`/`TaxRateCard.tsx`) réalignée sur le langage visuel déjà utilisé ailleurs dans
  l'app plutôt que de rester un style « dashboard admin générique ».** Avant retravail : `Card` avec
  `border border-border` explicite (alors que le composant `Card` de base — `rounded-3xl bg-card`, sans
  bordure ni ombre — sert de socle à toutes les autres sections), lignes de détail en
  `flex justify-between text-sm` qui cassaient en wrapping illisible à largeur normale (ex.
  « Contributions sur les hauts revenus » coupé au milieu de « Non calculé »), icônes des déclarations
  fiscales importées mais jamais rendues dans le JSX (code mort), et surtout un donut à une seule
  tranche (« IR », valeur unique) — un `Pie` Recharts à une seule entrée se normalise toujours à 100 %
  de lui-même, donc l'anneau était plein en permanence quel que soit le montant, sans aucune information
  réelle. Corrigé en reprenant le pattern déjà en place dans le widget Fiscalité de la Vue d'ensemble
  (`Dashboard.tsx` : encart en dégradé `from-primary/10` pour le montant principal, lignes
  `bg-muted/30` avec puce ronde colorée) et le composant partagé
  [SectorsDonut](src/components/ui/sectors-donut.tsx) déjà utilisé par
  [PatrimoineChart.tsx](src/components/patrimoine/PatrimoineChart.tsx) : le donut affiche désormais la
  vraie composition du revenu net imposable (salaires/gains d'actionnariat/pensions, légende colorée,
  interaction hover/clic identique au reste de l'app) au lieu d'un anneau décoratif sans signification.
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
- **`src/lib/fiscalite/calculerPrelevementsSociauxCapitauxMobiliers.ts` — prélèvements sociaux (PS) sur
  le cadre 2 « Capitaux mobiliers » (Phase 1 du chantier PS, périmètre volontairement partiel).**
  Premier module d'un chantier plus large : calculer les PS (CSG/CRDS/prélèvement de solidarité) pour
  l'ensemble des cases existantes, catégorie par catégorie, plutôt qu'en un seul module monolithique —
  chaque catégorie de revenu a une assiette et un taux PS propres, souvent différents de l'assiette IR
  de la même case. **Salaires (cadre 1) hors périmètre par construction** : les cotisations salariales
  sont déjà prélevées en paie (URSSAF), 1AJ/1BJ etc. sont déjà nets — rien à recalculer côté IR.
  Pour les capitaux mobiliers : 17,2 % sur dividendes/revenus assimilés (2DC/2FU, sur leur montant
  **brut**, l'abattement de 40 % étant réservé à l'IR, art. 158-3 CGI), intérêts/produits sans
  abattement (2TS/2TR/2TT/2TQ/2TZ) et revenus réputés distribués (2GO). **2GO retenu sans la majoration
  de 25 %** qui s'applique pourtant côté IR (art. 158-7-2° CGI) : le Conseil constitutionnel (décision
  n° 2016-610 QPC) a jugé ce coefficient inapplicable à l'assiette PS — seule fonction du module à
  diverger explicitement de l'assiette IR de la même case. Indépendant de 2OP : les PS sont dus que le
  revenu soit finalement imposé au barème ou au PFU, contrairement à l'IR. 17,2 % et non 18,6 % malgré
  la hausse LFSS 2026 (CSG +1,4 point sur les revenus du capital financier) : cette hausse ne s'applique
  qu'aux « produits de placement perçus à compter du 1.1.2026 » (prélevés à la source pendant l'année,
  cas de 2DC/2TS...) — seuls les revenus « recouvrés par voie de rôle » (plus-values de cession de
  valeurs mobilières, non modélisées ici) basculent dès les revenus 2025 ; sans effet sur le périmètre
  actuel du module. **Exclus du calcul** (`CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE`) : tous les
  contrats d'assurance-vie/de capitalisation (2CH/2DH/2VV/2WW, 2XX/2YY/2ZZ, 2VM/2VN/2VO/2VP) — leur
  mécanisme de « taux historiques » (art. L136-7 CSS) prélève les PS au fil de l'eau (fonds euros) ou au
  dénouement (UC) selon le taux en vigueur à la date d'acquisition de CHAQUE fraction du gain, une
  donnée que seul l'assureur reconstitue à partir de l'historique du contrat — non reconstituable depuis
  le seul montant net déclaré sur le 2042, donc non modélisé plutôt que deviné (appliquer 17,2 % sur ces
  montants produirait un résultat régulièrement faux pour tout contrat antérieur à une hausse de taux).
  Branché dans `useFiscalOverview.ts` (`prelevementsSociauxCapitauxMobiliers`, champ séparé de `impot`,
  pas encore agrégé dans un total PS unique tant que les autres catégories ne sont pas couvertes) et
  affiché dans `FiscalOverviewCard.tsx` à la place du précédent « Prélèvements sociaux — Non calculé »
  (désormais scindé en deux lignes : le montant calculé pour les capitaux mobiliers, et une ligne
  « Non calculé » explicite pour salaires/pensions/gains d'actionnariat, qui restent des chantiers
  futurs). 8 tests couvrent l'assiette brute des dividendes, le pool intérêts/produits, la non-majoration
  de 2GO, l'indépendance vis-à-vis de 2OP, et l'exclusion des contrats d'assurance-vie/capitalisation.
- **`src/lib/fiscalite/calculerPrelevementsSociauxPensionsRetraitesRentes.ts` — prélèvements sociaux sur
  le cadre 1 « Pensions, retraites, rentes » (Phase 2 du chantier PS).** Deux mécanismes distincts :
  1. **Pensions classiques (1AS/1AZ/1AO/1AM + 1AL/1BL)** : CSG/CRDS/CASA à un taux qui dépend du RFR du
     foyer et de son nombre de parts — 0 % (exonération), 4,3 % (CSG 3,8 % + CRDS 0,5 %), 7,4 % (CSG
     6,6 % + CRDS 0,5 % + CASA 0,3 %) ou 9,1 % (CSG 8,3 % + CRDS 0,5 % + CASA 0,3 %, taux plein), sur le
     montant **brut** (l'abattement de 10 % de `calculerPensionsRetraitesRentes.ts` est réservé à l'IR).
     Seuils 2026 vérifiés (1 part : 13 047 €/17 056 €/26 471 € ; seuils croissant linéairement avec le
     nombre de parts — incréments constants vérifiés sur les paliers officiels 1/1,5/2/2,5/3 parts :
     +6 968 €/+9 110 €/+14 132 € par part entière — la formule reste donc exacte aux quarts de part que
     produit `calculerPartsFiscales.ts`, ex. résidence alternée).
     **Approximation assumée (validée en session)** : la loi utilise le RFR de l'année **N-2**, déjà
     connu de la caisse de retraite qui prélève un taux estimé à la source puis régularisé ; le module ne
     modélise aucun historique de RFR, et utilise le revenu imposable total de l'année **courante**
     calculée par l'app comme proxy du RFR — un second niveau d'approximation, également validé en
     session (le module ne calcule d'ailleurs pas de RFR au sens strict, qui réintègre certains
     abattements/exonérations, art. 1417 IV CGI ; le revenu imposable total sert de proxy à ce proxy).
  2. **Rentes viagères à titre onéreux (1AW/1BW/1CW/1DW + 1AR/1BR/1CR/1DR)** : régime du patrimoine, taux
     fixe de 17,2 % sur la même fraction imposable par tranche d'âge que l'IR (`FRACTION_IMPOSABLE_RENTE`,
     exportée de `calculerPensionsRetraitesRentes.ts` et réutilisée telle quelle) — **indépendant du RFR
     du foyer**, contrairement aux pensions classiques.
  **Exclus du calcul** (`CASES_PS_PENSIONS_HORS_PERIMETRE`) : **1AI/1BI (capital PER, versements
  volontaires déductibles)** — recherche complémentaire confirmant que la CSG/CRDS a déjà été prélevée à
  l'entrée sur le salaire brut ayant financé le versement (la déductibilité fiscale à l'IR ne s'étend
  jamais à l'assiette CSG/CRDS) : taxer à nouveau ce capital à la sortie serait une double imposition,
  point explicitement clarifié après la généralisation de la déductibilité par la loi Pacte. **1AT/1BT
  (capital retraite, option art. 163 bis CGI)** : le BOFiP confirme qu'une CSG est due sur ce capital
  (« CSG... entièrement non déductible pour le calcul de ce prélèvement »), mais sans préciser avec
  certitude si le taux suit le barème RFR des pensions classiques ou un mécanisme propre à l'option
  163 bis — non modélisé plutôt que deviné, à la différence de 1AI qui repose sur une réponse ferme.
  Branché dans `useFiscalOverview.ts` (`prelevementsSociauxPensionsRetraitesRentes`, `rfrApproxime` =
  `revenuImposableTotal`, `nombreParts` = `parts.nombreParts`) et affiché dans `FiscalOverviewCard.tsx`
  en une ligne dédiée. 16 tests couvrent les 4 paliers de taux, le relèvement des seuils par le nombre de
  parts, l'agrégation des pensions françaises/étrangères, l'assiette brute, la fraction par tranche
  d'âge des rentes, l'indépendance des rentes vis-à-vis du RFR, et l'exclusion de 1AI/1AT.
- **`src/lib/fiscalite/calculerPrelevementsSociauxGainsActionnariatSalarie.ts` — prélèvements sociaux
  sur le cadre 1 « Gains d'actionnariat salarié » (Phase 3 du chantier PS, périmètre le plus fragmenté).**
  Les recherches documentaires généralistes se sont révélées contradictoires entre sources sur les taux
  applicables (17,2 % contre 18,6 %, 8 % contre 9,7 % selon les articles pour les mêmes cases) — plutôt
  que d'arbitrer entre des sources en désaccord, le périmètre retenu s'appuie sur une **vérification
  empirique** : rapprochement ligne à ligne du détail du calcul PS (« Base CSG-CRDS », « Base
  prélèvement de solidarité », etc.) du simulateur officiel de l'impôt sur le revenu, fourni par
  l'utilisateur pour un compte réel (1TP=2 000 €, 1TT=15 000 €, 1TZ=8 000 €, 1NX=20 000 €, 1AY=10 000 €,
  1MP=5 000 €), avec les montants déclarés. Chaque base du détail officiel correspond exactement (à
  l'euro près) à l'une des cases déclarées, ce qui a permis de déduire le taux réel appliqué à chacune :
  1. **1TP/1UP + 1TT/1UT** : régime salarial — CSG 9,2 % + CRDS 0,5 % = 9,7 %. Confirmé pour 1TP par
     impots.gouv.fr (« l'excédent est soumis aux prélèvements sociaux au taux applicable aux salaires »)
     et vérifié empiriquement pour 1TT (base officielle « CRDS sur les revenus d'activité et de
     remplacement » = 15 000 € = montant exact de 1TT ; montants CSG/CRDS reconstitués à l'euro près :
     1 380 € et 75 €).
  2. **1NX/1OX (carried-interest non qualifiant)** : régime spécifique en 3 prélèvements distincts sur
     la même base — CSG (10,6 %) + CRDS (0,5 %) = 11,10 % (taux LFSS 2026, déjà applicable aux revenus
     2025 pour cette case car recouvrée par voie de rôle et non prélevée à la source pendant l'année,
     contrairement aux dividendes/intérêts qui restent à 17,2 % pour 2025 — voir Phase 1), prélèvement de
     solidarité 7,5 %, et contribution salariale spécifique 10 % — total combiné 28,6 %. Base officielle
     (« Base CSG-CRDS 11,10 % », « Base prélèvement de solidarité à 7,5 % », « Base contribution
     salariale de 10 % ») = 20 000 € = montant exact de 1NX sur les 3 lignes ; montants reconstitués à
     l'euro près (2 220 €, 1 500 €, 2 000 €). Cette découverte confirme rétroactivement le raisonnement
     de la Phase 1 sur la distinction « recouvré par voie de rôle » (18,6 % dès 2025) vs « prélevé à la
     source pendant l'année » (17,2 % jusqu'en 2025) — les deux catégories du module obéissent bien à des
     calendriers différents, cohérents entre eux.
  3. **1NY/1OY** : contribution salariale spécifique de 30 % (carried-interest soumis à ce régime,
     distinct de 1NX — non présent dans le compte réel testé, taux retenu par recherche indépendante,
     non vérifié empiriquement).
  4. **3VN** : contribution salariale de 10 % sur options/AGA (non présent dans le compte réel testé,
     même statut que 1NY).
  **Hors périmètre** (`CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE`) : **1TZ/1AY/1MP** — aucune des trois
  bases déclarées (8 000 €/10 000 €/5 000 €), ni aucune combinaison entre elles, ne réapparaît dans une
  quelconque base de prélèvement du détail officiel malgré des montants non nuls déclarés : ces gains
  sont vraisemblablement déjà prélevés à la source par l'établissement teneur de compte ou l'employeur
  au moment de l'opération, indépendamment de la liquidation de l'IR — non modélisé plutôt que deviné,
  cohérent avec l'absence totale de preuve contraire. **3VD/3VI/3VF/3VJ/3VK** (gains pré-28.9.2012) :
  aucune source trouvée avec certitude sur leur régime PS, non testés empiriquement. Branché dans
  `useFiscalOverview.ts` (`prelevementsSociauxGainsActionnariat`) et affiché dans `FiscalOverviewCard.tsx`.
  11 tests couvrent le rapprochement empirique exact avec le compte réel, chacun des 4 mécanismes
  isolément et cumulés, et l'exclusion des cases hors périmètre.

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
  `calculerRevenuExonereTauxEffectif.ts` + `calculerPensionsRetraitesRentes.ts` +
  `calculerPartsFiscales.ts` + `calculerImpot.ts`, consommés par `useFiscalOverview.ts`), couvrant les
  salaires, la part barème (dont le carried-interest non qualifiant, 1NX/1OX) et la part à taux
  forfaitaire des gains d'actionnariat salarié (3VD/3VI/3VF à 18 %/30 %/41 %), les pensions/retraites/rentes
  (abattement 10 % classique, capital PER sans abattement, capital retraite à 7,5 %, rentes viagères
  par tranche d'âge — taux vérifiés visuellement sur la brochure DGFiP et le BOFiP), et la méthode du
  taux effectif, et désormais le crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL,
  1AR/1BR/1CR/1DR — voir §2). 1GB/1HB (associés et gérants art. 62 CGI) est désormais couverte,
  intégrée au pool standard de `calculerRevenuSalaires.ts` (audit case par case du cadre 1, voir §2).
  **Reste hors calcul** : les revenus fonciers — voir §4.
- **Résolu — le simulateur IFI et le reste de l'écran Fiscalité n'affichent plus de montants d'IFI
  contradictoires.** `FiscalOverviewCard.tsx` affiche désormais « IFI : non calculé — voir le
  simulateur IFI » plutôt qu'un « 0 € » fixe qui contredisait le résultat du simulateur ouvert depuis
  le même écran. Les deux moteurs restent non rapprochés (aucun pont, cf. §4) mais l'écran ne prétend
  plus donner un second chiffre.

### 🟠 À surveiller (cas limite, peu probable)

- **Plafonnement du quotient familial — interaction non modélisée entre la case T (parent isolé) et une
  personne invalide à charge unique.** La brochure DGFiP (IR 2026, p.85) précise que lorsque le foyer
  ne compte à charge qu'une seule personne invalide et coche la case T, le plafond spécifique de
  4 262 € normalement associé à la case T ne s'applique pas aux 2 demi-parts de la personne invalide
  (qui restent plafonnées à 1 807 €/1 807 €+1 801 € chacune, comme dans le cas général). L'architecture
  actuelle de `calculerImpot.ts` (somme indépendante des `plafondUnitaire` de chaque majoration, sans
  connaissance des interactions entre majorations) ne peut pas représenter cette exception sans un
  changement plus large — non modélisé plutôt que deviné. Cas rare (célibataire/divorcé/séparé, case T,
  et aucun autre enfant/personne à charge que la personne invalide) : un écart resterait possible pour
  ce profil précis.
- **Crédit d'impôt égal à l'impôt français (1AF/1BF, 1AL/1BL, 1AR/1BR/1CR/1DR) : ordre exact face à la
  décote et à la réduction outre-mer non confirmé par le BOFiP consulté.** Le crédit est implémenté en
  réutilisant le mécanisme du taux effectif (imputé avant réduction outre-mer/décote), mathématiquement
  équivalent à la formule officielle du crédit **dans ce cas précis** — mais aucune source ne confirme
  explicitement que le crédit réel s'impute au même point du calcul pour tous les cas (foyers proches du
  seuil de décote, DOM-TOM). Un écart resterait possible pour ces profils limites. **1AF/1BF n'a pas
  d'option frais réels modélisée** (pas de case CERFA dédiée identifiée, contrairement à 1AC/1BC qui ont
  1AE/1BE) : seul l'abattement forfaitaire de 10 % standard est appliqué — hypothèse, pas une lecture
  certaine de la brochure. **1AF/1BF mélange sur le CERFA les non-résidents fiscaux et les résidents
  avec revenu étranger** : l'app ne modélise aucun statut non-résident (`foyer_fiscal` n'a que
  `lieuResidence` métropole/DOM-TOM, pas résident/non-résident) — seule la composante résident est
  pertinente ici, un non-résident fiscal utilisant l'outil obtiendrait un résultat non fiable (régime
  fiscal des non-résidents entièrement différent, hors périmètre du module). **Case 8TK (cadre 8,
  agrégation officielle du crédit toutes catégories confondues) non utilisée** : le calcul retenu
  applique la formule directement par catégorie sans passer par cette case pivot du CERFA — même
  résultat final, cheminement différent du papier.
- **Système du quotient (`0XX`, art. 163-0 A CGI) : seuls les revenus exceptionnels (coefficient fixe 4)
  sont couverts, pas les revenus différés (coefficient variable = nombre d'années + 1).** La 2042/2042-C
  n'a aucune case pour saisir ce nombre d'années — l'ajouter nécessiterait un champ hors CERFA, écarté
  pour ne pas deviner une règle métier sans validation. Un utilisateur déclarant un revenu différé
  (rappel de salaire, arriéré de loyer sur plusieurs années) dans `0XX` sera donc calculé avec le
  coefficient 4 au lieu du coefficient réel — écart d'autant plus important que le nombre d'années réel
  s'éloigne de 3. **Combinaison système du quotient × méthode du taux effectif non vérifiée contre un
  exemple BOFiP chiffré** (cas rare, les deux mécanismes coexistant simultanément) : le montant `0XX` est
  traité comme un revenu français à part entière pour la proratisation, choix cohérent mais non
  confirmé par une source officielle chiffrée — voir `calculerImpot.ts`.
- **Résolu — `calculerRevenuSalaires.ts` n'exclut plus 1GB/1HB du revenu net imposable.** L'exclusion
  reposait sur une hypothèse jamais vérifiée (« régime de frais professionnels particulier distinct,
  non arbitré ») : la brochure DGFiP (IR 2026, p.107) confirme que 1GB/1HB (associés et gérants art. 62
  CGI) suit exactement le même mécanisme d'abattement 10 %/frais réels que le reste du cadre 1, sans
  régime distinct — corrigé par l'audit case par case de ce cadre (voir §2). **1AF/1BF, 1AL/1BL et
  1AR/1BR/1CR/1DR (crédit d'impôt égal à l'impôt français) sont également couverts** (voir §2) — ce
  n'est plus une exclusion.
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
- **Résolu — `calculerGainsActionnariatSalarie.ts` applique désormais l'abattement forfaitaire de
  10 % à 1TP/1TT/1AY/1MP/3VJ.** Ancienne réserve (Phase 4, comportement conservé sans abattement faute
  de confirmation explicite dans la brochure/BOI-RSA-ES-20-10-20-20/BOI-RSA-BASE-30-50-10/FAQ
  officielle) levée par une recherche complémentaire ciblée : BOI-IR-DOMIC-10-20-20-30 (retenue à la
  source des non-résidents, art. 182 A ter CGI, mise à jour du 12.08.2025) confirme explicitement et
  textuellement le mécanisme pour ces 5 cases précisément, sur une assiette légalement définie comme
  identique à l'avantage imposable ordinaire — voir §2 pour le détail des sources et la citation
  exacte. 1TZ reste volontairement à l'écart (mécanisme différent et exclusif, abattement pour durée
  de détention déjà déduit du montant saisi).

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
  et 2.4)** : saisie des 19 paires de champs du cadre 1 (salaires, particuliers employeurs,
  abattements et exonérations spécifiques, associés/gérants art. 62 CGI, agents généraux d'assurance
  (salaires imposables et exonérés),
  droits d'auteur, autres revenus imposables, salaires de source étrangère, frais réels, indemnités
  pour préjudice moral, salariés impatriés, sommes exonérées du CET), persistance Supabase
  (`revenus_salaires`, une ligne par utilisateur), codes de case vérifiés contre la brochure
  officielle DGFiP — capture brute, sans moteur de calcul ; **gains d'actionnariat salarié (Phase
  2.3)** : saisie des 16 lignes couvrant stock-options, actions gratuites, carried-interest, BSPCE,
  management packages et le système du quotient (`0XX`) (cadre 1 de la 2042-C) ainsi que les options
  attribuées avant le 28.9.2012 (cadre
  3, incluses sur demande
  explicite malgré le changement de cadre), persistance Supabase (`gains_actionnariat_salarie`, table
  dédiée), codes vérifiés visuellement sur le CERFA — capture brute pour les gains eux-mêmes,
  **désormais calculée pour le système du quotient** (`0XX`, coefficient fixe 4, `calculerImpot.ts`,
  voir §2) ; **salaires
  et pensions exonérés retenus pour le calcul du taux effectif** : saisie des 5 lignes de l'encart
  CERFA dédié (2042-C, pages 99/116), persistance Supabase (`revenus_exoneres_taux_effectif`, table
  dédiée), codes vérifiés visuellement. **Méthode du taux effectif implémentée** dans `calculerImpot.ts`
  via `calculerRevenuExonereTauxEffectif.ts` (voir §2) — ce n'est plus une capture brute.
  **Carried-interest (barème, 1NX/1OX) et gains d'actionnariat à taux forfaitaire désormais couverts**
  (3VD/3VI/3VF à 18 %/30 %/41 %, via `calculerGainsActionnariatSalarie.ts::impotForfaitaire`, ajouté
  après décote dans `calculerImpot.ts` — voir §2) ; **pensions, retraites et rentes** : saisie des 7
  lignes du vrai cadre 1 CERFA « Pensions, retraites, rentes » plus les rentes viagères à titre onéreux
  ventilées par tranche d'âge (2042-K, pages 115-119), persistance Supabase (`pensions_retraites_rentes`,
  table dédiée), codes vérifiés visuellement, **et désormais intégrées au calcul de l'IR**
  (`calculerPensionsRetraitesRentes.ts` — abattement 10 % classique, capital PER sans abattement,
  capital retraite à 7,5 %, rentes viagères par tranche d'âge — voir §2).

  **Sous-phases 2.1 à 2.4 du bloc « Salaires » toutes terminées, ainsi que l'encart taux effectif et le
  cadre Pensions associés** : le cadre 1 de la 2042 est intégralement couvert par
  `RevenusSalairesForm.tsx`/`GainsActionnariatSalarieForm.tsx`/`RevenusExoneresTauxEffectifForm.tsx`/
  `PensionsRetraitesRentesForm.tsx`, à l'exception des colonnes C/D (dette assumée ci-dessous).
  **Calcul de l'IR (Phase 10) — salaires, gains d'actionnariat (part barème et part à taux
  forfaitaire), pensions/retraites/rentes (barème avec/sans abattement selon la ligne, capital retraite
  à taux forfaitaire, rentes viagères par tranche d'âge), méthode du taux effectif et réduction
  outre-mer couverts** : `calculerRevenuSalaires.ts` + `calculerGainsActionnariatSalarie.ts` +
  `calculerRevenuExonereTauxEffectif.ts` + `calculerPensionsRetraitesRentes.ts` +
  `calculerPartsFiscales.ts` + `calculerImpot.ts` (barème 2026, quotient familial, plafonnement
  art. 197 CGI, proratisation taux effectif, réduction d'impôt outre-mer art. 197 I 3° CGI, décote,
  impôt à taux forfaitaire carried-interest/gains historiques/capital retraite, TMI), branchés en temps
  réel sur `FiscalOverviewCard`/`TaxRateCard` via `useFiscalOverview.ts` (voir §2). **Revenus des
  valeurs et capitaux mobiliers (cadre 2 de la 2042)** : saisie des 45 cases numériques + `2OP`,
  regroupées en 6 catégories conformes à la déclaration en ligne impots.gouv.fr, persistance Supabase
  (`revenus_capitaux_mobiliers`, table dédiée). **Moteur de calcul branché** sur
  `useFiscalOverview.ts` : dividendes (`2DC`/`2FU`, abattement 40 % si option barème), revenus sans
  abattement (`2TS`/`2TR`/`2TT`/`2TQ`/`2TZ`), revenus réputés distribués (`2GO`, coefficient 1,25),
  frais/déficits (`2CA`/`2AA`-`2AR`, si option barème) — au barème si `2OP` coché, au PFU 12,8 % sinon
  (Phase 1) ; contrats d'assurance-vie de moins de 8 ans (`2XX` sans effet, `2ZZ` selon le switch `2OP`,
  `2YY` toujours au barème même sans option — Phase 2a) et de 8 ans et plus (`2CH`/`2DH`/`2VV`/`2WW`,
  abattement 4 600 €/9 200 € + crédit d'impôt restituable sur `2DH` — Phase 2b, voir §2) et gains de
  cession de bons/contrats (`2VN` toujours barème, `2VO`/`2VP` selon le switch `2OP`, jamais
  d'abattement — Phase 2c, voir §2)
  (`calculerRevenuCapitauxMobiliers.ts` + extension de `calculerImpot.ts`, voir §2). Reste hors calcul
  (dette, voir ci-dessous) : pertes/moins-values non imputées (purement informatives, reste du
  déclarant), lignes PS/RFR, crédits d'impôt imputables sur l'impôt dû. Prochaine étape de la feuille de
  route : un futur cadre 2042 (revenus fonciers, plus-values, etc.). **Prélèvements sociaux — chantier
  terminé pour les 3 phases identifiées** : `calculerPrelevementsSociauxCapitauxMobiliers.ts` couvre
  dividendes/intérêts/2GO à 17,2 % (Phase 1) ; `calculerPrelevementsSociauxPensionsRetraitesRentes.ts`
  couvre les pensions classiques (taux CSG/CRDS/CASA selon le RFR du foyer — approximé par le revenu
  imposable de l'année courante plutôt qu'un historique N-2, décision validée en session) et les rentes
  viagères à titre onéreux (17,2 % fixe, Phase 2) ; `calculerPrelevementsSociauxGainsActionnariatSalarie.ts`
  couvre 1TP/1TT (9,7 % salarial), 1NX (28,6 % combiné, carried-interest non qualifiant), 1NY et 3VN
  (contributions salariales 30 %/10 %, Phase 3 — périmètre établi par vérification empirique contre le
  simulateur officiel plutôt que recherche documentaire seule, les sources généralistes se contredisant
  sur cette catégorie). Voir §2 pour le détail des trois phases, y compris les cases hors périmètre de
  chacune (assurance-vie/capitalisation pour la Phase 1 ; capital PER 1AI et capital retraite 1AT pour la
  Phase 2 ; 1TZ/1AY/1MP et les gains historiques 3VD/3VI/3VF/3VJ/3VK pour la Phase 3, confirmé par
  l'absence de toute ligne PS correspondante dans la vérification empirique malgré des montants non nuls
  déclarés). Salaires (cadre 1, 1AJ etc.) volontairement exclus du périmètre PS pour les trois phases :
  déjà nets des cotisations salariales prélevées en paie, rien à recalculer côté IR.
- **Différé, déductible du code** :
  - **Revenus des valeurs et capitaux mobiliers — hors calcul (voir §2/§3)** :
    `2UU` (total informatif à répartir entre `2VV`/`2WW`, déjà comptés),
    `2VM`/`2VQ`-`2VU` (gains de cession déjà taxés à la source ou reliquat de
    moins-value purement informatif — voir §2, `2VN`/`2VO`/`2VP` désormais
    couverts, Phase 2c), `2TU`-`2TY` (pertes non imputées, sans effet sur l'année en
    cours), `2CG`/`2BH`/`2DF`/`2DG`/`2DI`/`2EE` (lignes PS/RFR, hors périmètre du module).
    `2AB`/`2CK` (crédits d'impôt sur valeurs étrangères) désormais couverts — voir §2. `2DM`
    (impatriés) et le bloc « précisions CDHR »
    (`2DK`/`2DL`/`2XY`/`2XZ`/`2XW`/`2VJ`/`2VK`/`2VL`/`2EF`/`2EG`/`2EH`/`8KD`-`8KG`/`8CD`) exclus même de
    la table `revenus_capitaux_mobiliers` — cas limite propre à la contribution différentielle sur les
    hauts revenus, non demandé.
  - **Système du quotient — revenus différés à coefficient variable** : seuls les revenus exceptionnels
    (coefficient fixe 4) sont couverts par `0XX`/`calculerImpot.ts` ; les revenus différés (coefficient =
    nombre d'années + 1) restent hors périmètre, faute de case CERFA pour saisir ce nombre — voir §2/§3.
  - Le choix entre abattement forfaitaire de 10 % (`1AJ`/`1BJ`) et frais réels (`1AK`/`1BK`) est
    désormais arbitré par `calculerRevenuSalaires.ts` (le plus favorable des deux est retenu
    automatiquement).
  - **Traitements et salaires — colonnes C/D (Phase 2.1, dette assumée)** : les revenus propres des
    personnes à charge (ex. enfants majeurs rattachés ayant leurs propres salaires) ne sont pas
    saisis — cas rare, traité dans une session ultérieure.
  - **Résolu — plafonnement du quotient familial pour la personne invalide à charge** : cette
    majoration (`calculerPartsFiscales.ts`) porte désormais un `plafondUnitaire` chiffré (scission en 2
    demi-parts, voir §2/§3). Reste non appliqué par `calculerImpot.ts` : le cumul de plusieurs
    majorations `plafondComplementaire` sur une même personne (architecture actuelle : somme
    indépendante des plafonds par ligne, pas d'agrégation par personne), et l'interaction entre le
    plafond spécifique de la case T (4 262 €) et une personne invalide à charge unique (voir §3).
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
