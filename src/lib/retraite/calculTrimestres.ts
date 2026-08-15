/**
 * Dérivation automatique des trimestres cotisés/assimilés à partir du détail
 * de carrière (`retraite_carriere_detail`). Fonctions pures, sans JSX ni
 * state React — sur le modèle de calculSAM.ts.
 *
 * Couvre désormais les quatre valeurs de `type_activite` : `employeur`,
 * `chomage`, `maladie`, et `micro_entrepreneur` (abattement forfaitaire CA →
 * revenu retenu, cf. `ABATTEMENT_MICRO_ENTREPRENEUR` ci-dessous — méthode
 * confirmée en primaire sur Légifrance, art. L613-7 CSS, cf.
 * docs/audit/micro-entrepreneur-trimestres.md). Limites assumées de cette
 * couverture, documentées à leur endroit respectif dans ce fichier :
 * - sous-type micro-entrepreneur (vente/service BIC/service BNC) non
 *   identifiable depuis le texte libre du champ `employeur` → période exclue
 *   (cf. `classifierSousTypeMicroEntrepreneur()`) ;
 * - abattements version 2026 uniquement (art. D613-4 CSS), pas de barème par
 *   année comme `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`.
 *
 * Branchement réel (corrigé le 2026-08-15, cf. docs/audit/audit-import-ris.md
 * §3 — le commentaire précédent affirmait à tort qu'aucun écran n'utilisait
 * cette fonction) : `trimestresCotisesEtAssimilesDepuisCarriere()` est
 * appelée par `anneesExclues()` dans calculSAM.ts, elle-même appelée par
 * `calculerSAM()`, elle-même appelée directement par
 * `RISImportDialog.tsx` au moment de l'import d'un RIS. Elle est donc
 * active dès l'import — pas seulement dans un module futur non branché —
 * via l'exclusion des années sans trimestre validé du pool du SAM, pas via
 * `decoteSurTrimestres()` (qui, lui, reste effectivement non branché sur
 * cette fonction à ce stade).
 */

import { PeriodeCarriere } from './parseRIS';

/**
 * Seuil de revenu validant un trimestre cotisé (art. R.351-9 CSS). La règle
 * elle-même a changé 2 fois dans l'histoire du régime général (recherche et
 * vérification du 2026-08-15, Legifrance) :
 * - 1949-1971 : montant trimestriel de l'AVTS (Allocation aux Vieux
 *   Travailleurs Salariés) — pas un multiple du SMIC, formule non modélisée
 *   ici (valeurs déjà calculées directement par le COR, cf. ci-dessous).
 * - 1972-2013 : 200 × SMIC horaire brut au 1er janvier de l'année (art.
 *   R.351-9 CSS, rédaction issue de la loi Boulin du 31/12/1971, circulaire
 *   CNAV 1/73 du 03/01/1973).
 * - Depuis le 1er janvier 2014 : 150 × SMIC horaire brut au 1er janvier
 *   (décret n° 2014-349 du 19/03/2014, application rétroactive au
 *   01/01/2014 malgré la date de publication).
 *
 * Sources des valeurs ci-dessous :
 * - **1950-2002** : valeurs déjà calculées et publiées en euros par le
 *   Conseil d'Orientation des Retraites (COR), document "L'évolution des
 *   paramètres du régime de la CNAV" (doc-1071.pdf, juin 2019, tableau
 *   p.15) — source directe, pas de recalcul de notre part.
 * - **2003-2017** : aucune table publiée équivalente trouvée pour cette
 *   tranche lors de la recherche du 2026-08-15. Valeurs CALCULÉES par nos
 *   soins (200×SMIC jusqu'en 2013, 150×SMIC à partir de 2014, SMIC horaire
 *   brut en vigueur au 1er janvier de chaque année, dates de parution au
 *   Journal Officiel — source : tableau SMIC historique cdg17.fr, recoupé
 *   avec la série IPP). Méthode validée par recoupement exact avec les
 *   valeurs déjà en place pour 2018 (150×9,88€=1482,00€) et 2019
 *   (150×10,03€=1504,50€) et avec la valeur COR 2002 (200×6,67€=1334,00€).
 * - **2018-2026** : déjà en place avant cette session, source Urssaf/Insee
 *   (SMIC), non revérifiée ici au-delà du recoupement ci-dessus.
 *
 * ⚠️ Lacunes assumées, signalées plutôt que comblées par extrapolation
 * (cf. `anneesSansBaremeConnu` dans `ResultatTrimestresCotisesEtAssimiles`,
 * qui remonte explicitement toute année de revenu cotisé hors barème connu
 * plutôt que de silencieusement compter 0 trimestre) :
 * - 1946-1949 : seuil fixe pré-AVTS (1 800 F de salaire annuel en
 *   1946-1948 selon le COR), non repris ici faute de valeur directement en
 *   euros — cas résiduel (carrière démarrée il y a ~80 ans).
 * - Avant 1946 : régime général inexistant sous cette forme.
 */
