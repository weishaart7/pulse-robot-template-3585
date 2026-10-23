# Module Fiscalité

> Audit de fond produit le 2026-08-27, **de zéro** (aucun audit préexistant pour ce module — même
> situation que `docs/immobilier.md` et `docs/societes.md`). Méthode : lecture intégrale des 20
> fichiers du périmètre déclaré alors (pages, simulateur IFI historique, moteurs `lib/ifi/` et
> `lib/fiscal/`, depuis supprimés), plus les fichiers liés découverts en cours de route
> (`src/hooks/useFamilyData.ts`, `src/hooks/useSocietesIntegration.ts`), lecture du
> schéma réel en base via le MCP Supabase (`execute_sql` sur les colonnes/FK/policies/RLS des 7 tables
> `ifi_*` du projet `npypkocowjkszxtecxzq`, `get_advisors` sécurité), et `git log --oneline` sur les
> fichiers du périmètre. Toute valeur citée comme « en base » a été vérifiée par requête directe le
> 2026-08-27 (données réelles : 1 immeuble bâti, 1 immeuble non bâti, 2 passifs, 0 hypothèse
> enregistrée, 0 bien indirect, 0 bien professionnel exonéré, 0 ligne `ifi_hors_france`). L'IFI est
> désormais la déclaration 2042-IFI préremplie depuis Patrimoine et Passifs (§2, « Déclaration
> 2042-IFI ») ; le simulateur historique et sa saisie indépendante ont été supprimés.

## 1. Vue d'ensemble

L'onglet « Fiscalité » héberge **trois blocs largement indépendants, qui ne communiquent pas entre
eux**, malgré une UI qui les présente les uns au-dessus/à côté des autres :

1. **La déclaration 2042, regroupée derrière le bouton « 2042 - Déclaration générale »** : ouvre
   `Declaration2042Interface.tsx` (overlay plein écran + sidebar de sections, calqué sur le pattern
   du simulateur IFI historique, depuis supprimé — voir §2). Contient aujourd'hui cinq sections :
   - **Ménage — état civil et nombre de parts (Phase 1, fonctionnel)** : `MenageSection.tsx`
     (wrapper de `MenageForm.tsx` + `SyntheseFoyerFiscal.tsx`), adossé à la table Supabase
     `foyer_fiscal` et au moteur pur `src/lib/fiscalite/calculerPartsFiscales.ts`. Seul morceau du
     module qui calcule et persiste une donnée réelle, propre à l'utilisateur.
   - **Traitements et salaires — cadre 1 de la 2042, déclarants 1/2 (Phases 2.1, 2.2 et 2.4,
     fonctionnel)** : `RevenusSalairesForm.tsx`, adossé à la table Supabase `revenus_salaires` — le
     formulaire lui-même reste une simple capture de données (aucun calcul pendant la saisie), mais le
     revenu net imposable est désormais calculé en aval par le moteur pur
     `calculerRevenuSalaires.ts` (voir §2) ; codes de case vérifiés contre la brochure officielle
     DGFiP (2042-K/2042-C, revenus 2024). Inclut les frais réels (`1AK`/`1BK`, Phase 2.2) : le choix
     entre l'abattement forfaitaire de 10 % et les frais réels sur `1AJ`/`1BJ` est désormais arbitré
     automatiquement par `calculerRevenuSalaires.ts` (le plus favorable des deux, unique par
     déclarant pour l'ensemble de ses traitements et salaires — voir §2), ainsi que les cas
     spécifiques restants (Phase 2.4) : indemnités pour préjudice moral (`1PM`/`1QM`), salariés
     impatriés (`1DY`/`1EY`), sommes exonérées du CET (`1SM`/`1DN`) — ajoutées ici plutôt qu'à
     `gains_actionnariat_salarie` car elles appartiennent au même cadre 1 « Salaires » du CERFA, sans
     rapport avec les stock-options.
   - **Salaires & pensions exonérés retenus pour le calcul du taux effectif (fonctionnel)** :
     `RevenusExoneresTauxEffectifForm.tsx`, adossé à la table Supabase dédiée
     `revenus_exoneres_taux_effectif`, **distincte** de `revenus_salaires` (voir §2) — encart séparé
     du CERFA (2042-C, pages 99/116), mélangeant salaires et pensions, servant un mécanisme distinct
     (taux effectif appliqué au reste du revenu par convention fiscale internationale ou art. 81 A
     CGI, pas une base imposable en France). `1AF`/`1BF` (déjà dans `revenus_salaires`, Phase 2.1)
     désigne un mécanisme apparenté mais différent — crédit d'impôt égal à l'impôt français, pas taux
     effectif. **Les deux méthodes sont désormais implémentées** dans `calculerImpot.ts` (le crédit
     d'impôt réutilise le mécanisme du taux effectif — hypothèse mathématiquement équivalente dans ce
     cas, voir §3) ; le salaire exonéré (1AC/1AE) est calculé en pool commun avec 1AJ/1AK du même
     déclarant par `calculerRevenuSalaires.ts`, pas indépendamment (voir §2).
   - **Pensions, retraites et rentes — cadre 1 de la 2042, déclarants 1/2 (fonctionnel)** :
     `PensionsRetraitesRentesForm.tsx`, adossé à la table Supabase dédiée `pensions_retraites_rentes`,
     **distincte** de `revenus_exoneres_taux_effectif` (voir §2) — 7 lignes du vrai cadre CERFA
     « Pensions, retraites, rentes » (pensions/retraites/rentes, pensions de retraite en capital
     taxables à 7,5 %, pensions en capital des plans d'épargne retraite, pensions d'invalidité,
     pensions alimentaires perçues, pensions non-résidents/source étrangère avec crédit d'impôt,
     autres pensions étrangères), codes vérifiés visuellement sur la brochure DGFiP (2042-K, pages
     115-119). Le formulaire capture les données brutes ; le revenu net imposable (abattement 10 %
     classique, capital PER sans abattement, capital retraite à 7,5 %, rentes viagères par tranche
     d'âge) est calculé en aval par `calculerPensionsRetraitesRentes.ts` (voir §2). `1AH` (pensions
     étrangères exonérées, taux effectif) **reste** dans `RevenusExoneresTauxEffectifForm.tsx` — il
     n'appartient pas à ce cadre (aucun code en commun, mécanisme différent), décision explicite prise
     en session après vérification pour ne pas mélanger une case exonérée dans un cadre de revenus
     imposables.
   - **Gains d'actionnariat salarié — stock-options, actions gratuites, carried-interest (Phase 2.3,
     fonctionnel)** : `GainsActionnariatSalarieForm.tsx`, adossé à la table Supabase
     `gains_actionnariat_salarie`, **distincte** de `revenus_salaires` (voir §2). Mélange volontaire
     de codes du cadre 1 « Salaires, gains d'actionnariat salarié » et du cadre 3 « Plus-values et
     gains divers » du CERFA 2042-C (options attribuées avant le 28.9.2012) — même objet réel, scindé
     administrativement par date d'attribution sur le formulaire papier.
   - **Revenus des valeurs et capitaux mobiliers — cadre 2 de la 2042 (saisie brute, fonctionnel)** :
     `RevenusCapitauxMobiliersForm.tsx`, adossé à la table Supabase dédiée `revenus_capitaux_mobiliers`.
     45 cases numériques + `2OP` (case à cocher), regroupées en 6 catégories conformes à la déclaration
     en ligne impots.gouv.fr (pas au regroupement thématique du CERFA papier) — voir §2. Le formulaire
     capture les données brutes ; le revenu net imposable (dividendes, revenus sans abattement, revenus
     réputés distribués, assurance-vie < 8 ans et ≥ 8 ans, gains de cession de bons/contrats, PFU ou
     option barème selon `2OP`) est calculé en aval par `calculerRevenuCapitauxMobiliers.ts` (voir §2).

   - **Plus-values et gains divers — cadre 3 de la 2042-C (phases 3.1 et 3.2, fonctionnel)** :
     `PlusValuesGainsDiversForm.tsx`, adossé à la table Supabase dédiée `plus_values_gains_divers`
     (un montant par foyer, `user_id → auth.users(id) ON DELETE CASCADE`, RLS 4 policies). 27 cases :
     valeurs mobilières (`3VG`/`3SG`/`3VH`), abattement renforcé et départ à la retraite
     (`3UA`/`3SL`/`3VA`), PEA avant 5 ans (`3VT`), instruments financiers à 50 % (`3PI`), report
     150-0 D bis expiré (`3SB`), complément de prix (`3WE`), actifs numériques (`3AN`/`3BN`/`3CN`),
     plus-values immobilières pour le RFR (`3VZ`/`3VW`), BSPCE (`3SJ`/`3TJ`/`3TK`/`3SK`/`3TL`/`3TM`/
     `3PC`/`3PE`), impatriés (`3VQ`/`3VR`), capital-risque (`3VC`), PEAC (`3EX`). Calcul en aval par
     `calculerPlusValuesGainsDivers.ts` (voir §2, « Plus-values et gains divers »).

   - **Revenus fonciers — cadre 4 de la 2042 et de la 2042-C (phase 4.1, fonctionnel)** :
     `RevenusFonciersForm.tsx`, adossé à la table Supabase dédiée `revenus_fonciers_2042` (un montant
     par foyer, `user_id → auth.users(id) ON DELETE CASCADE`, RLS 4 policies). Saisie de `4BE`/`4BK`
     (micro-foncier), `4BL`, `4BY`, `4EA`/`4EB`, `4BN`/`4BZ` ; les cases `4BA` à `4BD` du régime réel y
     sont affichées en lecture seule depuis la 2044 de 2025 (composant `LectureLigne`). Calcul en aval
     par `calculerRevenusFonciers2042.ts` (voir §2, « Revenus fonciers saisis dans la 2042 »).

   - **Revenus des professions non salariées — cadre 5, 2042-C-PRO (phases 5.1 et 5.2,
     fonctionnel)** : `RevenusNonSalariesForm.tsx`, adossé à la table Supabase dédiée
     `revenus_non_salaries` (déclarants 1/2, `user_id → auth.users(id) ON DELETE CASCADE`, RLS 4
     policies). 16 paires de cases : versement libératoire (`5TA`/`5TB`/`5TE`), micro-BIC professionnel
     (`5KO`/`5KP`) et non professionnel (`5NO`/`5NP`), locations meublées non professionnelles
     (`5NG`/`5NH`/`5NI`, et `5NJ`/`5NK`/`5NL` soumises aux cotisations sociales), micro-BNC
     (`5HQ`/`5KU`), revenus à soumettre aux PS (`5HY`) ; phase 5.2 : régimes réels BIC/BNC professionnels
     et non professionnels, LMNP au réel, bénéfices agricoles micro et réel, plus-values professionnelles,
     brevets, revenus exonérés zonés, revenus de source étrangère, déficits antérieurs (178 cases au
     total). Codes vérifiés sur la brochure DGFiP IR 2026
     (« La 2042 C PRO et ses références », p. 163-182). Calcul en aval par `calculerRevenusNonSalaries.ts`
     (voir §2, « Revenus des professions non salariées »).

   Avant cette réorganisation, `MenageForm`/`SyntheseFoyerFiscal`/`RevenusSalairesForm` étaient montés
   à plat dans `FiscaliteSection.tsx`, en dehors de tout bouton « 2042 » (qui n'avait alors aucun
   `onClick`) — la section Fiscalité ne compte plus désormais qu'un seul point d'entrée vers ces
   formulaires.