export const SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE: Record<number, number> = {
  // 1950-1971 — COR doc-1071.pdf p.15 (montant trimestriel AVTS, déjà en euros)
  1950: 17.15,
  1951: 19.82,
  1952: 22.79,
  1953: 22.79,
  1954: 25.08,
  1955: 25.08,
  1956: 27.59,
  1957: 27.59,
  1958: 27.59,
  1959: 27.59,
  1960: 27.59,
  1961: 27.59,
  1962: 27.59,
  1963: 30.49,
  1964: 34.3,
  1965: 38.11,
  1966: 43.83,
  1967: 49.55,
  1968: 55.26,
  1969: 59.07,
  1970: 62.89,
  1971: 66.7,
  // 1972-2002 — COR doc-1071.pdf p.15 (règle des 200h, déjà en euros)
  1972: 120.13,
  1973: 138.73,
  1974: 165.56,
  1975: 205.81,
  1976: 240.56,
  1977: 272.58,
  1978: 306.73,
  1979: 344.84,
  1980: 394.23,
  1981: 450.94,
  1982: 553.39,
  1983: 618.64,
  1984: 694.56,
  1985: 742.73,
  1986: 793.95,
  1987: 820.79,
  1988: 848.84,
  1989: 876.89,
  1990: 911.95,
  1991: 973.84,
  1992: 995.8,
  1993: 1038.48,
  1994: 1061.96,
  1995: 1084.22,
  1996: 1127.51,
  1997: 1155.87,
  1998: 1202.21,
  1999: 1226.3,
  2000: 1241.54,
  2001: 1281.18,
  2002: 1334.0,
  // 2003-2017 — calculées (200×SMIC jusqu'en 2013, 150×SMIC à partir de
  // 2014), SMIC au 1er janvier = dernier taux publié au JO avant le 1er
  // janvier de l'année (cf. commentaire ci-dessus pour la méthode complète)
  2003: 1366.0, // SMIC 6,83€ (JO 28/06/2002) × 200
  2004: 1438.0, // SMIC 7,19€ (JO 28/06/2003) × 200
  2005: 1522.0, // SMIC 7,61€ (JO 02/07/2004) × 200
  2006: 1606.0, // SMIC 8,03€ (JO 30/06/2005) × 200
  2007: 1654.0, // SMIC 8,27€ (JO 30/06/2006) × 200
  2008: 1688.0, // SMIC 8,44€ (JO 29/06/2007) × 200
  2009: 1742.0, // SMIC 8,71€ (JO 28/06/2008) × 200
  2010: 1772.0, // SMIC 8,86€ (JO 17/12/2009) × 200
  2011: 1800.0, // SMIC 9,00€ (JO 18/12/2010) × 200
  2012: 1844.0, // SMIC 9,22€ (JO 23/12/2011) × 200
  2013: 1886.0, // SMIC 9,43€ (JO 17/12/2012) × 200
  2014: 1429.5, // SMIC 9,53€ (JO 20/12/2013) × 150
  2015: 1441.5, // SMIC 9,61€ (JO 22/12/2014) × 150
  2016: 1450.5, // SMIC 9,67€ (JO 18/12/2015) × 150
  2017: 1464.0, // SMIC 9,76€ (JO 23/12/2016) × 150
  // 2018-2026 — déjà en place, non revérifiées au-delà du recoupement ci-dessus
  2018: 1482.0,
  2019: 1504.5,
  2020: 1522.5,
  2021: 1537.5,
  2022: 1585.5,
  2023: 1690.5,
  2024: 1747.5,
  2025: 1782.0,
  2026: 1803.0,
};

/**
 * Abattement forfaitaire appliqué au chiffre d'affaires déclaré pour obtenir
 * le « revenu retenu » servant au calcul des trimestres (revenu retenu = CA
 * × (1 − abattement)). Base légale vérifiée en lecture primaire directe sur
 * Légifrance, art. L613-7 du code de la sécurité sociale
 * ([LEGIARTI000048683570](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048683570)) :
 * « Les prestations attribuées aux personnes mentionnées au présent article
 * sont calculées sur la base de leur chiffre d'affaires ou de leurs recettes
 * après application d'un taux d'abattement de 71 % [...] » (+ 50 % et 34 %
 * selon la catégorie, art. D613-4 CSS). Recherche et vérification effectuées
 * le 2026-08-11, cf. docs/audit/micro-entrepreneur-trimestres.md — cette
 * méthode écarte explicitement l'hypothèse concurrente (reconstitution via
 * le taux de cotisation retraite ÷ 17,87 %), sans base légale identifiée.
 *
 * ⚠️ Valeurs 2026 uniquement — contrairement à
 * `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`, aucun barème par année n'est
 * encodé ici. Les taux L613-7/D613-4 sont stables dans le temps (pas de
 * revalorisation annuelle comme le SMIC), mais n'ont pas été vérifiés pour
 * les années antérieures à 2026 — à confirmer avant d'appliquer cette
 * fonction à des périodes anciennes si les taux venaient à différer.
 */
export const ABATTEMENT_MICRO_ENTREPRENEUR = {
  vente_bic: 0.71,
  service_bic: 0.5,
  service_bnc: 0.34,
} as const;

type SousTypeMicroEntrepreneur = keyof typeof ABATTEMENT_MICRO_ENTREPRENEUR;

/**
 * Identifie le sous-type d'activité micro-entrepreneur depuis le texte libre
 * du champ `employeur` — aucun champ structuré dédié n'existe en base (même
 * limitation que `classifierTypeActivite()` dans parseRIS.ts, cf.
 * docs/audit/cartographie-trimestres-cotises.md §2.3). Mots-clés confirmés
 * sur les libellés réels observés côté RIS : « Activité de vente BIC »,
 * « Prestation de service BIC », « Prestation de service BNC ». BNC est
 * testé avant BIC : les libellés BNC observés ne contiennent jamais « BIC »,
 * mais l'inverse n'est pas garanti si un libellé futur combinait les deux
 * mots — l'ordre de test fige ce choix.
 *
 * Retourne `null` si aucun sous-type n'est reconnaissable (libellé RIS
 * inhabituel ou absent) — la période est alors exclue du calcul (ni cotisée,
 * ni assimilée, ni comptée) par l'appelant plutôt que de deviner un
 * abattement. Cas non couvert par les tests actuels faute de libellé réel
 * observé qui déclencherait ce cas — à surveiller si un relevé futur en
 * produit un.
 */
function classifierSousTypeMicroEntrepreneur(employeurTexte: string): SousTypeMicroEntrepreneur | null {
  const normalise = employeurTexte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (normalise.includes('BNC')) return 'service_bnc';
  if (normalise.includes('VENTE') && normalise.includes('BIC')) return 'vente_bic';
  if (normalise.includes('BIC')) return 'service_bic';
  return null;
}

/**
 * Nombre de jours ouvrant droit à un trimestre assimilé, faute de revenu
 * exploitable pour ces catégories (le champ `revenu` est le plus souvent
 * `null` en base pour `chomage`/`maladie`, confirmé sur les données réelles
 * du client Titouan Weishaar : lignes "Revenu non renseigné"). Seuils
 * officiels distincts par catégorie, vérifiés le 2026-08-11 :
 * - Chômage (indemnisé ou non) : 1 trimestre validé tous les 50 jours
 *   (consécutifs ou non), plafonné à 4/an — même ratio pour les deux, art.
 *   R351-12 CSS (vérifié en lecture primaire directe sur Légifrance le
 *   2026-08-12 : le texte renvoie implicitement à la règle générale du même
 *   article pour la conversion jours→trimestres, et n'introduit un
 *   mécanisme différent que sur la DURÉE prise en compte pour le chômage
 *   non indemnisé, cf. `JOURS_PLAFOND_PREMIERE_PERIODE_NON_INDEMNISEE` /
 *   `JOURS_PLAFOND_PERIODE_ULTERIEURE_NON_INDEMNISEE` ci-dessous — pas sur
 *   le ratio de conversion lui-même). Confirmation initiale du ratio
 *   chômage indemnisé : service-public.gouv.fr, circulaire CNAV n° 2020-25.
 * - Maladie / accident du travail avec indemnités journalières : 1
 *   trimestre validé tous les 60 jours, plafonné à 4/an. Source :
 *   service-public.gouv.fr.
 */
const JOURS_PAR_TRIMESTRE_CHOMAGE = 50;
const JOURS_PAR_TRIMESTRE_MALADIE = 60;

/**
 * Plafonds du chômage NON indemnisé (art. R351-12 CSS, vérifié en lecture
 * primaire directe sur Légifrance le 2026-08-12,
 * [LEGIARTI000031828370](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031828370)) :
 * plafond de CARRIÈRE (pas annuel, à la différence du plafond 4/an qui
 * s'applique en plus, séparément, cf. `trimestresChomageNonIndemniseParAnnee()`).
 *
 * Citations exactes :
 * - « la première période de chômage non indemnisé, qu'elle soit continue ou
 *   non, est prise en compte dans la limite d'un an et demi, sans que plus
 *   de six trimestres d'assurance puissent être comptés à ce titre » → deux
 *   plafonds cumulatifs pour la première période : 547 jours ET 6
 *   trimestres. Le plafond en trimestres est presque toujours le plus
 *   contraignant en pratique (floor(547/50) = 10 > 6).
 * - « chaque période ultérieure de chômage non indemnisé est prise en
 *   compte à condition qu'elle succède sans solution de continuité à une
 *   période de chômage indemnisé, dans la limite d'un an » → 365 jours par
 *   période, MAIS seulement si adjacente (aucun jour de vide) à une période
 *   de chômage INDEMNISÉ immédiatement précédente ; sinon 0 jour retenu.
 * - « cette dernière limite est portée à cinq ans lorsque l'assuré justifie
 *   d'une durée de cotisation d'au moins vingt ans, est âgé d'au moins
 *   cinquante-cinq ans à la date où il cesse de bénéficier de [...] » —
 *   extension NON implémentée (dette technique, cf. docs/audit/audit-retraite.md) :
 *   nécessite un calcul de durée de cotisation à une date précise, qui n'existe
 *   pas encore dans ce module. Toute période ultérieure qui serait éligible à
 *   cette extension mais dépasse 365 jours est donc sous-comptée par cette
 *   fonction (les jours au-delà de 365 ne comptent pour aucun trimestre).
 */