2. **Un tableau de bord IR désormais branché sur les données réelles, couvrant les salaires (dont les
   salaires exonérés retenus pour le taux effectif), les pensions/retraites/rentes, les revenus des
   valeurs et capitaux mobiliers, et les gains d'actionnariat salarié (part barème et part à taux
   forfaitaire).**
   (`FiscaliteSection.tsx` → `FiscalDeclarationsCard`, `FiscalOverviewCard`, `TaxRateCard`) : liste de
   déclarations fiscales (2042, 2044, 2047, 2074, 2086, 2042-IFI), imposition totale détaillée et
   répartition du revenu imposable, taux marginal d'imposition et tranches. Le hook [useFiscalOverview.ts](src/hooks/useFiscalOverview.ts)
   agrège `foyer_fiscal` + `revenus_salaires` + `gains_actionnariat_salarie` +
   `revenus_exoneres_taux_effectif` + `pensions_retraites_rentes` + `revenus_capitaux_mobiliers`,
   calcule le revenu net imposable, le nombre de parts et l'impôt sur le revenu réel (voir §2), et
   alimente les deux cartes. L'IFI de la 2042-IFI ouverte pour l'année suivant les revenus s'ajoute à
   l'imposition totale (point 3 ci-dessous). Les gains d'actionnariat à taux forfaitaire (3VD/3VI/3VF) sont
   couverts, à taux proportionnel (18 %/30 %/41 %, hors barème) ; le carried-interest (1NX/1OX) rejoint
   désormais le barème comme un salaire ordinaire (voir « Bug corrigé » en §2 — 1NX/1OX n'est pas le
   carried-interest qualifiant du régime de faveur) ; les pensions/retraites/rentes le sont désormais
   aussi (abattement de 10 % classique, capital PER sans abattement, capital retraite à 7,5 %, rentes
   viagères par tranche d'âge — voir §2) ; les revenus des valeurs et capitaux mobiliers (cadre 2)
   également (dividendes, revenus sans abattement, revenus réputés distribués, assurance-vie < 8 ans et
   ≥ 8 ans, gains de cession de bons/contrats, PFU ou option barème — voir §2) ; seuls les revenus
   fonciers n'entrent pas encore dans ce calcul (voir §4).
3. **La déclaration 2042-IFI** (`DeclarationIFIInterface.tsx`, ouverte depuis le bouton « 2042-IFI »
   de `FiscalDeclarationsCard`) : écran plein format panneau de travail, sur le modèle de la 2044,
   prérempli depuis Patrimoine (actifs immobiliers) et Passifs (emprunts reliés), seules les
   surcharges étant enregistrées — voir §2, « Déclaration 2042-IFI ».

**Écrans** :

| Écran | Composant | Rôle |
|---|---|---|
| Fiscalité (page principale) | [FiscaliteSection.tsx](src/pages/fiscalite/FiscaliteSection.tsx) | Panneau de travail (comme Immobilier, Retraite) : en-tête à fil d'Ariane « Fiscalité / Vue d'ensemble », titre 24 px et rappel (revenus 2025, barème 2026, mention des valeurs par défaut tant que le foyer ou les revenus ne sont pas saisis), puis deux colonnes séparées par un filet : déclarations à gauche sur toute la hauteur, imposition totale puis taux marginal à droite — disposition historique conservée, cartes remplacées par des bandes bord à bord |
| Déclarations fiscales | [FiscalDeclarationsCard.tsx](src/pages/fiscalite/components/FiscalDeclarationsCard.tsx) | Liste par impôt (code CERFA en pastille, libellé, statut sous le libellé, chevron) ; « 2042 » ouvre `Declaration2042Interface` (statut : IR net ou « Foyer à compléter »), « 2044 » `Declaration2044Interface` (revenu foncier imposable, déficit 4BC ou « Non ouverte »), « 2042-IFI » `DeclarationIFIInterface` (IFI net, « Non assujetti » ou « Non ouverte ») ; 2047, 2074 et 2086 « À venir » |
| Déclaration 2042 (overlay) | [Declaration2042Interface.tsx](src/pages/fiscalite/components/Declaration2042Interface.tsx) → [Declaration2042Sidebar.tsx](src/pages/fiscalite/components/2042/Declaration2042Sidebar.tsx) | Panneau de travail plein écran comme la 2044 et la 2042-IFI : en-tête à fil d'Ariane (Fiscalité / 2042 / section active), recherche de case (⌘K), « Tout supprimer », Retour. Navigation taupe groupée par cadre du Cerfa (Foyer, Cadre 1, Cadre 2 — champ `groupe` de [declaration2042Sections.ts](src/pages/fiscalite/components/2042/declaration2042Sections.ts), config `{id, label, groupe, icon, component}`), avec en pied le résumé de l'impôt de la Vision générale (IR net, revenu net imposable, parts, TMI), rechargé à chaque changement de section. Chaque section dans un [Cadre2042.tsx](src/components/fiscalite/Cadre2042.tsx) : titre 20 px, rappel, lignes limitées à 980 px, barre « Enregistrer » collée en bas ; pas d'enregistrement global, chaque section garde sa propre sauvegarde |
| Ménage (section 2042) | [MenageSection.tsx](src/pages/fiscalite/components/2042/MenageSection.tsx) → `MenageForm.tsx` + `SyntheseFoyerFiscal.tsx` | Blocs en bandes taupe (situation du foyer, enfants à charge, autres personnes invalides, situations particulières avec la lettre de case T/L/P/F/W/S/G), une ligne par enfant ou personne ; synthèse du nombre de parts dans un encart taupe à droite (sticky), recalculée en direct pendant la saisie (avant même l'enregistrement) |
| Lignes de saisie (sections 2042) | [DeclarationLigne.tsx](src/components/fiscalite/DeclarationLigne.tsx) | Une ligne par case séparée par un filet, libellé à gauche, colonnes « Déclarant 1 / Déclarant 2 » sous un en-tête unique ; code de la case dans le champ (pastille lagon), montants formatés avec séparateur de milliers hors saisie (`CaseMontant`), cases à cocher alignées à droite ; sous-groupes en bande taupe |
| Traitements et salaires (section 2042) | [RevenusSalairesForm.tsx](src/components/fiscalite/RevenusSalairesForm.tsx) | 19 paires de champs déclarant 1/déclarant 2 (cadre 1 de la 2042, hors colonnes C/D et gains d'actionnariat), code officiel + libellé français côte à côte |
| Salaires & pensions exonérés — taux effectif (section 2042) | [RevenusExoneresTauxEffectifForm.tsx](src/components/fiscalite/RevenusExoneresTauxEffectifForm.tsx) | 5 lignes (`1AC`/`1BC`, `1GE`/`1HE` case à cocher, `1AE`/`1BE`, `1AH`/`1BH`, `RSE`/`RSF` texte libre), encart CERFA distinct (2042-C pages 99/116) — alimente désormais le taux effectif dans le tableau de bord IR (Vision générale) |
| Pensions, retraites et rentes (section 2042) | [PensionsRetraitesRentesForm.tsx](src/components/fiscalite/PensionsRetraitesRentesForm.tsx) | 7 lignes déclarant 1/déclarant 2 (`1AS`, `1AT`, `1AI`, `1AZ`, `1AO`, `1AL`, `1AM`) + rentes viagères à titre onéreux ventilées par tranche d'âge, pas déclarant (`1AW`/`1BW`/`1CW`/`1DW` rentes perçues, `1AR`/`1BR`/`1CR`/`1DR` non-résidents), vrai cadre 1 « Pensions, retraites, rentes » du CERFA (2042-K pages 115-119), hors colonnes C/D — saisie brute, revenu net imposable calculé en aval par `calculerPensionsRetraitesRentes.ts` |
| Gains d'actionnariat salarié (section 2042) | [GainsActionnariatSalarieForm.tsx](src/components/fiscalite/GainsActionnariatSalarieForm.tsx) | 16 lignes du CERFA (stock-options, actions gratuites, carried-interest, BSPCE, management packages, options pré-28.9.2012, système du quotient), regroupées par sous-bloc visuel ; champs à case unique sans colonne déclarant 2 pour `1TZ`/`1UZ`/`1WZ`/`1VZ`, `3VD`/`3VI`/`3VF`/`3VN` et `0XX`, conformément au CERFA |
| Revenus des valeurs et capitaux mobiliers (section 2042) | [RevenusCapitauxMobiliersForm.tsx](src/components/fiscalite/RevenusCapitauxMobiliersForm.tsx) | Cadre 2 de la 2042 (2042-K + 2042-C), 45 cases numériques + `2OP` (case à cocher, hors catégorie en pied de cadre) ; aucune colonne déclarant 1/déclarant 2 sur le CERFA — chaque case est un montant unique par foyer, contrairement au cadre 1 ; regroupées en 6 catégories conformes à la déclaration en ligne impots.gouv.fr : contrats d'assurance-vie ≥ 8 ans, < 8 ans, revenus ouvrant/n'ouvrant pas droit à abattement, autres revenus, gains de cession de bons et contrats — saisie brute, revenu net imposable calculé en aval par `calculerRevenuCapitauxMobiliers.ts` |
| Imposition totale | [FiscalOverviewCard.tsx](src/pages/fiscalite/components/FiscalOverviewCard.tsx) | Chiffre principal (IR + prélèvements sociaux calculés + IFI de la 2042-IFI ouverte) avec pastille TMI ; détail des impôts : IR toujours affiché (décote en note), autres lignes affichées si non nulles, celles à 0 € ou non calculées (PS sur salaires, IFI sans 2042-IFI, PS fonciers sans 2044) repliées sous « n autres lignes » (`LignesRepliees`) ; anneau `SectorsDonut` de la composition du revenu imposable, **taux moyen global (IR + PS, hors IFI) / revenu imposable** au centre ; liste « Revenu imposable et ce qu'il coûte » : par catégorie, montant et sous-ligne « IR ≈ … · PS … » — IR au barème (`impotApresDecote`) réparti au prorata des revenus soumis au barème (indicatif, barème progressif) plus l'impôt forfaitaire propre à la catégorie, PS calculés de la catégorie (salaires : prélevés en paie), crédits d'impôt non répartis, mention sous la liste ; catégories nulles et revenus non calculés repliés ; encadrés RFR, décote, impôt net |
| Taux marginal | [TaxRateCard.tsx](src/pages/fiscalite/components/TaxRateCard.tsx) | TMI en chiffre secondaire (22 px, l'imposition totale reste le chiffre principal de la page), barème 2026 en 5 tranches (tranche du foyer en lagon, repère du quotient familial), encadrés quotient familial et marge avant la tranche supérieure ; à côté, revenu net imposable, RFR, revenu exonéré retenu, parts, plafonnement, impôt net |
| Déclaration 2042-IFI (overlay) | [DeclarationIFIInterface.tsx](src/pages/fiscalite/components/DeclarationIFIInterface.tsx) → [SectionsIFI.tsx](src/pages/fiscalite/components/declarationIFI/SectionsIFI.tsx) | Sélecteur d'année (IFI N, N−1, N−2) ; actif (annexes 2 et 3), passif (annexe 4), dons et plafonnement, calcul tranche à tranche ; rail droit : IFI net et cases du Cerfa |

**Tables Supabase de la 2042-IFI** : `declarations_ifi` (une par foyer et par année d'imposition),
`declaration_ifi_actifs`, `declaration_ifi_dettes` — voir §2, « Déclaration 2042-IFI ». Les 7 tables
`ifi_*` du simulateur historique ont été supprimées (migration `20261023130000_drop_ifi_simulateur`,
vides et sans dépendance, vérifié juste avant).

**Table/moteur du foyer fiscal (Phase 1, quotient familial)** : `foyer_fiscal` (`user_id →
auth.users(id) ON DELETE CASCADE`, `UNIQUE(user_id)` — une ligne par utilisateur, comme
`marital_status` ; RLS 4 policies), sans FK vers Famille : la ligne reste la source du calcul, mais
le Ménage se préremplit depuis `family_profiles`/`marital_status`/`family_links` (voir « Reprise
depuis Famille » ci-dessous). Le calcul du nombre de parts est fait par
[src/lib/fiscalite/calculerPartsFiscales.ts](src/lib/fiscalite/calculerPartsFiscales.ts), fonction pure
couvrant l'art. 193-197 CGI (revenus 2025/impôt 2026) — voir §2. L'ancien dossier `src/lib/fiscal/`
(sans « ite ») a été supprimé : sa dernière fonction, `compterEnfantsFiscalementACharge`, ne servait
qu'à synchroniser `marital_status.nombre_enfants_charges`, colonne lue par aucun moteur.

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
fonciers (§4).

**Flux clés** :
- L'utilisateur clique « 2042-IFI » → `DeclarationIFIInterface` crée la déclaration de l'année et une
  ligne par actif et emprunt préremplis, l'utilisateur corrige ce qui doit l'être ; à la fermeture,
  `useFiscalOverview` recharge la déclaration (sans la créer) et ajoute son IFI net à l'imposition totale.
- La saisie du foyer fiscal (Ménage) et des salaires (Traitements et salaires) alimente désormais en
  temps réel `FiscalOverviewCard`/`TaxRateCard` via `useFiscalOverview` — un changement dans l'un des
  deux formulaires, une fois enregistré, se répercute sur le tableau de bord au prochain chargement de
  l'écran Fiscalité (pas de recalcul en direct pendant la saisie elle-même, contrairement à
  `SyntheseFoyerFiscal`).

## 2. Architecture & décisions

- **Navigation de la déclaration 2042 : pattern overlay + sidebar repris du simulateur IFI historique.**
  `Declaration2042Interface.tsx` reprend la mécanique de l'ancien `IFIInterface.tsx` (overlay
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
  1GF, 1GG, 1AP, 1AG, **1GB** et symétriques déclarant 2), puis applique le plus favorable entre
  l'abattement forfaitaire de 10 % (plancher 509 €, plafond 14 555 €, jamais supérieur à la base) et les
  frais réels (1AK/1BK). **1GA/1HA (abattement spécifique, journalistes/assistants maternels et
  familiaux) est purement informatif et n'est plus déduit de la base ici.** **Bug corrigé — 1GA/1HA
  était initialement soustrait de la base avant l'abattement de 10 %, ce qui double-comptait la
  déduction.** Trois sources concordantes (corrigetonimpot.fr, meilleurtaux.com) confirment que la case
  1GA « ne sert à rien dans les calculs » côté DGFiP : le contribuable est censé avoir déjà retranché ce
  montant de son salaire brut avant de le déclarer en 1AJ/1AA ; la case n'est là que pour documenter le
  montant, elle n'est pas réimputée par l'administration. Détecté par comparaison avec le simulateur
  officiel sur un compte réel (célibataire, 1 part) : base 1AJ/1AA/1GF/1AP/1AG/1GB = 62 500 €, 1GA =
  1 500 € → Kairos calculait à tort un revenu net imposable de 54 900 € (62 500 − 1 500, ×90 %) contre
  56 250 € (62 500 × 90 %) côté officiel, soit 405 € d'IR sous-évalués (écart × TMI 30 %). Le champ
  `abattementSpecifique`/`baseApresAbattementSpecifique` reste exposé dans `RevenuSalairesDeclarantDetail`
  pour affichage, mais n'entre plus dans le calcul de `netImposable`.
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
  deux dispositifs partagent la même case CERFA (`case1gh`/`case1hh`). **Exclues volontairement du calcul
  du revenu imposable** (`CASES_SALAIRES_EXCLUES_DU_CALCUL`) : 1PB/1PC, 1DY/1EY, 1SM/1DN, 1AQ/1BQ
  (exonérées d'IR par nature — mais retenues pour le RFR, voir `revenuExonereRetenuPourRFR` plus bas) et
  1GK/1GL (case informative « ne perçoit plus de salaires… », sans montant propre). 1GB/1HB, 1AF/1BF
  (crédit d'impôt égal à l'impôt français) et 1AD/1BD ne sont plus exclues, voir ci-dessous.
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
  **Bug corrigé — 1AC/1AE (salaires de source étrangère exonérés retenus pour le calcul du taux
  effectif, 2042-C) faisaient l'objet d'un choix 10 %/frais réels arbitré indépendamment de celui du
  salaire imposable en France (1AJ/1AK) du même déclarant**, alors que le même texte de brochure DGFiP
  déjà cité ci-dessus pour 1GB/1AF (IR 2026, p.107) s'applique : le choix forfaitaire/frais réels est
  unique « pour l'ensemble de ses activités » imposées selon les règles des traitements et salaires —
  sans distinction entre la part imposable en France et la part seulement retenue pour le taux effectif,
  puisque les deux relèvent de la même catégorie de revenu pour un même déclarant. Écart signalé par un
  utilisateur en comparant Kairos au simulateur officiel de la DGFiP sur un foyer marié : 1AJ = 50 000 €/
  1BJ = 20 000 € (aucun frais réels déclaré) et 1AC = 35 000 €/1AE = 4 000 € (frais réels sur le seul
  salaire exonéré) → Kairos annonçait 10 314 € contre 10 356 € au simulateur officiel. Cause exacte : en
  arbitrant 1AC/1AE isolément, les frais réels (4 000 €) l'emportaient sur l'abattement de 10 % pris sur
  35 000 € seuls (3 500 €) ; rapportés à la base commune du déclarant (1AJ + 1AC = 85 000 €),
  l'abattement forfaitaire de 10 % (8 500 €) est en réalité plus favorable que les 4 000 € de frais
  réels déclarés — le forfaitaire s'applique donc à l'ensemble du pool, y compris à la part exonérée
  (35 000 − 10 % = 31 500 € au lieu de 35 000 − 4 000 = 31 000 €). `calculerDeclarant` est étendu d'un
  5ᵉ paramètre optionnel `remunerationsExonereesTauxEffectif` (même mécanique de répartition
  proportionnelle que `remunerationsCreditImpot`/1AF ci-dessus, nouveau champ
  `netImposableExonereTauxEffectif`) ; `calculerRevenuSalaires` accepte désormais un second paramètre
  optionnel (1AC/1BC, 1AE/1BE) et combine les frais réels 1AK+1AE avant l'arbitrage, exposé dans le
  nouveau champ `salairesNetImposablesExoneresTauxEffectif`. Test de non-régression dédié :
  `regressionExempleUtilisateur.test.ts`, rejoue exactement ce cas de bout en bout
  (`calculerRevenuSalaires` → `calculerRevenuExonereTauxEffectif` → `calculerImpot`) et vérifie 10 356 €.
  **Bug corrigé — une fois les frais réels combinés (1AK+1AE) retenus comme plus favorables, la
  déduction résultante était répartie proportionnellement entre le pool France et le pool 1AC, au lieu
  de déduire le montant réel de chaque source sur sa propre base.** Le cas ci-dessus n'exerçait pas ce
  chemin (le forfaitaire y restait plus favorable), donc n'a rien détecté. Écart signalé par un
  utilisateur sur un foyer célibataire : 1AJ/1AA/1GF/1AP/1AG/1GB = 119 500 € (1AK = 12 000 €) et
  1AC = 10 000 €/1AE = 3 000 € → total frais réels 15 000 € > abattement forfaitaire 12 950 € (10 % de
  129 500 €) → frais réels retenus. Kairos annonçait 28 371 € (répartition proportionnelle : 15 000 €
  réparti au prorata 92,3 %/7,7 % entre les deux pools) contre 28 866 € au simulateur officiel (revenu
  net imposable 107 500 €, revenu mondial 114 500 € — soit 119 500 − 12 000 côté France et
  10 000 − 3 000 côté 1AC, chacun déduisant son propre montant). `calculerDeclarant` prend désormais
  `fraisReelsDomestique` (1AK/1BK) et `fraisReelsExonere` (1AE/1BE) séparément (au lieu d'un montant déjà
  combiné) : ils restent comparés **ensemble** à l'abattement forfaitaire pour l'arbitrage (choix unique
  par déclarant, inchangé), mais une fois les frais réels retenus, chacun est déduit de sa propre base —
  1AK du pool France + 1AF (qui n'a pas de case frais réels dédiée, hypothèse non vérifiée séparément
  faute de cas réel), 1AE du pool 1AC. Le cas forfaitaire n'est pas concerné (10 % restant linéaire,
  répartition proportionnelle et par source donnent le même résultat). Nouveau test de non-régression
  dans `regressionExempleUtilisateur.test.ts` rejouant ce cas de bout en bout, vérifie 28 866 €.
- **`src/lib/fiscalite/calculerRevenuExonereTauxEffectif.ts` — revenus exonérés retenus pour le calcul
  du taux effectif.** Fonction pure : ne calcule plus elle-même la part salaires (1AC/1BC) — elle reçoit
  ce montant déjà net d'abattement 10 %/frais réels en paramètre
  (`salairesNetImposablesExoneresTauxEffectif`), calculé par `calculerRevenuSalaires.ts` en pool commun
  avec 1AJ/1AK du même déclarant (voir « Bug corrigé » ci-dessus — `useFiscalOverview.ts` appelle donc
  `calculerRevenuSalaires` avant `calculerRevenuExonereTauxEffectif` et chaîne le résultat). 1AH/1BH
  (pensions de source étrangère) reçoivent l'abattement de 10 % standard applicable aux pensions
  (revenus 2025/impôt 2026) : plancher 454 €/pensionné (jamais supérieur à la pension elle-même),
  plafond **global** de 4 439 € pour l'ensemble du foyer (pas par pensionné — la somme des abattements
  individuels est plafonnée une fois calculée). **Bug corrigé** : la première version ajoutait ces
  pensions brutes, sans abattement, faute de module Pensions dans le repo pour calibrer un montant —
  l'abattement pension est en réalité un barème CGI autonome (indépendant de tout moteur de pensions
  françaises), pas une extension d'un module qui n'existe pas ; écart constaté par comparaison avec un
  autre logiciel (40 000 € de pension → 303 € d'écart d'impôt avant correction). 1GE/1HE (case à cocher
  marins-pêcheurs) et RSE/RSF (pays, texte libre) sont purement informatifs — listées dans
  `CASES_EXONERES_TAUX_EFFECTIF_EXCLUES_DU_CALCUL`, même pattern que
  `CASES_SALAIRES_EXCLUES_DU_CALCUL`/`CASES_GAINS_ACTIONNARIAT_EXCLUES_DU_CALCUL` (ajouté après un audit
  champ par champ, cf. §3). 9 tests couvrent le plancher/plafond de l'abattement pension (y compris le
  plafond global à deux pensionnés) et le total ; les tests d'abattement des salaires exonérés ont été
  déplacés dans `calculerRevenuSalaires.test.ts` (pool commun avec 1AJ, voir ci-dessus).
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
  **`revenuFiscalReference` (RFR, art. 1417 IV CGI), périmètre partiel.** Exposé dans `ImpotResult` et
  affiché en permanence (`FiscalOverviewCard.tsx`, `TaxRateCard.tsx`) — jusqu'ici le RFR n'était calculé
  nulle part dans le module. Base : `revenuMondialFictif` (revenu net imposable + revenu exonéré retenu
  pour le taux effectif + revenus exceptionnels soumis au système du quotient) + paramètre optionnel
  `revenuExonereRetenuPourRFR` (0 par défaut). **Bug corrigé — le RFR était initialement identique à
  `revenuMondialFictif`, sans réintégrer 1GH/1HH (heures supplémentaires/RTT) ni 1AD/1BD (prime de
  partage de la valeur), tous deux exonérés d'IR mais retenus pour le RFR.** Pour 1GH/1HH : art. 1417
  IV-1°-c CGI, confirmé par le BOFiP cité dans la brochure DGFiP : *« Les rémunérations exonérées d'IR
  sont toutefois prises en compte pour la détermination du revenu fiscal de référence du foyer [...] Ce
  montant est retenu uniquement pour le calcul du revenu fiscal de référence. »* Pour 1AD/1BD : même
  principe, confirmé par la presse spécialisée (meilleurtaux.com, impôt 2026) : *« Même lorsqu'elle est
  exonérée, la PPV entre dans le calcul de votre revenu fiscal de référence (RFR). »* Écart détecté par
  comparaison avec le simulateur officiel sur 2 cas réels : le RFR officiel dépassait le RFR Kairos d'un
  montant très proche de 1GH+1AD (5 202 € observés pour 1GH=3 000 €/1AD=2 200 €, soit 5 200 € attendus,
  écart résiduel 2 € ; 7 902 € observés pour 1GH=3 600 €/1AD=4 200 €, soit 7 800 € attendus, écart
  résiduel 102 €). `calculerRevenuSalaires` expose désormais `revenuExonereRetenuPourRFR` = la fraction
  de 1GH/1HH et 1AD/1BD **sous leurs plafonds respectifs** (7 500 €/personne pour 1GH/1HH ; 3 000 €,
  porté à 6 000 € par 1AV/1BV, pour 1AD/1BD) uniquement — la fraction qui excède ces plafonds est déjà
  taxable et donc déjà comptée via `totalNetImposable`, l'ajouter de nouveau ferait double emploi.
  Transmis à `calculerImpot` en dernier paramètre optionnel et additionné **seulement** à
  `revenuFiscalReference`, jamais à `revenuMondialFictif` (qui reste réservé au calcul de l'impôt
  lui-même — ces revenus n'entrent jamais dans l'assiette taxée ni dans le taux effectif). **Écart
  résiduel non expliqué (2 € et 102 € sur les 2 cas ci-dessus) : reste ouvert**, voir
  `regressionExempleUtilisateur.test.ts` (second cas, `revenuFiscalReference` attendu à 122 300 € pour un
  RFR officiel de 122 402 €).
  **Investigation approfondie de l'écart de 102 € : cause isolée, mais non résolue — piste abandonnée
  faute de source, le RFR n'étant qu'un indicateur secondaire (l'impôt lui-même reste exact).** En
  variant une seule case à la fois sur le cas réel ci-dessus (démarche par isolation, un cas de test
  minimal — 1AJ + 1AK seuls — puis ajout d'une case à la fois : 1AC/1AE, 1GH, 1AD, 1PB, 1AV, 1GA), le
  résidu **n'apparaît qu'après l'ajout de 1GB** : dès que 1GB pousse l'abattement forfaitaire calculé sur
  le seul pool France (10 % de la base France) au-dessus des frais réels réellement engagés
  (`case1ak`), le simulateur officiel semble calculer le « revenu net imposable » (part France,
  effectivement taxée) en optimisant la part France **indépendamment** de la part 1AC (retenue pour le
  taux effectif) — alors que le « revenu mondial » (qui détermine le taux) continue de refléter le choix
  unique poolé. Formule empirique qui colle exactement à ce cas (`baseFrance − max(forfaitaireFrance
  seule, fraisRéelsFrance seuls)` pour le revenu net imposable, vs `baseCombinée − max(forfaitaireTotal,
  fraisRéelsTotal)` pour le revenu mondial) — **mais aucune source (BOFiP BOI-IR-LIQ-20-30-30, art. 197 C
  CGI) ne la confirme ni ne l'infirme** : le seul exemple chiffré du BOFiP sur le taux effectif ne couvre
  qu'un cas 100 % exonéré, jamais un mélange France + exonéré comme ici. Cette formule contredirait par
  ailleurs le principe du choix unique déjà documenté et validé (voir le "Bug corrigé — 1AC/1AE"
  ci-dessus). **Non implémentée, faute de confirmation.**
  **Comparatif à 3 outils sur le cas réel (célibataire, 1GB inclus) : l'impôt est identique partout, le
  RFR diverge entre les outils eux-mêmes.** Kairos, le simulateur officiel IRPP et ClickImpôts donnent
  tous les trois 28 866 € d'impôt (revenu net imposable identique) mais des RFR différents : Kairos
  122 300 €, IRPP officiel 122 402 € (+102 €), ClickImpôts 123 280 € (+980 € — exactement 1PB en plus,
  rien d'autre, cohérent avec la réintégration de 1PB observée sur les cas isolés propres ci-dessous).
  Trois outils de référence qui ne s'accordent pas entre eux sur le RFR (878 € d'écart entre IRPP officiel
  et ClickImpôts) confirme que ce cas 1GB est une zone grise où même les simulateurs professionnels
  divergent. **Décision : l'écart est laissé en l'état** — l'impôt (la donnée réellement opposable) est
  exact, et le RFR de Kairos repose sur des sources primaires pour tout ce qu'il inclut ; l'écart résiduel
  est du même ordre de grandeur que la divergence entre outils de référence.
  **1PB/1PC (pourboires exonérés) réintégrés au RFR, sans plafond.** Confirmé par isolation empirique sur
  des cas de test propres, sans 1GB (nuxii.fr, corrigetonimpot.fr — « bien qu'exonérés d'impôt, ils
  entrent dans le calcul du revenu fiscal de référence ») : l'ajout de 1PB colle exactement à l'euro près
  (57 780 € = 56 800 € + 980 €, vérifié deux fois). **Un premier test sur un cas réel plus complet
  (incluant 1GB) avait semblé contredire cette réintégration** (écart de −578 €/−878 € en ajoutant
  1PB) — la démarche par isolation (voir ci-dessus) a montré que ce signal contraire était en réalité
  causé par l'écart distinct et non résolu propre à 1GB, pas par une vraie contradiction sur 1PB. Leçon
  retenue : un signal empirique contradictoire sur un cas complet peut être **pollué par une autre
  variable non isolée** — la démarche par isolation (une case à la fois) est nécessaire pour trancher
  fiablement, pas seulement une comparaison globale contre un simulateur.
  **`calculerRevenuCapitauxMobiliers.ts` étendu du même champ `revenuExonereRetenuPourRFR`.** Sur option
  barème (2OP), l'abattement de 40 % sur les dividendes (2DC/2FU) réduit `totalNetImposable` mais est
  réintégré dans le RFR — confirmé, art. 1417 IV 1° a CGI (l-expert-comptable.com) : *« L'abattement de
  40 % sur les dividendes [...] est expressément réintégré dans le RFR. »* Sans option barème, ce sont
  les bases imposées au PFU qui y sont ajoutées pour leur montant brut (art. 1417 IV 1° c CGI) : base à
  12,8 % (2DC/2FU sans abattement, 2TS/2TR/2TT/2TQ/2TZ, 2GO × 1,25, 2ZZ, 2WW net, 2VP) et base à 7,5 %
  (2VV net, 2VO) — `calculerImpot` ne recevant que le montant de l'impôt forfaitaire, jamais sa base. Sommé avec celui de `calculerRevenuSalaires.ts` dans `useFiscalOverview.ts` avant
  transmission à `calculerImpot`.
  **3 cases supplémentaires réintégrées au RFR dans `calculerRevenuSalaires.ts`, sans plafond (totalité
  du montant saisi) : 1AQ/1BQ, 1DY/1EY, 1SM/1DN.** Chacune confirmée par une source primaire (texte de
  loi ou BOFiP), pas seulement par la presse généraliste — leçon tirée du faux positif 1PB ci-dessus.
  **1AQ/1BQ** (agents généraux d'assurance, bénéfices exonérés au titre des zones franches
  urbaines/entreprises nouvelles, art. 44 sexies et s. CGI) : confirmé par le texte de loi lui-même
  (Légifrance, art. 1417 IV 1° b CGI — « du montant des bénéfices exonérés en application des articles
  44 sexies, 44 sexies A, 44 octies A, 44 octies B, 44 terdecies à 44 septdecies »). **1DY/1EY** (salariés
  impatriés, fraction exonérée, art. 155 B CGI) : confirmé par le BOFiP (BOI-RSA-GEO-40-10-40, §80) :
  *« L'ensemble du revenu exonéré d'impôt sur le revenu en application de l'article 155 B du CGI est donc
  pris en compte pour la détermination du revenu fiscal de référence. »* **1SM/1DN** (sommes exonérées
  issues du CET transférées vers un PERCO/PER d'entreprise) : confirmé par le BOFiP
  (BOI-RSA-CHAMP-20-30-40, §110/§130/§170), qui renvoie explicitement à l'art. 1417 IV 1° e CGI — «
  droits mentionnés aux articles L. 3152-4 et L. 3334-8 du code du travail » — correspondance exacte
  vérifiée avec le texte de loi.
  **`calculerRevenuCapitauxMobiliers.ts` étendu une seconde fois pour l'abattement assurance-vie sur les
  contrats ≥ 8 ans (2CH/2DH/2VV/2WW), avec deux niveaux de confiance différents.** **2DH, montant brut
  intégral** (confiance forte, BOFiP) : BOI-RPPM-RCM-20-10-20-50 §330, sur les produits ayant opté pour le
  prélèvement libératoire de 7,5 % sur primes antérieures au 27/09/2017 — *« Ces produits ne sont pas
  retenus pour l'établissement de l'impôt sur le revenu au titre du revenu net global (en revanche, ils
  sont retenus pour le calcul du revenu fiscal de référence). »* 2DH n'entrant nulle part ailleurs dans
  `RevenuCapitauxMobiliersResult` (ni `totalNetImposable`, ni `impotForfaitaire` — seul
  `creditImpotAssuranceVie` en dérive, via `abattementSur2dh`), c'est le **montant brut complet** qui est
  retenu, indépendamment de 2OP — pas seulement sa fraction d'abattement. **Abattement de
  4 600 €/9 200 € sur 2CH/2VV/2WW** (confiance moindre, source secondaire) : un exemple chiffré
  (avenuedesinvestisseurs.fr, sans texte de loi cité) montre un gain de 9 200 € intégralement couvert par
  l'abattement, PFU par défaut → *« votre RFR passera à 69 200 € (60 000 + 9 200 € de PV) »* — réintégré
  même sous PFU, cohérent avec le mécanisme déjà confirmé pour l'abattement de 40 % sur les dividendes.
  Réintégré quelle que soit la valeur de 2OP (`abattementSur2ch + abattementSur2vv + abattementSur2ww`,
  sans double compte avec 2DH compté en brut séparément).
  **Hors périmètre pour l'instant : les revenus imposés à taux forfaitaire hors barème** (gains
  d'actionnariat à taux historique, carried-interest, PFU/prélèvement forfaitaire libératoire sur
  capitaux mobiliers). Ces mécanismes n'exposent aujourd'hui que le montant d'impôt forfaitaire déjà
  agrégé (`impotForfaitaire`, plusieurs taux mélangés dans un même total), pas la base de revenu
  sous-jacente — l'inverser en divisant par un taux ne serait pas fiable. Les intégrer proprement
  nécessiterait d'exposer un nouveau champ « base forfaitaire » dans
  `calculerGainsActionnariatSalarie.ts`, `calculerPensionsRetraitesRentes.ts` et
  `calculerRevenuCapitauxMobiliers.ts` — repoussé à une itération ultérieure.
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
  le même diff. Le dossier `lib/fiscal/` a depuis été supprimé (sa dernière fonction alimentait
  `marital_status.nombre_enfants_charges`, que rien ne lit) : seul `lib/fiscalite/` subsiste.
- **`FiscalOverviewCard.tsx` et `TaxRateCard.tsx` sont désormais des écrans fonctionnels pour l'IR
  salaires, statiques pour le reste.** Les deux reçoivent `overview: FiscalOverview` en prop depuis
  `FiscaliteSection.tsx` (calculé une seule fois par `useFiscalOverview`) plutôt que d'appeler
  Supabase chacun de leur côté — évite un double fetch et une double implémentation du même résultat.
  Ce qui reste affiché sans calcul réel, explicitement labellisé comme tel plutôt que remplacé par un
  chiffre inventé : prélèvements sociaux, IFI sans 2042-IFI ouverte, revenus de
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
- **`src/lib/fiscalite/calculerPrelevementsSociauxCapitauxMobiliers.ts` — prélèvements sociaux (PS) sur
  le cadre 2 « Capitaux mobiliers » (Phase 1 du chantier PS, périmètre volontairement partiel).**
  Premier module d'un chantier plus large : calculer les PS (CSG/CRDS/prélèvement de solidarité) pour
  l'ensemble des cases existantes, catégorie par catégorie, plutôt qu'en un seul module monolithique —
  chaque catégorie de revenu a une assiette et un taux PS propres, souvent différents de l'assiette IR
  de la même case. **Salaires (cadre 1) hors périmètre par construction** : les cotisations salariales
  sont déjà prélevées en paie (URSSAF), 1AJ/1BJ etc. sont déjà nets — rien à recalculer côté IR.
  Pour les capitaux mobiliers : **18,6 %** sur dividendes/revenus assimilés (2DC/2FU, sur leur montant
  **brut**, l'abattement de 40 % étant réservé à l'IR, art. 158-3 CGI), intérêts/produits sans
  abattement (2TS/2TR/2TT/2TQ/2TZ), revenus réputés distribués (2GO), et tous les produits/gains de
  contrats d'assurance-vie/capitalisation non « soumis au prélèvement libératoire » (2CH, 2VV, 2WW,
  2YY, 2ZZ, 2VN, 2VO, 2VP — voir « Bug corrigé » ci-dessous). **2GO retenu sans la majoration de 25 %**
  qui s'applique pourtant côté IR (art. 158-7-2° CGI) : le Conseil constitutionnel (décision
  n° 2016-610 QPC) a jugé ce coefficient inapplicable à l'assiette PS — seule fonction du module à
  diverger explicitement de l'assiette IR de la même case. Indépendant de 2OP : les PS sont dus que le
  revenu soit finalement imposé au barème ou au PFU, contrairement à l'IR (vérifié empiriquement sur
  2GO/2CH et 2VV, 2OP décoché à chaque fois — non re-testé avec 2OP coché).
  **Exclues du calcul** (`CASES_PS_CAPITAUX_MOBILIERS_HORS_PERIMETRE`) : uniquement les cases
  explicitement libellées « soumis au prélèvement libératoire » sur le CERFA — 2DH, 2XX, 2VM — un
  mécanisme historique où le prélèvement, lors du versement, réglait définitivement IR *et* PS
  ensemble ; rien à recalculer.
  **Bugs corrigés — deux erreurs distinctes détectées par comparaison avec le simulateur officiel sur
  deux comptes réels d'un même utilisateur (foyer célibataire).**
  1. **Taux resté à 17,2 % (CSG 9,2 %) au lieu de 18,6 % (CSG 10,6 % + CRDS 0,5 % + solidarité 7,5 %,
     LFSS 2026).** La première version pensait cette hausse réservée aux « produits de placement perçus
     à compter du 1.1.2026 », les dividendes/intérêts 2025 restant au taux historique — mais le
     simulateur officiel affiche explicitement « CSG-CRDS 11,10 % » (10,6+0,5) sur ce type de revenu dès
     les revenus 2025. Cohérent avec la même règle déjà établie en Phase 3
     (`calculerPrelevementsSociauxGainsActionnariatSalarie.ts`) et en Phase 2
     (`calculerPrelevementsSociauxPensionsRetraitesRentes.ts`, voir plus bas) : un revenu recouvré par
     voie de rôle (déclaré dans la 2042 elle-même, jamais prélevé à la source pendant l'année) est déjà
     au taux 2026 dès les revenus 2025 — ce module ne l'avait pas reporté depuis sa découverte ailleurs.
  2. **2CH/2DH/2VV/2WW/2XX/2YY/2ZZ/2VM/2VN/2VO/2VP intégralement exclus des PS, sur l'hypothèse d'un
     « taux historique » non reconstituable (art. L136-7 CSS) pour l'ensemble de la famille
     assurance-vie/capitalisation — hypothèse invalidée par deux tests isolés.** Foyer célibataire,
     2OP décoché : 2GO=4 000 €/2CH=6 000 € → Kairos annonçait 744 € de PS (2GO seul, 18,6 %) contre
     1 860 € au simulateur officiel, soit exactement (2GO+2CH) × 18,6 % = 10 000 × 18,6 % — 2CH compté
     en totalité, montant BRUT, sans l'abattement de 4 600 €/9 200 € réservé à l'IR. Deuxième test,
     2VV=5 000 € seul (versements **postérieurs** au 27.9.2017, contrairement à 2CH) : le simulateur
     officiel affiche une base CSG-CRDS/solidarité de 5 000 € (le brut, pas les 400 € nets après
     abattement) → 930 € de PS, soit exactement 5 000 × 18,6 % — même comportement que 2CH malgré un
     régime IR différent (2CH toujours barème, 2VV suit le switch 2OP). Ces deux cases partagent un seul
     point commun sur le CERFA : ni l'une ni l'autre n'est libellée « soumis au prélèvement
     libératoire », contrairement à 2DH/2XX/2VM — c'est ce critère, pas la date du 27.9.2017, qui
     explique le résultat. **2WW/2YY/2ZZ/2VN/2VO/2VP suivent cette même règle par cohérence de libellé
     (aucune n'est « soumis au prélèvement libératoire ») mais n'ont pas été testées individuellement** —
     seuls 2CH et 2VV sont vérifiés empiriquement.
  Branché dans `useFiscalOverview.ts` (`prelevementsSociauxCapitauxMobiliers`, champ séparé de `impot`,
  pas encore agrégé dans un total PS unique tant que les autres catégories ne sont pas couvertes) et
  affiché dans `FiscalOverviewCard.tsx` à la place du précédent « Prélèvements sociaux — Non calculé »
  (désormais scindé en deux lignes : le montant calculé pour les capitaux mobiliers, et une ligne
  « Non calculé » explicite pour salaires/pensions/gains d'actionnariat, qui restent des chantiers
  futurs). 12 tests couvrent l'assiette brute des dividendes, le pool intérêts/produits, la
  non-majoration de 2GO, l'indépendance vis-à-vis de 2OP, l'inclusion au brut de 2CH/2VV et du reste de
  la famille non libératoire, et l'exclusion de 2DH/2XX/2VM ; 2 tests de régression
  (`regressionCapitauxMobiliers2GO2CH.test.ts`) rejouent les deux comptes réels de bout en bout
  (IR + PS) et vérifient les montants exacts du simulateur officiel.
- **`src/lib/fiscalite/calculerPrelevementsSociauxPensionsRetraitesRentes.ts` — prélèvements sociaux sur
  le cadre 1 « Pensions, retraites, rentes » (Phase 2 du chantier PS).** Un seul mécanisme calculé :
  **rentes viagères à titre onéreux (1AW/1BW/1CW/1DW + 1AR/1BR/1CR/1DR)**, régime du patrimoine, taux
  fixe de **18,6 %** sur la même fraction imposable par tranche d'âge que l'IR
  (`FRACTION_IMPOSABLE_RENTE`, exportée de `calculerPensionsRetraitesRentes.ts` et réutilisée telle
  quelle) — indépendant du RFR du foyer.
  **Bug corrigé — deux erreurs distinctes détectées par comparaison avec le simulateur officiel sur un
  compte réel (couple marié, 1AS=18 000 €/1BS=10 000 €/1AZ=6 000 €/1AO=4 800 €/1AM=3 000 € de pensions
  classiques, 1AT=40 000 €, 1AI=15 000 €, 1CW=12 000 € de rente viagère 60-69 ans).** Kairos annonçait
  4 629 € de PS contre 893 € au simulateur officiel (IR identique par ailleurs, 6 464 €). Décomposition
  du total officiel : 893 € = exactement 4 800 € (fraction imposable de 1CW, 40 %) × **18,6 %** (892,8 €
  arrondis) — les 41 800 € de pensions classiques ne contribuent **rien** au total officiel.
  1. **Taux des rentes viagères corrigé de 17,2 % à 18,6 %** : cohérent avec la règle établie en Phase 3
     (`calculerPrelevementsSociauxGainsActionnariatSalarie.ts`, carried-interest 1NX) — un revenu
     recouvré par voie de rôle (déclaré dans la 2042 elle-même, jamais prélevé à la source pendant
     l'année) est déjà au taux LFSS 2026 dès les revenus 2025. La première version de ce module (Phase 2)
     n'avait pas reporté cette règle, découverte seulement après coup en Phase 3.
  2. **Pensions classiques (1AS/1AZ/1AO/1AM + 1AL/1BL) et 1AT (capital retraite 163 bis) retirés du
     calcul, rejoignant 1AI en hors périmètre.** La Phase 2 initiale approximait le RFR (dont dépend le
     taux de CSG/CRDS/CASA sur les pensions, art. L136-8 CSS) par le revenu imposable de l'année
     **courante** calculé par l'app, faute d'historique N-2 modélisé — décision validée en session à
     l'époque. Cette approximation placait à tort le foyer test en tranche pleine (9,1 % sur un RFR
     proxy de 57 420 €), alors que le simulateur officiel — qui n'a lui-même **aucun accès à un vrai RFR
     N-2** dans une simulation ponctuelle — n'applique manifestement pas ce mécanisme du tout (0 % sur
     les pensions classiques). Le retour à « hors périmètre plutôt que deviné » (l'option initialement
     écartée au profit de l'approximation RFR) s'avère donc la seule cohérente avec le comportement
     observé de l'outil de référence — écart mesuré de 3 736 € sur ce compte, pas un simple bruit
     d'arrondi. Les seuils RFR par nombre de parts (formule linéaire vérifiée sur les paliers officiels
     1/1,5/2/2,5/3 parts) restent documentés dans l'historique git si ce mécanisme est un jour repris
     avec un vrai historique RFR.
  Branché dans `useFiscalOverview.ts` (`prelevementsSociauxPensionsRetraitesRentes`, signature simplifiée
  — ne prend plus que `pensionsInput`, `revenuImposableTotal`/`parts.nombreParts` ne lui sont plus
  transmis) et affiché dans `FiscalOverviewCard.tsx` en une ligne dédiée. 11 tests couvrent le taux de
  18,6 % sur chaque tranche d'âge (1AW-1DW et 1AR-1DR), le rapprochement empirique exact avec le compte
  réel (893 €), et l'exclusion des pensions classiques/1AI/1AT.
- **`src/lib/fiscalite/calculerPrelevementsSociauxGainsActionnariatSalarie.ts` — prélèvements sociaux
  sur le cadre 1 « Gains d'actionnariat salarié » (Phase 3 du chantier PS, périmètre le plus fragmenté).**
  Les recherches documentaires généralistes se sont révélées contradictoires entre sources sur les taux
  applicables (17,2 % contre 18,6 %, 8 % contre 9,7 % selon les articles pour les mêmes cases) — plutôt
  que d'arbitrer entre des sources en désaccord, le périmètre retenu s'appuie sur une **vérification
  empirique en deux temps** : rapprochement ligne à ligne du détail du calcul PS (« Base CSG-CRDS », etc.)
  du simulateur officiel de l'impôt sur le revenu, fourni par l'utilisateur pour un compte réel
  (1TP=2 000 €, 1TT=15 000 €, 1TZ=8 000 €, 1NX=20 000 €, 1AY=10 000 €, 1MP=5 000 €), **puis rapprochement
  du total PS du foyer affiché sur ce même compte (7 175 €) avec le total recalculé par le module**.
  1. **1TT/1UT** : régime salarial — CSG 9,2 % + CRDS 0,5 % = 9,7 %. Base officielle « CRDS sur les
     revenus d'activité et de remplacement » = 15 000 € = montant exact de 1TT ; montants CSG/CRDS
     reconstitués à l'euro près (1 380 € et 75 €).
  2. **1NX/1OX (carried-interest non qualifiant)** : régime spécifique en 3 prélèvements distincts sur
     la même base — CSG (10,6 %) + CRDS (0,5 %) = 11,10 % (taux LFSS 2026, déjà applicable aux revenus
     2025 pour cette case car recouvrée par voie de rôle et non prélevée à la source pendant l'année),
     prélèvement de solidarité 7,5 %, et contribution salariale spécifique 10 % — total combiné 28,6 %.
     Base officielle (« Base CSG-CRDS 11,10 % », « Base prélèvement de solidarité à 7,5 % », « Base
     contribution salariale de 10 % ») = 20 000 € = montant exact de 1NX sur les 3 lignes ; montants
     reconstitués à l'euro près (2 220 €, 1 500 €, 2 000 €).
     **La distinction envisagée ici en Phase 3** (« recouvré par voie de rôle » à 18,6 % dès 2025 vs
     « prélevé à la source pendant l'année » resté à 17,2 %, cette dernière catégorie censée couvrir les
     dividendes/intérêts de la Phase 1) **s'est révélée fausse a posteriori** : la Phase 1 a depuis été
     corrigée — dividendes/intérêts/2GO du cadre 2 sont eux aussi à 18,6 % dès 2025, vérifié
     empiriquement (voir plus haut). Le vrai critère qui sépare les deux taux n'est donc pas le
     calendrier de recouvrement mais un critère propre à chaque dispositif (pour le cadre 2 : « soumis
     au prélèvement libératoire » ou non, voir Phase 1 ci-dessus) — pas une règle générale transposable
     d'une catégorie de revenu à l'autre.
  3. **1NY/1OY** : contribution salariale spécifique de 30 % (carried-interest soumis à ce régime,
     distinct de 1NX — non présent dans le compte réel testé, taux retenu par recherche indépendante,
     non vérifié empiriquement).
  4. **3VN** : contribution salariale de 10 % sur options/AGA (non présent dans le compte réel testé,
     même statut que 1NY).
  **Bug corrigé — 1TP/1UP (rabais excédentaire) avait initialement été inclus dans le même pool salarial
  9,7 % que 1TT, sur la foi d'une source impots.gouv.fr affirmant le même régime (« l'excédent est
  soumis aux prélèvements sociaux au taux applicable aux salaires »).** Le rapprochement du total PS du
  foyer a révélé un écart de 194 € par rapport au total officiel (30 243 € calculés contre 30 049 €
  affichés, IR inclus) — écart qui correspond exactement à 2 000 € (1TP) × 9,7 %. En excluant 1TP du
  pool, le total recalculé (7 175 € de PS + 22 874 € d'IR = 30 049 €) correspond à l'euro près. La source
  documentaire décrit apparemment le régime légal du rabais excédentaire sans que ce prélèvement transite
  par la liquidation de l'IR dans ce cas précis — la vérification empirique du total prévaut sur la
  lecture documentaire isolée d'une case unique, qui n'avait pas révélé l'incohérence. **Hors périmètre**
  (`CASES_PS_GAINS_ACTIONNARIAT_HORS_PERIMETRE`) : **1TP/1TZ/1AY/1MP** — aucune des quatre bases
  déclarées (2 000 €/8 000 €/10 000 €/5 000 €), ni aucune combinaison entre elles, ne réapparaît dans une
  quelconque base de prélèvement du détail officiel malgré des montants non nuls déclarés, et le total du
  foyer se reconstitue exactement sans elles : ces gains sont vraisemblablement déjà prélevés à la source
  par l'établissement teneur de compte ou l'employeur au moment de l'opération, indépendamment de la
  liquidation de l'IR — non modélisé plutôt que deviné. **3VD/3VI/3VF/3VJ/3VK** (gains pré-28.9.2012) :
  aucune source trouvée avec certitude sur leur régime PS, non testés empiriquement. Branché dans
  `useFiscalOverview.ts` (`prelevementsSociauxGainsActionnariat`) et affiché dans `FiscalOverviewCard.tsx`.
  11 tests couvrent le rapprochement empirique exact du total du foyer (7 175 €), chacun des 4 mécanismes
  isolément et cumulés, et l'exclusion des cases hors périmètre (dont 1TP).
- **`FiscalOverviewCard.tsx` — le gros chiffre « Imposition totale » sommait uniquement l'IR, sans les
  PS désormais calculés (retour utilisateur après vérification sur le compte réel : PS invisibles du
  chiffre principal, seulement dans le détail).** Renommé « Imposition totale (IR + prélèvements
  sociaux calculés) », il additionne désormais `impot.impotNet` et les 3 totaux PS déjà branchés
  (capitaux mobiliers, pensions/retraites/rentes, gains d'actionnariat) — IFI et PS sur les salaires
  restent explicitement exclus (non calculés), précisé par une note sous le chiffre. Le détail par ligne
  (IR seul, puis chaque catégorie de PS) reste affiché en dessous, désormais avec l'IR comme première
  ligne du détail (auparavant seulement implicite dans le gros chiffre). Vérifié sur le compte réel :
  22 874 € (IR) + 7 175 € (PS gains d'actionnariat, seule catégorie non nulle pour ce compte) =
  **30 049 €**, identique au total du simulateur officiel.

### Plus-values et gains divers (cadre 3, phases 3.1 et 3.2)

Moteur pur `calculerPlusValuesGainsDivers(input, optionBareme)`, branché dans `useFiscalOverview.ts`
(barème, impôt forfaitaire, RFR, prélèvements sociaux, et la carte « Imposition totale » / Dashboard).

- **Option barème** : la case `2OP` du cadre 2 vaut pour les capitaux mobiliers ET les plus-values
  mobilières (option globale, art. 200 A CGI) ; elle n'est pas dupliquée au cadre 3. `3AN` suit sa
  propre option `3CN` (art. 150 VH bis CGI).
- **PFU (défaut)** : `3VG + 3WE`, `3UA − 3VA`, `3VT` et la moitié de `3PI` taxés à 12,8 % ; les
  abattements pour durée de détention `3SG`/`3SL` ne s'appliquent pas, l'abattement fixe `3VA` si.
- **Barème (2OP)** : les mêmes montants, nets de `3SG`/`3SL`/`3VA`, rejoignent le revenu imposable.
- **RFR** : bases imposées au PFU, abattements `3SG`/`3SL`/`3VA` réintégrés, `3VZ` et `3VW`.
- **Prélèvements sociaux 18,6 %** (CSG 10,6 % LFSS 2026 + CRDS 0,5 % + solidarité 7,5 %, applicable
  aux revenus du patrimoine 2025 ; revenus fonciers, plus-values immobilières et assurance-vie restent
  à 17,2 %) sur `3VG + 3UA + 3WE + 3AN`, avant tout abattement. `3VT` exclu (PS prélevés à la source
  sur le PEA), `3VZ`/`3VW` exclus (prélevés chez le notaire).
- **BSPCE** (art. 163 bis G CGI ; LF 2025 distingue gain d'exercice et gain de cession pour les titres
  souscrits depuis le 1.1.2025) : activité ≥ 3 ans — `3SJ`, `3TJ − 3TK`, `3TL − 3TM`, `3PC` suivent
  `2OP` (12,8 % ou barème), abattements fixes `3TK`/`3TM` réintégrés au RFR ; activité < 3 ans —
  `3SK`, `3PE` à 30 % sans option, retenus au RFR. PS 18,6 % sur l'ensemble avant abattement.
- **Autres régimes** : `3VQ` (moitié exonérée des impatriés, art. 155 B CGI) au RFR seulement ;
  `3VC` (capital-risque, exonéré d'IR) au RFR et aux PS 18,6 %.
- **Sans effet sur l'année** : `3VH` et `3BN` (moins-values déjà imputées par le déclarant avant
  saisie de `3VG`/`3AN`, reliquat reportable seulement), `3VR` (non imputable), `3EX` (exonéré,
  saisi pour information).
- **Hypothèses non vérifiées contre le simulateur officiel** (voir §3) : `3SB` toujours au barème ;
  `3PI` à 50 % suivant `2OP` ; `3PI`/`3SB` hors PS ; `3VW` retenu au RFR ; PS à 18,6 % sur les gains
  d'exercice `3PC`/`3PE` (régime des revenus du patrimoine) ; `3VQ` hors PS ; contribution salariale
  spécifique de 10 % évoquée par une source pour certains gains cédés du 16.2.2025 au 31.12.2027, non
  modélisée.
- **Hors périmètre (acté)** : exit tax (`3WM`…`3YA`) et report 150-0 B ter (`3WH`…`3WT`), rares et
  adossés aux 2074 ; non-résidents (`3SE`), non gérés par le logiciel.

### Revenus fonciers saisis dans la 2042 (cadre 4, phase 4.1)

Moteur pur `calculerRevenusFonciers2042(input, revenuFoncierReel)`, où `revenuFoncierReel` est le
revenu foncier net imposable de la 2044 de l'année (null sans 2044 ouverte). Branché dans
`useFiscalOverview.ts`, `FiscalOverviewCard.tsx` (ligne « Revenus fonciers » réel + micro, ligne
« Prélèvements sociaux (micro-foncier) ») et `Dashboard.tsx`.

- **4BE (micro-foncier)** : abattement de 30 % (art. 32 CGI), 70 % au barème ; PS 17,2 % sur ce net
  (revenus fonciers non concernés par la hausse de CSG de la LFSS 2026). Avertissement non bloquant si
  une 2044 est ouverte pour l'année ou si 4BE dépasse 15 000 €.
- **4BK / 4BL** (source étrangère, crédit d'impôt égal à l'impôt français) : fractions de 4BE (après
  abattement) et de 4BA (plafonnée au revenu foncier net de la 2044), jamais additionnées ; retirées du
  revenu imposable et ajoutées au revenu retenu pour le taux effectif, comme 1AF/1AL.
- **4EA / 4EB** : 4EA et 70 % de 4EB ajoutés aux revenus exonérés retenus pour le taux effectif, sans PS.
- **4BY** (amortissement Robien/Borloo neuf déduit) : réintégré au RFR seulement.
- **4BN / 4BZ** : informatives.
- **Hypothèse à confronter au simulateur** : 4BK soumis aux PS comme le reste de 4BE.

### Revenus des professions non salariées (cadre 5, phases 5.1 et 5.2)

Moteur pur `calculerRevenusNonSalaries(input)`, branché dans `useFiscalOverview.ts`,
`FiscalOverviewCard.tsx` (ligne « Revenus non salariés (BIC, BNC, BA) », ligne de PS « locations
meublées et non salariés ») et `Dashboard.tsx`.

- **Abattements** (recettes brutes saisies, abattement calculé, minimum 305 € par activité et par
  déclarant) : 71 % ventes (`5TA`, `5KO`, `5NO`), 50 % services et meublés classés ou à l'année
  (`5TB`, `5KP`, `5NP`, `5NG`, `5NI`, `5NJ`, `5NL`), 30 % meublés de tourisme non classés (`5NH`,
  `5NK`, loi Le Meur), 34 % BNC (`5TE`, `5HQ`, `5KU`).
- **Versement libératoire** (`5TA`/`5TB`/`5TE`) : impôt déjà payé ; net après abattement retenu pour le
  taux effectif (art. 197 C CGI), donc pour le RFR.
- **Prélèvements sociaux 18,6 %** (revenus du patrimoine 2025, LFSS 2026) : net des LMNP
  `5NG`/`5NH`/`5NI`, calculés d'office par la DGFiP, et `5HY`/`5IY` saisis tels quels. Aucun PS sur les
  revenus professionnels ni sur `5NJ`/`5NK`/`5NL` (cotisations sociales) ; les BIC/BNC non
  professionnels hors meublés n'en supportent que via `5HY`/`5IY` (brochure p. 182).
- **Seuils** (alertes non bloquantes, confirmés brochure IR 2026 p. 168-170) : 188 700 € ventes et
  77 700 € services + BNC, par déclarant ; 77 700 € toutes locations meublées non professionnelles et
  15 000 € meublés non classés, par foyer ; 120 000 € micro-BA par déclarant (moyenne triennale,
  appréciée ici sur l'année).
- **Régime réel** (phase 5.2) : bénéfice ou déficit saisi tel que calculé par la comptabilité ; les
  cases « dont plus-values / moins-values à court terme » du réel, déjà comprises dans le bénéfice, ne
  sont pas saisies.
  - BIC et BNC professionnels (`5KC`/`5KF`, `5QC`/`5QE`) : déficits et moins-values à court terme du
    micro imputables sur le revenu global (`totalNetImposable` peut être négatif).
  - BIC et BNC non professionnels (`5NC`/`5NF`, `5JG`/`5JJ`) : déficits de l'année et antérieurs
    (`5RN`…`5RW`, `5HT`…`5MT`) imputables sur la seule catégorie, plancher 0.
  - LMNP au réel (`5NA`, `5NM` soumis aux cotisations) : déficits `5NY`/`5WE` et antérieurs
    (`5GA`…`5GJ`, 2015-2024) sur les seuls revenus LMNP ; PS 18,6 % sur le net hors cotisations.
  - Bénéfices agricoles : micro-BA à 87 % (minimum 305 €), réel `5HC` ; déficits antérieurs
    (`5QF`…`5QQ`) sur les seuls BA ; déficit de l'année (`5HF`/`5IF`) retranché du revenu global dans
    `useFiscalOverview.ts` seulement si les autres revenus nets du foyer n'excèdent pas 128 826 €
    (`SEUIL_DEFICIT_AGRICOLE`, art. 156 I 1° CGI, brochure IR 2026 p. 165).
- **Plus-values à long terme** (micro et réel, 10 paires de cases) : 12,8 %, RFR, PS 18,6 % calculés
  d'office (brochure p. 182) ; moins-values à long terme reportables, sans effet.
- **Brevets** (`5HA`, `5UI`, `5QA`) : 10 % (art. 238 CGI), RFR, sans PS.
- **Revenus exonérés zonés** (`5XA`, `5HB`, `5KN`, `5KB`, `5NN`, `5NB`, `5HP`, `5QB`, `5TH`, `5HK`) : RFR.
- **Source étrangère avec crédit d'impôt égal à l'impôt français** (`5AK`, `5DF`, `5UR`, `5EY`, `5XJ`,
  `5XS`) : hors barème, retenus pour le taux effectif (comme 1AF).
- **Hors périmètre (acté)** : brevets BIC et BNC non professionnels, jeunes créateurs et jeunes
  agriculteurs, moyenne triennale et revenu au taux marginal (BA), paiement fractionné, agents généraux
  d'assurance, coupes de bois, durée d'exercice et cessation, ECF, colonne personne à charge,
  réductions et crédits d'impôt de la 2042-C-PRO.
- **Approximation** : les « revenus nets d'autres sources » du seuil agricole sont approchés par le
  revenu imposable du foyer hors déficit agricole.

### Charges déductibles (cadre 6, phase 6.1)

Moteur pur `calculerChargesDeductibles(input, revenuBrutGlobal)` (table `charges_deductibles`), où
`revenuBrutGlobal` est le revenu imposable des cadres 1 à 5, déficit agricole imputé. Branché dans
`useFiscalOverview.ts` (`revenuImposableTotal = revenuBrutGlobal + incidenceRevenuImposable`) et
`FiscalOverviewCard.tsx` (lignes 6GH, déficits antérieurs, charges).

- **Ordre (art. 156 CGI)** : 6GH ajouté, puis déficits globaux antérieurs `6FA`…`6FL` (les plus
  anciens d'abord), puis les charges ; le revenu ne descend jamais sous 0, le reliquat de charges est perdu.
- **Pensions alimentaires** : `6EL`/`6EM` et `6GI`/`6GJ` plafonnés à 6 855 € par enfant
  (`PLAFOND_PENSION_ENFANT_MAJEUR`) ; `6GU`/`6GP` en totalité.
- **Épargne retraite** : min(`6NS + 6RS`, `6PS`) par déclarant ; avec `6QR`, plafonds additionnés.
  Montant effectivement imputé (réputé imputé en dernier) réintégré au RFR (art. 1417 IV 1° a CGI).
  `6QW`, `6OS`/`6OT`, `6QS`/`6QT` informatifs (plafond saisi tel que sur l'avis ou recalculé).
- **Autres** : `6DE`, `6DG`, `6DD` en totalité ; `6EU` plafonné à 4 003 € × `6EV`
  (`PLAFOND_ACCUEIL_PERSONNE_AGEE`, 1 personne si `6EV` vide) ; `6HP`+`6HQ`+`6HR` plafonnés à 25 000 €.
- **À confirmer brochure IR 2026** : 6 855 € et 4 003 € sont dérivés des montants revenus 2024
  (6 794 € et 3 968 €) revalorisés de 0,9 % (LF 2026, comme le barème).
- **Hors périmètre (acté)** : colonne personne à charge (`6NU`, `6RU`, `6PU`, `6OU`, `6QU`), comme au cadre 5 ;
  déficit global de l'année reportable non calculé.

### Déclaration des revenus fonciers 2044

[calculerDeclaration2044.ts](src/lib/fiscalite/calculerDeclaration2044.ts) (testé dans
`calculerDeclaration2044.test.ts`) reproduit ligne à ligne le Cerfa 2044 n° 50156#30 (revenus 2025),
régime réel uniquement (le micro-foncier, case 4BE, n'en relève pas : choix du régime dans
`foncierFoyer.ts`, module Immobilier). Moteur pur.
- **Entrées** : la 2044 porte le **réalisé** de l'année de revenus, prérempli depuis Immobilier et
  Actifs/Passifs puis surchargeable (préremplissage hors du moteur, voir plus bas) ; par immeuble les lignes 211 à 230, 250 et 262 (nombre de locaux pour le forfait de 20 €
  de la ligne 222 — au moins un local par immeuble, forfait toujours déduit même sans saisie, taux en % pour la déduction spécifique 228 appliquée à la ligne 215) ; par part de
  société ou FPI les lignes 111 à 113 de l'attestation ; les déficits antérieurs non imputés (colonne A
  de la rubrique 450).
- **Calcul** : chaque ligne est arrondie à l'euro (pas de centimes sur le formulaire) ; 240 = 221 à
  229 − 230 ; 263 = 215 − 240 − 250 + 262 ; 420 = case D (parts) + case I (immeubles).
- **Répartition du déficit (430)** : cas 435 si les intérêts (432) dépassent les revenus bruts (431,
  réintégrations 262 comprises) — charges hors intérêts imputables en 436, excédent en 437, intérêts
  non couverts en 438 ; sinon cas 440 — 441 = déficit dans la limite du plafond, 442 = excédent.
  Plafond = **10 700 € + dépenses de rénovation énergétique (ligne 434 = 112bis + 224bis), au plus
  21 400 €** (formule du Cerfa, et non un plafond forfaitaire de 21 400 €).
- **Déficits antérieurs (450)** : seuls les déficits des 10 années précédentes figurent (2015 à 2024
  pour les revenus 2025) ; imputés du plus ancien au plus récent sur le bénéfice de la ligne 420,
  colonnes « imputé » et « restant au 31/12 ». Ligne 451 = total non imputé au 31/12 de l'année
  précédente.
- **Report 2042** : 4BA = bénéfice 420 ; 4BC = 436 ou 441 ; 4BB = 439 ou 442 ; 4BD = 451.
  `revenuFoncierNetImposable` (4BA après imputation des déficits antérieurs) est informatif : ce
  calcul est fait par l'administration.
- **Persistance** (migration `20261023100000_declaration_2044.sql`, service
  [declaration2044Service.ts](src/services/declaration2044Service.ts), testé) : `declarations_2044`
  (une par `user_id` et `annee`, créée à la première ouverture par `getOrCreate`),
  `declaration_2044_immeubles` (lignes 211 à 262) et `declaration_2044_parts` (lignes 111 à 113). FK
  `user_id` → `auth.users`, `declaration_id` → `declarations_2044` et `asset_id` (facultatif : immeuble
  ou part saisi sans actif) → `assets`, toutes en `ON DELETE CASCADE` ; RLS par utilisateur ; un actif
  au plus une fois par déclaration. **Seules les surcharges sont stockées** : une colonne de montant à
  NULL = valeur préremplie (calculée à l'affichage depuis Immobilier / Actifs-Passifs), une valeur =
  montant saisi, 0 compris ; fusion par `toImmeuble2044Input` / `toPartSociete2044Input`. Conséquence
  de la cascade : supprimer un actif supprime aussi sa ligne dans les 2044 des années passées.
- **Rubrique 450** : pas de table propre ; elle lit le stock unique `deficits_fonciers_reportes`
  (`deficitFoncierService`), partagé avec la synthèse foncière d'Immobilier, regroupé par année
  d'origine. Colonne A (non imputé au 31/12/N-1) = restant actuel + imputations enregistrées sur les
  années N et suivantes (`toDeficitsAnterieurs2044`, [declaration2044Donnees.ts](src/services/declaration2044Donnees.ts)) :
  table `deficit_foncier_imputations` (migration `20261023110000`, FK `deficit_id` et `user_id` en
  CASCADE, RLS), alimentée par « Reporter le solde à l'année suivante » d'Immobilier
  (`reporterAlAnneeSuivante`, une ligne datée par déficit consommé). Les reports appliqués avant la
  création de cette table n'ont pas d'historique : leur consommation n'est pas reconstituée.
- **Préremplissage** ([preremplissage2044.ts](src/lib/fiscalite/preremplissage2044.ts), testé ;
  assemblage dans [declaration2044Donnees.ts](src/services/declaration2044Donnees.ts), `chargerDonnees2044`) :
  ouvrir la 2044 d'une année crée une colonne reliée (`asset_id`) pour chaque actif éligible absent —
  immeubles loués nus en direct (`estBienNuEnDirect`) côté propriétés ; parts de SCI louées nu et parts au
  régime des revenus fonciers (SCPI, groupements) côté sociétés. Un actif retiré n'est pas recréé mais
  sa colonne reste. Montants à la part du foyer (`computeQuotePart`) :
  - 211 = loyers annualisés d'Immobilier ;
  - charges classées par mots-clés du libellé (`classerCharge` : taxe(s) foncière(s) → 227, assurance /
    PNO → 223, copropriété / syndic → 229, gestion / agence / honoraires → 221, travaux / entretien /
    réparation → 224 ; sinon 221 avec mention « classement à vérifier » sous la grille) — le champ
    `type_charge` n'est pas utilisé (mal renseigné en base). Charge récurrente annualisée ; ponctuelle
    retenue seulement si datée dans l'année ;
  - 250 = intérêts + assurance des échéances de janvier à décembre de N : tableau d'amortissement du
    contrat (`contratDepuisEmprunt` / `construireTableau`) pour un emprunt Patrimoine relié au contrat
    complet, intérêts capitalisés d'un différé total exclus ; emprunt relié sans contrat complet → 12
    prochaines échéances, signalé à l'écran ; sans emprunt relié → champs Financement du bien ;
  - parts : SCPI / groupements → 111 = revenus distribués des 12 derniers mois (approximation de
    l'attestation, signalée) ; parts de SCI louées nu → loyers, charges et intérêts du bien à la quote-part.
- **Reprise dans l'impôt** (`revenusFonciersPour2042`, testé ; branchée dans
  [useFiscalOverview.ts](src/hooks/useFiscalOverview.ts)) : seule une 2044 **déjà ouverte** pour les
  revenus 2025 (année du barème, `ANNEE_REVENUS`) compte — la Vision générale ne la crée jamais. Revenu
  foncier net (4BA − déficits antérieurs imputés) ajouté au revenu imposable, 4BC retranché, 4BB sans
  effet sur l'année ; prélèvements sociaux à 17,2 % du revenu foncier net, ajoutés à l'imposition totale
  et détaillés (« Prélèvements sociaux (revenus fonciers, 2044) »). Vision générale rafraîchie à la
  fermeture de la 2044. Si 4BC dépasse les autres revenus, le revenu imposable est ramené à 0 : le
  déficit global reportable 6 ans (art. 156 I CGI) n'est pas modélisé.
- **Interface** ([Declaration2044Interface.tsx](src/pages/fiscalite/components/Declaration2044Interface.tsx),
  ouverte depuis la ligne « 2044 » de `FiscalDeclarationsCard`) : plein écran au format panneau de travail
  (en-tête à fil d'Ariane, sélecteur « Revenus N » sur les 3 dernières années, défaut = année écoulée).
  Sections bord à bord ([Sections2044.tsx](src/pages/fiscalite/components/2044/Sections2044.tsx)) :
  propriétés (grille au format du Cerfa, [Grille2044.tsx](src/pages/fiscalite/components/2044/Grille2044.tsx) :
  une ligne par numéro de ligne, une colonne par immeuble, colonne Total, lignes 215/240/261/263
  calculées), parts de sociétés (111 à 114), résultat et répartition du déficit (420 à 442, branche 435
  ou 440 expliquée avec le plafond), déficits antérieurs (450, lecture seule du stock Immobilier). Rail
  droit « Report sur la 2042 » : 4BA à 4BD, plus le net imposable informatif quand 4BA et 4BD coexistent.
  Hook [useDeclaration2044.ts](src/hooks/useDeclaration2044.ts) : chaque champ s'enregistre à la sortie
  (champ vidé = NULL), mise à jour optimiste, recalcul immédiat. Ligne 222 saisie en nombre de locaux (1 affiché par défaut, minimum 1),
  ligne 228 en taux (%), le montant calculé est affiché sous le champ. Ouvrir la 2044 d'une année crée
  sa ligne `declarations_2044` et les colonnes des actifs éligibles. Suppression d'un immeuble ou d'une
  société sans confirmation. Colonne reliée à un actif : pastille lagon dans l'en-tête ; valeur
  préremplie en clair (placeholder), saisie en gras avec un bouton de retour à la valeur préremplie ;
  montants formatés avec séparateur de milliers hors saisie (`MontantCellule`, partagé avec la 2042-IFI).
- **Non modélisé** : plafond de 15 300 € du dispositif Cosse (renvoi (1) du Cerfa), 2044 spéciale
  (Robien, Borloo neuf, Malraux…), rubrique 460 (vente ou abandon de location après un déficit imputé
  sur le revenu global), case 4BE (micro-foncier).

### Reprise du Ménage depuis Famille

- **Fonction pure** [foyerDepuisFamille.ts](src/lib/fiscalite/foyerDepuisFamille.ts) (tests associés),
  appréciée pour l'année des revenus `ANNEE_REVENUS` :
  - situation : Marié(e) → marié, Pacsé(e) → pacsé, Divorcé(e) → divorcé, Veuf/Veuve → veuf,
    Célibataire et **Concubinage → célibataire** (concubins imposés séparément) ; statut absent →
    célibataire, signalé ;
  - enfants : membres « Enfant » vivants cochés « Fiscalement à charge » ; mineurs au 1er janvier N
    (né après le 1er janvier N − 18, né pendant N compris) → enfant à charge avec année de naissance et
    invalidité (« Personne handicapée ») ; 18 ans ou plus → enfant majeur rattaché ; né après N ou sans
    date → non compté, signalé. En couple marié ou pacsé, les enfants des deux ; seul ou en
    concubinage, ceux du client et les enfants communs (`enfant_de` = `both_parents`, choix validé) —
    un enfant du seul partenaire est exclu et signalé ;
  - autres personnes invalides à charge : membres non enfants vivants « Personne à charge » et
    « Personne handicapée », année de naissance (sans date : signalé) ;
  - invalidité P / F : `personne_handicapee` du client et `personne_handicapee_conjoint` (F seulement
    en couple marié ou pacsé) ;
  - ancien combattant W / S : `ancien_combattant` du client et du conjoint, seulement à plus de 74 ans
    au 31 décembre N (sinon non coché, signalé) ;
  - notes : séparation de corps, résidence séparée ou imposition distincte (imposition séparée à
    vérifier) ; case T suggérée pour une personne seule non concubine avec enfant, jamais cochée.
- **Mécanisme** (`MenageForm.tsx`) : un foyer enregistré fait foi ; sans foyer enregistré, le formulaire
  s'ouvre sur un brouillon prérempli depuis Famille (rien n'est enregistré avant « Enregistrer »).
  Bouton « Reprendre depuis Famille » : `appliquerFamille` remplace les champs issus de Famille et
  conserve lieu de résidence, cases T, L, G, veuf d'ancien combattant et résidence alternée (gardée
  pour un enfant de même année de naissance). Encadré en tête de section : état (repris à enregistrer,
  conforme, ou n écarts), écarts listés par `ecartsAvecFamille`, notes de la reprise.

### Déclaration 2042-IFI

- **Périmètre** : formulaire 2042-IFI au 1er janvier N (art. 964 à 983 CGI), cases 9AA à 9CA (annexes 2
  et 3), 9GF/9GH (annexe 4), 9NC/9NG (dons), 9PR/9PX (plafonnement, annexe 5). Moteur pur
  [calculerDeclarationIFI.ts](src/lib/fiscalite/calculerDeclarationIFI.ts), cas de référence TEST-4
  (résidence principale 4 000 000 €, IR 2025 de 28 866 €, revenus 123 280 €) : 9AA 2 800 000 €, IFI
  théorique 13 690 € en 9GH, IFI net 13 553 €.
- **Règles appliquées** :
  - abattement de 30 % sur la résidence principale (9AA déclarée après abattement) ;
  - bois, forêts et groupements forestiers exonérés à 75 % ; biens ruraux loués à long terme et parts de
    GFA/GAF à 75 % jusqu'à 101 897 € et 50 % au-delà, seuil appliqué séparément à 9AD et à 9BA ; ces
    trois cases sont déclarées avant exonération ;
  - fraction taxable des biens mixtes ;
  - dette sur un bien partiellement exonéré déductible à proportion de sa fraction imposable (la
    résidence principale garde sa dette entière malgré l'abattement) ;
  - prêt in fine : montant emprunté × (1 − années écoulées / durée totale) ;
  - plafonnement des dettes (art. 974 III) : actif supérieur à 5 M€, dettes au-delà de 60 % de l'actif
    déductibles à moitié, réduction répartie au prorata entre 9GF et 9GH ;
  - IFI théorique déduit en 9GH (case à cocher, cochée par défaut) : barème et décote appliqués à l'actif
    net des autres dettes, avant sa propre déduction ; cette déduction peut faire repasser le patrimoine
    net sous le seuil de 1,3 M€ ;
  - liquidation : barème de l'art. 977 (0,5 % à 1,5 % au-delà de 800 000 €), décote entre 1,3 et
    1,4 M€ (17 500 € − 1,25 % du patrimoine net), réduction pour dons (75 %, plafonnée à 50 000 € et à
    l'impôt), puis plafonnement à 75 % des revenus (art. 979), dans cet ordre.
- **Préremplissage** ([preremplissageIFI.ts](src/lib/fiscalite/preremplissageIFI.ts)), depuis la nature de
  l'actif dans Patrimoine, à la quote-part du foyer (`computeQuotePart`) et à `valeur_estimee` :
  - résidence principale → 9AA ; résidences secondaires, locatifs nus et meublés, locaux professionnels,
    maisons mobiles, parkings → 9AB ; terrains → 9BB ;
  - bois et forêts → 9AC si `conditions_exoneration_rural` est coché, sinon 9BB ; terrains agricoles →
    9AD si régime agricole et conditions cochées, sinon 9BB ; groupements fonciers → 9AC ou 9BA selon le
    régime (ou le type de groupement), sinon 9CA ; exonérations jamais présumées ;
  - parts de SCI, de SCPI et de sociétés d'épargne forestière → 9CA à 100 % de leur valeur ;
  - bien détenu par une société (`societe_proprietaire_id`) exclu, compté dans les parts ;
  - usufruit : pleine propriété (art. 968) ; nue-propriété : 0 €, avec la réserve des exceptions de
    l'art. 968 (usufruit légal du conjoint, vente avec réserve d'usufruit) ;
  - dettes : emprunts reliés (`asset_id`) à un actif retenu, à la part du foyer (`partFoyerEmprunt`),
    capital restant dû au 1er janvier tiré du tableau d'amortissement quand le contrat est complet, sinon
    `capital_restant_du` saisi (signalé) ; nature contenant « travaux » → 9GF, sinon 9GH ; contrat in fine
    → dégressivité ;
  - chaque ligne porte ses points à vérifier, affichés sous son nom (exonération non retenue, LMP,
    locaux affectés à l'activité, démembrement, valeur absente) ; la limite des parts en 9CA (fraction
    représentative d'immeubles, 100 % retenu) est rappelée une fois, sur la case.
- **9PR et 9PX** : repris de la Vision générale pour l'IFI de l'année suivant les revenus calculés
  (`ANNEE_IFI` = 2026), seulement quand le foyer est renseigné (sinon l'impôt calculé sur les valeurs par
  défaut fausserait le plafonnement) : 9PR = IR après décote (avant crédits d'impôt) + impôt forfaitaire
  + prélèvements sociaux calculés ; 9PX = revenu fiscal de référence, augmenté de la saisie « revenus
  hors 2042 » (revenus exonérés, étrangers, prélèvement libératoire). Approximation signalée dans l'aide
  de la case : le RFR est après abattement de 10 % sur les pensions, la 2042-IFI les veut avant. Une
  saisie remplace la valeur reprise ; sans 9PX, pas de plafonnement.
- **Persistance** (migration `20261023120000_declaration_ifi`, service
  [declarationIFIService.ts](src/services/declarationIFIService.ts)) : `declarations_ifi` (`UNIQUE(user_id,
  annee)`, case IFI théorique, 9BZ, dons, 9PR, 9PX, revenus hors 2042), `declaration_ifi_actifs` (FK
  `asset_id`, catégorie, valeur, fraction taxable, `exclu`), `declaration_ifi_dettes` (FK `emprunt_id`,
  ligne, montant, catégorie du bien financé, `exclue`). Toutes les FK en `ON DELETE CASCADE`
  (`auth.users`, déclaration, `assets`, `emprunts`), RLS `(select auth.uid()) = user_id`. Colonne à NULL
  = valeur préremplie, une valeur = surcharge ; un montant saisi sur un prêt in fine remplace le calcul
  dégressif. Une ligne préremplie s'écarte (`exclu`/`exclue`, réversible) ; une ligne saisie à la main se
  supprime.
- **Assemblage** : [declarationIFIDonnees.ts](src/services/declarationIFIDonnees.ts) charge la déclaration,
  les actifs et les emprunts, crée les lignes manquantes (écran seulement) et fusionne surcharges et
  préremplissage ; partagé par [useDeclarationIFI.ts](src/hooks/useDeclarationIFI.ts) (écran,
  enregistrement immédiat, mise à jour optimiste) et `useFiscalOverview` (sans création).
- **Écran** : quatre étapes numérotées, sur page blanche à structure teintée (en-têtes de groupe en taupe
  soutenu `#ebe6e0`, lignes de total et rail droit en taupe clair `secondary`).
  - Actif groupé par case du Cerfa, dans l'ordre du formulaire : en-tête de groupe (code, libellé, règle
    d'abattement ou d'exonération, sous-total imposable), puis une ligne par bien (case, valeur vénale,
    part taxable, montant imposable calculé avec le taux de la case, `tauxImposable` du moteur) ; pied :
    exonérations partielles et actif imposable.
  - Passif : une ligne par dette (ligne 9GF/9GH, bien financé, restant dû), l'IFI théorique en dernière
    ligne avec sa case à cocher ; pied : plafonnement des dettes et passif déductible.
  - Dons et plafonnement ; encadré citron quand 9PR/9PX ne sont pas repris.
  - Calcul de l'impôt tranche à tranche, IFI net sur bandeau lagon.
  - Rail droit : IFI net, résumé actif / passif / patrimoine net, cases du Cerfa (cases renseignées en
    lagon, cases à zéro estompées).
  - Ligne reliée : pastille lagon, valeur reprise en clair, saisie en gras avec retour à la valeur reprise.
- **Non modélisé** : biens professionnels exonérés (annexe 1, 9BZ : case enregistrée, aucun calcul),
  fraction immobilière des parts de sociétés (100 % retenu, la logique `valeur_ifi`/`pourcentage_ifi` de
  `useSocietesIFI` n'est pas reprise), dettes non déductibles (famille, art. 974 II), impôts payés à
  l'étranger (annexe 6, 9RS), cases d'identité (9GL, 9GM, 9GN, enfants mineurs), 9PR/9PX pour une autre
  année que `ANNEE_IFI`.

## 3. Dette identifiée

### 🔴 Bloquant (peut fausser un calcul montré au client)

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
- **Une dette reliée à un actif écarté de la 2042-IFI reste déduite.** Écarter un bien (`exclu`) n'écarte
  pas l'emprunt qui le finance : il faut écarter aussi la dette, sinon le passif est surestimé.
- **Parts de sociétés comptées à 100 % en 9CA.** La fraction représentative d'immeubles n'est pas
  calculée (trésorerie, actifs non immobiliers, holdings) : signalé sous l'actif, à corriger par saisie.

### 🟠 À surveiller (cas limite, peu probable)

- **Cadre 3 — hypothèses à confronter au simulateur officiel** : `3SB` imposé au barème, `3PI` à 50 %
  suivant `2OP`, `3PI`/`3SB` sans prélèvements sociaux, `3VW` retenu au RFR, PS 18,6 % sur `3PC`/`3PE`,
  `3VQ` sans PS, contribution de 10 % non modélisée (voir §2, « Plus-values
  et gains divers »).
- **RFR — 2XX et 2VM** (produits et gains déjà soumis au prélèvement libératoire) : exclus du RFR alors
  que 2DH, de même nature, y est retenu. Probablement à réintégrer (art. 1417 IV CGI), à vérifier.

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
  chiffres différents dans le même fichier) ne peut plus se reproduire.

## 4. Périmètre V1 / différé

- **V1 — en place** : déclaration 2042-IFI préremplie depuis Patrimoine et Passifs, reprise dans
  l'imposition totale (voir §2), compteur d'enfants
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
  officielle DGFiP — saisie brute, **revenu net imposable désormais calculé** par
  `calculerRevenuSalaires.ts` (abattement forfaitaire de 10 % ou frais réels, le plus favorable des
  deux, arbitré une seule fois par déclarant pour l'ensemble de ses traitements et salaires — y compris
  les salaires exonérés retenus pour le taux effectif, voir §2) ; **gains d'actionnariat salarié (Phase
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
  dividendes/intérêts/2GO et la famille assurance-vie non libératoire (2CH/2VV/2WW/2YY/2ZZ/2VN/2VO/2VP)
  à 18,6 % (Phase 1, taux et périmètre corrigés — voir §2) ; `calculerPrelevementsSociauxPensionsRetraitesRentes.ts`
  couvre les rentes viagères à titre onéreux (18,6 % fixe, taux corrigé depuis 17,2 % — voir §2, Phase 2) ;
  `calculerPrelevementsSociauxGainsActionnariatSalarie.ts` couvre 1TT (9,7 % salarial), 1NX (28,6 %
  combiné, carried-interest non qualifiant), 1NY et 3VN (contributions salariales 30 %/10 %, Phase 3 —
  périmètre établi par vérification empirique contre le simulateur officiel plutôt que recherche
  documentaire seule, les sources généralistes se contredisant sur cette catégorie). Voir §2 pour le
  détail des trois phases, y compris les cases hors périmètre de chacune (2DH/2XX/2VM, seules cases
  « soumises au prélèvement libératoire » du cadre 2, pour la Phase 1 ; **pensions classiques, 1AL,
  capital PER 1AI et capital retraite 1AT pour la Phase 2**
  — le taux de CSG/CRDS/CASA sur les pensions dépend d'un RFR N-2 non modélisé, une approximation par le
  revenu imposable courant s'étant révélée empiriquement fausse de plusieurs milliers d'euros sur un
  compte réel ; 1TP/1TZ/1AY/1MP et les gains historiques 3VD/3VI/3VF/3VJ/3VK pour la Phase 3, confirmé par
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
  - **Reprise depuis Famille** : résidence alternée, lieu de résidence, cases T, L et G, et
    changement de situation en cours d'année (mariage, PACS, divorce, décès) restent manuels.
  - **2042-IFI** : voir « Non modélisé » en §2, « Déclaration 2042-IFI ».
- **Hors périmètre de cet audit, signalé comme travail de suivi** : un rapprochement des moteurs
  d'IFI de l'application (`calculerDeclarationIFI`, `useSocietesIntegration::useSocietesIFI`, et les deux
  formules d'IS/IFI déjà documentées comme divergentes dans `docs/societes.md`) serait nécessaire avant
  de présenter un montant d'IFI unique et fiable à un client détenant à la fois des biens en direct, des
  parts de société et des biens immobiliers transférés dans le module dédié.