const JOURS_PLAFOND_PREMIERE_PERIODE_NON_INDEMNISEE = 547;
const PLAFOND_TRIMESTRES_PREMIERE_PERIODE_NON_INDEMNISEE = 6;
const JOURS_PLAFOND_PERIODE_ULTERIEURE_NON_INDEMNISEE = 365;

// Heuristique de détection du chômage NON indemnisé : aucun champ structuré
// n'existe en base pour cette distinction (confirmé dans
// docs/audit/cartographie-trimestres-cotises.md §1.2 — les libellés réels
// "CHÔMAGE" et "CHÔMAGE NON INDEMNISÉ" coexistent, tous deux
// `type_activite = 'chomage'`). Recherche du seul mot-clé observé dans les
// données réelles ("NON INDEMNISÉ"), insensible à la casse et à l'accent
// final (la variante "NON-INDEMNISÉ" avec tiret est également couverte).
// ⚠️ Absence du mot-clé = présumé INDEMNISÉ (comportement par défaut
// inchangé) : si le libellé RIS réel diffère de ces deux variantes connues,
// une période réellement non indemnisée serait à tort traitée comme
// indemnisée (surestimation possible, même limitation de principe que
// `classifierSousTypeMicroEntrepreneur()` pour le micro-entrepreneur).
const RE_CHOMAGE_NON_INDEMNISE = /NON[\s-]?INDEMNIS/i;

function estChomageNonIndemnise(periode: PeriodeCarriere): boolean {
  return RE_CHOMAGE_NON_INDEMNISE.test(periode.employeur);
}

const PLAFOND_TRIMESTRES_PAR_AN = 4;

const unJourMs = 24 * 60 * 60 * 1000;

// Le RIS produit parfois deux lignes distinctes pour une même période
// employeur (mêmes dates, même employeur), une par régime — ex. une ligne
// "L'Assurance retraite", une ligne "Agirc-Arrco", avec un revenu quasi
// identique à un euro près. Sans filtrage, ces deux lignes seraient
// additionnées et doubleraient artificiellement le revenu cotisé de
// l'année. Même mécanisme et même regex que `estPeriodeRegimeDeBase()`
// dans calculSAM.ts (non exportée par ce fichier, dupliquée ici). N'est
// PAS appliqué aux périodes `chomage`/`maladie` : celles-ci sont comptées
// en jours (pas en revenu), et aucun doublon de ce type n'a été observé
// pour ces catégories dans les données réelles examinées lors de cette
// session — à surveiller si un cas contraire apparaît (dette technique,
// cf. docs/audit/audit-retraite.md).
const RE_REGIME_ASSURANCE_RETRAITE = /assurance retraite/i;

function estPeriodeRegimeDeBase(periode: PeriodeCarriere): boolean {
  return periode.regimes.some((regime) => RE_REGIME_ASSURANCE_RETRAITE.test(regime));
}

/**
 * Répartit une période entre les années civiles qu'elle traverse, au
 * prorata du nombre de jours dans chaque année — même principe que
 * `repartirRevenuParAnnee()` dans calculSAM.ts (fonction sœur, dupliquée
 * plutôt qu'importée : calculSAM.ts ne l'exporte pas, et les deux usages
 * divergent ensuite — celui-ci accumule soit un revenu soit un simple
 * décompte de jours selon l'appelant).
 */
function joursDansAnnee(debut: Date, fin: Date, annee: number): number {
  const anneeDebut = debut.getUTCFullYear();
  const anneeFin = fin.getUTCFullYear();
  if (annee < anneeDebut || annee > anneeFin) return 0;

  const borneDebut = annee === anneeDebut ? debut : new Date(Date.UTC(annee, 0, 1));
  const borneFin = annee === anneeFin ? fin : new Date(Date.UTC(annee, 11, 31));
  return Math.round((borneFin.getTime() - borneDebut.getTime()) / unJourMs) + 1;
}

// Extraite de `anneesTraversees()` pour être réutilisable sur des dates déjà
// construites (ex. une date de fin tronquée par un plafond de jours), sans
// avoir à fabriquer un `PeriodeCarriere` complet juste pour ses deux dates —
// cf. `trimestresChomageNonIndemniseParAnnee()`.
function anneesTraverseesDates(debut: Date, fin: Date): number[] {
  const annees: number[] = [];
  for (let annee = debut.getUTCFullYear(); annee <= fin.getUTCFullYear(); annee++) {
    annees.push(annee);
  }
  return annees;
}

function anneesTraversees(periode: PeriodeCarriere): number[] {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);
  return anneesTraverseesDates(debut, fin);
}

/**
 * Répartit un revenu cotisé par année civile, au prorata du nombre de jours
 * de la période (même mécanique que `repartirRevenuParAnnee()` dans
 * calculSAM.ts). Usage élargi depuis l'ajout du micro-entrepreneur : le
 * revenu n'est plus lu directement sur `periode.revenu` mais passé en
 * paramètre explicite, pour pouvoir y injecter le revenu déjà abattu (CA ×
 * (1 − abattement)) sans dupliquer la logique de répartition temporelle —
 * l'appelant employeur passe `periode.revenu ?? 0` tel quel, l'appelant
 * micro-entrepreneur passe le revenu retenu post-abattement. Chevauchements :
 * plusieurs périodes (employeur et/ou micro-entrepreneur) sur la même année
 * s'additionnent naturellement dans `revenuParAnnee` (une entrée par année,
 * incrémentée à chaque période), conformément à la règle officielle (tous
 * les revenus cotisés d'une année s'additionnent, indépendamment du nombre
 * d'employeurs ou d'activités).
 */
function repartirRevenuCotiseParAnnee(periode: PeriodeCarriere, revenu: number, revenuParAnnee: Map<number, number>): void {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);
  const joursTotal = Math.round((fin.getTime() - debut.getTime()) / unJourMs) + 1;

  for (const annee of anneesTraversees(periode)) {
    const joursDansCetteAnnee = joursDansAnnee(debut, fin, annee);
    const part = joursTotal > 0 ? revenu * (joursDansCetteAnnee / joursTotal) : 0;
    revenuParAnnee.set(annee, (revenuParAnnee.get(annee) || 0) + part);
  }
}

/**
 * Répartit le nombre de jours d'une période `chomage` ou `maladie` par
 * année civile (pas de revenu à proratiser : ces catégories n'ont pas de
 * revenu exploitable, cf. commentaire sur `JOURS_PAR_TRIMESTRE_CHOMAGE` /
 * `JOURS_PAR_TRIMESTRE_MALADIE`). Chevauchements : plusieurs périodes de la
 * même catégorie sur la même année s'additionnent, même principe que pour
 * les périodes `employeur`. Fonction commune aux deux catégories — seul le
 * seuil de conversion en trimestres diffère, appliqué séparément par
 * l'appelant sur deux `Map` distinctes (`joursChomageParAnnee` /
 * `joursMaladieParAnnee`).
 */
function repartirJoursAssimilesParAnnee(periode: PeriodeCarriere, joursParAnnee: Map<number, number>): void {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);

  for (const annee of anneesTraversees(periode)) {
    const joursDansCetteAnnee = joursDansAnnee(debut, fin, annee);
    joursParAnnee.set(annee, (joursParAnnee.get(annee) || 0) + joursDansCetteAnnee);
  }
}

/**
 * Calcule les trimestres assimilés issus du chômage NON indemnisé, par
 * année civile, en appliquant le plafond de CARRIÈRE de l'art. R351-12 CSS
 * (cf. constantes ci-dessus) — distinct du plafond annuel de 4/an, qui reste
 * appliqué séparément par l'appelant en plus de celui-ci.
 *
 * Retourne des TRIMESTRES déjà calculés par année (pas des jours) : la
 * première période non indemnisée doit respecter un plafond explicite de 6
 * trimestres au total, qui peut porter sur plusieurs années civiles si la
 * période les chevauche — un simple cumul de jours par année suivi d'un
 * `floor(/50)` par année, sans étape supplémentaire, pourrait dépasser 6 au
 * total (ex. 200 jours sur une année + 347 sur la suivante = 4 + 6 = 10). Le
 * calcul se fait donc en 2 temps par période : jours retenus (plafond de
 * durée) → trimestres par année (floor 50) → si première période et total >
 * 6, retrait de l'excédent en partant de l'année la PLUS RÉCENTE de la
 * période (choix arbitraire non précisé par le texte légal, cf. limite
 * documentée en tête de fichier).
 *
 * `periodesChomage` doit contenir TOUTES les périodes `chomage` (indemnisées
 * et non indemnisées confondues) : les indemnisées servent uniquement à
 * vérifier l'adjacence des périodes non indemnisées ultérieures, mais ne
 * contribuent elles-mêmes aucun trimestre depuis cette fonction (elles sont
 * comptées séparément par `repartirJoursAssimilesParAnnee()`, appelée par
 * l'appelant sur le sous-ensemble indemnisé uniquement).
 *
 * ⚠️ « Première période » = la période non indemnisée la plus ancienne par
 * date de début parmi celles présentes dans `periodesChomage`, traitée comme
 * un bloc unique même si elle est en réalité composée de plusieurs lignes
 * RIS distinctes mais consécutives (simplification : ce module ne fusionne
 * pas les lignes RIS contiguës en une seule « période » avant classification
 * — chaque `PeriodeCarriere` est traitée indépendamment, avec son propre
 * plafond selon son rang chronologique parmi les non-indemnisées). Aucun cas
 * réel observé à ce jour où cette simplification changerait le résultat.
 *
 * ⚠️ Adjacence testée au jour près (`dateFin` d'une période indemnisée =
 * `dateDebut` de la période non indemnisée − 1 jour) : un trou d'un seul
 * jour dans les données (erreur de saisie RIS, par exemple) ferait perdre
 * l'intégralité d'une période ultérieure plutôt que de la réduire
 * proportionnellement — comportement fidèle au texte légal (« sans solution
 * de continuité »), mais à surveiller si un tel cas apparaît dans des
 * données réelles (aucun cas de ce type observé à ce jour).
 */
function trimestresChomageNonIndemniseParAnnee(periodesChomage: PeriodeCarriere[]): Map<number, number> {
  const periodesNonIndemnisees = periodesChomage
    .filter(estChomageNonIndemnise)
    .slice()
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

  const resultat = new Map<number, number>();
  if (periodesNonIndemnisees.length === 0) return resultat;

  const finsPeriodesIndemnisees = new Set(
    periodesChomage.filter((p) => !estChomageNonIndemnise(p)).map((p) => p.dateFin)
  );

  periodesNonIndemnisees.forEach((periode, index) => {
    const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
    const finReelle = new Date(`${periode.dateFin}T00:00:00Z`);
    const totalJours = Math.round((finReelle.getTime() - debut.getTime()) / unJourMs) + 1;

    let plafondJours: number;
    if (index === 0) {
      plafondJours = JOURS_PLAFOND_PREMIERE_PERIODE_NON_INDEMNISEE;
    } else {
      const veilleISO = new Date(debut.getTime() - unJourMs).toISOString().slice(0, 10);
      if (!finsPeriodesIndemnisees.has(veilleISO)) return; // pas adjacente à une période indemnisée : 0 trimestre.
      plafondJours = JOURS_PLAFOND_PERIODE_ULTERIEURE_NON_INDEMNISEE;
    }

    const joursRetenus = Math.min(totalJours, plafondJours);
    const finTronquee = new Date(debut.getTime() + (joursRetenus - 1) * unJourMs);

    const trimestresParAnneeCettePeriode = new Map<number, number>();
    let totalTrimestresCettePeriode = 0;
    for (const annee of anneesTraverseesDates(debut, finTronquee)) {
      const jours = joursDansAnnee(debut, finTronquee, annee);
      const trimestres = Math.floor(jours / JOURS_PAR_TRIMESTRE_CHOMAGE);
      trimestresParAnneeCettePeriode.set(annee, trimestres);
      totalTrimestresCettePeriode += trimestres;
    }

    if (index === 0 && totalTrimestresCettePeriode > PLAFOND_TRIMESTRES_PREMIERE_PERIODE_NON_INDEMNISEE) {
      let excedent = totalTrimestresCettePeriode - PLAFOND_TRIMESTRES_PREMIERE_PERIODE_NON_INDEMNISEE;
      const anneesDecroissant = [...trimestresParAnneeCettePeriode.keys()].sort((a, b) => b - a);
      for (const annee of anneesDecroissant) {
        if (excedent === 0) break;
        const trimestresCetteAnnee = trimestresParAnneeCettePeriode.get(annee)!;
        const retrait = Math.min(trimestresCetteAnnee, excedent);
        trimestresParAnneeCettePeriode.set(annee, trimestresCetteAnnee - retrait);
        excedent -= retrait;
      }
    }

    for (const [annee, trimestres] of trimestresParAnneeCettePeriode) {
      resultat.set(annee, (resultat.get(annee) ?? 0) + trimestres);
    }
  });

  return resultat;
}

export interface ResultatTrimestresCotisesEtAssimiles {
  cotises: number;
  assimiles: number;
  total: number;
  /**
   * Détail par année civile, triée par année croissante — extension additive
   * du total agrégé ci-dessus, qui ne casse aucun appelant existant (`.total`,
   * `.cotises`, `.assimiles` restent inchangés). Les valeurs par année
   * étaient déjà calculées en interne (boucle ci-dessous) mais jamais
   * exposées : nécessaire pour borner un calcul de surcote à une période de
   * référence (référentiel §2.3.1), qui exige de savoir QUELLES années ont
   * produit des trimestres cotisés, pas seulement leur total sur toute la
   * carrière. Cf. docs/audit/conception-surcote.md §4 et
   * docs/audit/implementation-surcote.md.
   *
   * ⚠️ Ne résout pas la chronologie infra-annuelle (cf.
   * docs/audit/implementation-surcote.md, dette technique) : une année
   * contenant un mélange de trimestres avant/après un pivot donné (âge légal
   * atteint, date d'effet) ne peut pas être décomposée plus finement par ce
   * champ — seul le total annuel est disponible, pas la date d'acquisition de
   * chaque trimestre.
   */
  parAnnee: { annee: number; cotises: number; assimiles: number }[];
  /**
   * Années civiles ayant un revenu cotisé (employeur et/ou micro-
   * entrepreneur retenu) > 0 mais SANS seuil de validation connu dans
   * `SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE` (avant 1950, ou 1946-1949 —
   * cf. le commentaire de cette constante) — triée par année croissante.
   * Ces années comptent 0 trimestre cotisé dans `cotises`/`parAnnee`, mais
   * ce 0 n'est PAS fiable : il signifie "barème non trouvé", pas "aucun
   * droit". Ajouté le 2026-08-15 (docs/audit/audit-import-ris.md §3) pour
   * remonter un signal explicite plutôt que de laisser ce 0 se confondre
   * avec un vrai 0 trimestre — à l'appelant de décider comment l'afficher
   * (aucun écran ne le fait à ce stade, cf. portée retenue pour cette
   * session).
   */
  anneesSansBaremeConnu: number[];
}

/**
 * Dérive un nombre de trimestres cotisés et assimilés à partir du détail de
 * carrière, couvrant les quatre valeurs de `type_activite`.
 *
 * - `employeur` : revenu de l'année (toutes périodes `employeur` confondues,
 *   après filtrage des doublons régime/revenu du RIS — cf.
 *   `estPeriodeRegimeDeBase()`) ÷ seuil de validation de l'année, plafonné à
 *   4/an → cotisé. Les années hors barème connu
 *   (`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`) ne contribuent aucun trimestre
 *   plutôt que d'extrapoler un seuil.
 * - `micro_entrepreneur` : CA de la période × (1 − abattement du sous-type
 *   identifié, cf. `classifierSousTypeMicroEntrepreneur()` /
 *   `ABATTEMENT_MICRO_ENTREPRENEUR`) = revenu retenu, réparti par année et
 *   **cumulé dans la même `revenuParAnnee` que le revenu `employeur`** avant
 *   division par le seuil — les deux sources de revenu cotisé s'additionnent
 *   pour une même année civile, conformément à la règle officielle (tous les
 *   revenus cotisés d'une année s'additionnent, indépendamment de la source
 *   d'activité). Périodes dont le sous-type n'est pas identifiable : exclues
 *   (ni cotisées, ni comptées), pas de repli par défaut sur un abattement
 *   arbitraire. Aucun filtrage doublon régime/revenu appliqué à ces périodes
 *   (contrairement à `employeur`) : le format RIS observé pour le
 *   micro-entrepreneur présente une seule ligne listant plusieurs régimes
 *   ensemble (ex. `["L'Assurance retraite", 'RCI']`), pas une ligne par
 *   régime comme pour `employeur` — aucun doublon de ce type observé sur les
 *   données réelles examinées.
 * - `chomage` : aucun trimestre cotisé. Périodes indemnisées (présumées par
 *   défaut, cf. `estChomageNonIndemnise()`) : jours de l'année ÷ 50, comme
 *   avant. Périodes non indemnisées (détectées par heuristique sur le
 *   libellé) : traitées séparément par `trimestresChomageNonIndemniseParAnnee()`,
 *   avec le même ratio 50 jours mais un plafond de CARRIÈRE (pas annuel,
 *   art. R351-12 CSS) plutôt qu'un simple cumul par année — cf. docstring de
 *   cette fonction pour le détail (première période vs périodes ultérieures
 *   adjacentes). Le tout plafonné à 4/an → assimilé, comme les autres
 *   sources assimilées.
 * - `maladie` : aucun trimestre cotisé ; jours de l'année (toutes périodes
 *   `maladie` confondues) ÷ 60, plafonné à 4/an → assimilé.
 * - Chômage et maladie sont comptés sur deux `Map` par année distinctes
 *   (pas fusionnées) puisque leur seuil de conversion en trimestres diffère.
 * - Le plafond de 4/an s'applique au TOTAL cotisé (employeur + micro-
 *   entrepreneur confondus) + assimilé (chômage + maladie confondus) de
 *   chaque année, pas séparément à chaque catégorie (règle officielle : 4
 *   trimestres maximum par année civile, tous types confondus). En cas de
 *   dépassement combiné sur une même année, les trimestres **cotisés sont
 *   prioritaires** : ils sont comptés en premier (jusqu'à 4), l'assimilé
 *   (chômage + maladie) ne prend que la place restante. Confirmé conforme à
 *   la règle officielle (priorité cotisés en cas de dépassement du plafond
 *   combiné) — source : CFDT Retraités, citant les modalités d'attribution
 *   CNAV (« Les trimestres cotisés sont pris en priorité »), vérifiée le
 *   2026-08-11. Le seul cas réel où ce conflit se produit dans les données de
 *   test est 2024 (4 cotisés + 2 chômage bruts → 4 cotisés / 0 assimilé
 *   retenus pour cette année).
 */
export function trimestresCotisesEtAssimilesDepuisCarriere(
  periodes: PeriodeCarriere[]
): ResultatTrimestresCotisesEtAssimiles {
  const periodesEmployeur = periodes.filter((p) => p.typeActivite === 'employeur' && estPeriodeRegimeDeBase(p));
  const periodesMicroEntrepreneur = periodes.filter((p) => p.typeActivite === 'micro_entrepreneur');
  const periodesChomage = periodes.filter((p) => p.typeActivite === 'chomage');
  const periodesMaladie = periodes.filter((p) => p.typeActivite === 'maladie');

  const revenuParAnnee = new Map<number, number>();
  for (const periode of periodesEmployeur) {
    repartirRevenuCotiseParAnnee(periode, periode.revenu ?? 0, revenuParAnnee);
  }
  for (const periode of periodesMicroEntrepreneur) {
    const sousType = classifierSousTypeMicroEntrepreneur(periode.employeur);
    if (sousType === null) continue; // sous-type non identifiable : période exclue, cf. docstring.
    const revenuRetenu = (periode.revenu ?? 0) * (1 - ABATTEMENT_MICRO_ENTREPRENEUR[sousType]);
    repartirRevenuCotiseParAnnee(periode, revenuRetenu, revenuParAnnee);
  }

  const periodesChomageIndemnise = periodesChomage.filter((p) => !estChomageNonIndemnise(p));
  const joursChomageParAnnee = new Map<number, number>();
  for (const periode of periodesChomageIndemnise) {
    repartirJoursAssimilesParAnnee(periode, joursChomageParAnnee);
  }
  const trimestresChomageNonIndemniseParAn = trimestresChomageNonIndemniseParAnnee(periodesChomage);

  const joursMaladieParAnnee = new Map<number, number>();
  for (const periode of periodesMaladie) {
    repartirJoursAssimilesParAnnee(periode, joursMaladieParAnnee);
  }

  const annees = new Set<number>([
    ...revenuParAnnee.keys(),
    ...joursChomageParAnnee.keys(),
    ...trimestresChomageNonIndemniseParAn.keys(),
    ...joursMaladieParAnnee.keys(),
  ]);

  let cotises = 0;
  let assimiles = 0;
  const parAnnee: { annee: number; cotises: number; assimiles: number }[] = [];
  const anneesSansBaremeConnu: number[] = [];
  for (const annee of annees) {
    const seuil = SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE[annee];
    const revenu = revenuParAnnee.get(annee) ?? 0;
    // Année hors barème connu : aucun trimestre cotisé, pas d'extrapolation
    // (même comportement qu'avant — le plafond combiné ci-dessous laisse
    // alors toute la place disponible à l'assimilé de cette année). Un
    // revenu cotisé non nul sur une année sans barème est en revanche
    // signalé via `anneesSansBaremeConnu` : ce 0 trimestre n'est pas fiable.
    if (seuil === undefined && revenu > 0) {
      anneesSansBaremeConnu.push(annee);
    }
    const cotisesBruts = seuil !== undefined ? Math.floor(revenu / seuil) : 0;

    const joursChomage = joursChomageParAnnee.get(annee) ?? 0;
    const joursMaladie = joursMaladieParAnnee.get(annee) ?? 0;
    const trimestresChomageNonIndemnise = trimestresChomageNonIndemniseParAn.get(annee) ?? 0;
    const assimilesBruts =
      Math.floor(joursChomage / JOURS_PAR_TRIMESTRE_CHOMAGE) +
      Math.floor(joursMaladie / JOURS_PAR_TRIMESTRE_MALADIE) +
      trimestresChomageNonIndemnise;

    const cotisesAnnee = Math.min(cotisesBruts, PLAFOND_TRIMESTRES_PAR_AN);
    const placeRestante = PLAFOND_TRIMESTRES_PAR_AN - cotisesAnnee;
    const assimilesAnnee = Math.min(assimilesBruts, placeRestante);

    cotises += cotisesAnnee;
    assimiles += assimilesAnnee;
    parAnnee.push({ annee, cotises: cotisesAnnee, assimiles: assimilesAnnee });
  }
  parAnnee.sort((a, b) => a.annee - b.annee);
  anneesSansBaremeConnu.sort((a, b) => a - b);

  return { cotises, assimiles, total: cotises + assimiles, parAnnee, anneesSansBaremeConnu };
}
