/**
 * Dérivation automatique des trimestres cotisés/assimilés à partir du détail
 * de carrière (`retraite_carriere_detail`). Fonctions pures, sans JSX ni
 * state React — sur le modèle de calculSAM.ts.
 *
 * ⚠️ Périmètre restreint (phase 1, cf. docs/audit/cartographie-trimestres-cotises.md) :
 * ne couvre que les périodes `employeur`, `chomage` et `maladie`. Les
 * périodes `micro_entrepreneur` sont explicitement ignorées — ni cotisées,
 * ni assimilées, ni comptées dans le total — cf. dette technique documentée
 * dans docs/audit/audit-retraite.md (deux décisions volontairement hors
 * périmètre de cette phase : conversion CA → assiette sociale, et
 * chronologie de franchissement des seuils pour la surcote).
 *
 * ⚠️ Cette fonction n'est PAS branchée dans decoteSurTrimestres() ni dans
 * aucun écran à ce stade — production de la fonction et de ses tests
 * uniquement, le branchement fera l'objet d'un commit séparé une fois
 * validé (cf. consigne de la session qui l'a introduite, 2026-08-11).
 */

import { PeriodeCarriere } from './parseRIS';

/**
 * Seuil de revenu validant un trimestre cotisé (art. R.351-9 CSS) :
 * 150 × SMIC horaire brut en vigueur au 1er janvier de l'année considérée.
 *
 * Valeurs DÉRIVÉES des SMIC horaires bruts officiels publiés (Urssaf,
 * info.gouv.fr, Insee), pas recopiées d'une circulaire CNAV publiant
 * directement ce barème année par année — à la différence de
 * `PASS_PAR_ANNEE` (calculSAM.ts), qui a une source CNAV directe. Recherche
 * effectuée le 2026-08-11 et validée avec l'utilisateur avant intégration.
 * Recoupement de cohérence : 150 × 12,02 € (SMIC au 01/01/2026) = 1 803,00 €,
 * valeur confirmée indépendamment pour 2026 par l'utilisateur.
 *
 * ⚠️ À compléter chaque année lors de la revalorisation du SMIC (aucune
 * extrapolation au-delà des années listées — cf. comportement de repli
 * volontairement absent dans trimestresCotisesEtAssimilesDepuisCarriere()).
 */
export const SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE: Record<number, number> = {
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
 * Nombre de jours ouvrant droit à un trimestre assimilé, faute de revenu
 * exploitable pour ces catégories (le champ `revenu` est le plus souvent
 * `null` en base pour `chomage`/`maladie`, confirmé sur les données réelles
 * du client Titouan Weishaar : lignes "Revenu non renseigné"). Seuils
 * officiels distincts par catégorie, vérifiés le 2026-08-11 :
 * - Chômage indemnisé : 1 trimestre validé tous les 50 jours (consécutifs
 *   ou non), plafonné à 4/an. Source : service-public.gouv.fr, circulaire
 *   CNAV n° 2020-25.
 * - Maladie / accident du travail avec indemnités journalières : 1
 *   trimestre validé tous les 60 jours, plafonné à 4/an. Source :
 *   service-public.gouv.fr.
 *
 * ⚠️ `type_activite = 'chomage'` ne distingue pas chômage indemnisé de
 * chômage non indemnisé (confirmé sur les données réelles de Titouan
 * Weishaar : les libellés "CHÔMAGE" et "CHÔMAGE NON INDEMNISÉ" coexistent,
 * tous deux `type_activite = 'chomage'`, cf.
 * docs/audit/cartographie-trimestres-cotises.md §1.2). Cette fonction
 * applique donc la règle du chômage INDEMNISÉ (50 jours) à toutes les
 * périodes `chomage`, y compris non indemnisées — ce qui **surestime
 * probablement** les trimestres assimilés pour les périodes de chômage non
 * indemnisé, qui suivent en réalité des règles de plafonnement différentes
 * (une durée totale sur l'ensemble de la carrière, pas un ratio jours/
 * trimestre par période) — dette technique documentée dans
 * docs/audit/audit-retraite.md.
 */
const JOURS_PAR_TRIMESTRE_CHOMAGE = 50;
const JOURS_PAR_TRIMESTRE_MALADIE = 60;

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

function anneesTraversees(periode: PeriodeCarriere): number[] {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);
  const annees: number[] = [];
  for (let annee = debut.getUTCFullYear(); annee <= fin.getUTCFullYear(); annee++) {
    annees.push(annee);
  }
  return annees;
}

/**
 * Répartit le revenu d'une période `employeur` par année civile, au prorata
 * du nombre de jours (même mécanique que `repartirRevenuParAnnee()` dans
 * calculSAM.ts). Chevauchements : plusieurs périodes `employeur` sur la même
 * année s'additionnent naturellement dans `revenuParAnnee` (une entrée par
 * année, incrémentée à chaque période), conformément à la règle officielle
 * (tous les revenus cotisés d'une année s'additionnent, indépendamment du
 * nombre d'employeurs).
 */
function repartirRevenuEmployeurParAnnee(periode: PeriodeCarriere, revenuParAnnee: Map<number, number>): void {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);
  const revenu = periode.revenu ?? 0;
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

export interface ResultatTrimestresCotisesEtAssimiles {
  cotises: number;
  assimiles: number;
  total: number;
}

/**
 * Dérive un nombre de trimestres cotisés et assimilés à partir du détail de
 * carrière, périodes `employeur`/`chomage`/`maladie` uniquement
 * (`micro_entrepreneur` explicitement ignoré — cf. en-tête de fichier).
 *
 * - `employeur` : revenu de l'année (toutes périodes `employeur` confondues,
 *   après filtrage des doublons régime/revenu du RIS — cf.
 *   `estPeriodeRegimeDeBase()`) ÷ seuil de validation de l'année, plafonné à
 *   4/an → cotisé. Les années hors barème connu
 *   (`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`) ne contribuent aucun trimestre
 *   plutôt que d'extrapoler un seuil.
 * - `chomage` : aucun trimestre cotisé ; jours de l'année (toutes périodes
 *   `chomage` confondues) ÷ 50 (règle du chômage indemnisé, appliquée à
 *   toutes les périodes `chomage` faute de distinction indemnisé/non
 *   indemnisé dans `type_activite` — cf. commentaire sur
 *   `JOURS_PAR_TRIMESTRE_CHOMAGE`), plafonné à 4/an → assimilé.
 * - `maladie` : aucun trimestre cotisé ; jours de l'année (toutes périodes
 *   `maladie` confondues) ÷ 60, plafonné à 4/an → assimilé.
 * - Chômage et maladie sont comptés sur deux `Map` par année distinctes
 *   (pas fusionnées) puisque leur seuil de conversion en trimestres diffère.
 * - Le plafond de 4/an s'applique au TOTAL cotisé + assimilé (chômage +
 *   maladie confondus) de chaque année, pas séparément à chaque catégorie
 *   (règle officielle : 4 trimestres maximum par année civile, tous types
 *   confondus). En cas de dépassement combiné sur une même année, les
 *   trimestres **cotisés sont prioritaires** : ils sont comptés en premier
 *   (jusqu'à 4), l'assimilé (chômage + maladie) ne prend que la place
 *   restante. Confirmé conforme à la règle officielle (priorité cotisés en
 *   cas de dépassement du plafond combiné) — source : CFDT Retraités,
 *   citant les modalités d'attribution CNAV (« Les trimestres cotisés sont
 *   pris en priorité »), vérifiée le 2026-08-11. Le seul cas réel où ce
 *   conflit se produit dans les données de test est 2024 (4 cotisés + 2
 *   chômage bruts → 4 cotisés / 0 assimilé retenus pour cette année).
 */
export function trimestresCotisesEtAssimilesDepuisCarriere(
  periodes: PeriodeCarriere[]
): ResultatTrimestresCotisesEtAssimiles {
  const periodesEmployeur = periodes.filter((p) => p.typeActivite === 'employeur' && estPeriodeRegimeDeBase(p));
  const periodesChomage = periodes.filter((p) => p.typeActivite === 'chomage');
  const periodesMaladie = periodes.filter((p) => p.typeActivite === 'maladie');
  // periodes.typeActivite === 'micro_entrepreneur' : ignoré, cf. en-tête.

  const revenuParAnnee = new Map<number, number>();
  for (const periode of periodesEmployeur) {
    repartirRevenuEmployeurParAnnee(periode, revenuParAnnee);
  }

  const joursChomageParAnnee = new Map<number, number>();
  for (const periode of periodesChomage) {
    repartirJoursAssimilesParAnnee(periode, joursChomageParAnnee);
  }

  const joursMaladieParAnnee = new Map<number, number>();
  for (const periode of periodesMaladie) {
    repartirJoursAssimilesParAnnee(periode, joursMaladieParAnnee);
  }

  const annees = new Set<number>([
    ...revenuParAnnee.keys(),
    ...joursChomageParAnnee.keys(),
    ...joursMaladieParAnnee.keys(),
  ]);

  let cotises = 0;
  let assimiles = 0;
  for (const annee of annees) {
    const seuil = SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE[annee];
    const revenu = revenuParAnnee.get(annee) ?? 0;
    // Année hors barème connu : aucun trimestre cotisé, pas d'extrapolation
    // (même comportement qu'avant — le plafond combiné ci-dessous laisse
    // alors toute la place disponible à l'assimilé de cette année).
    const cotisesBruts = seuil !== undefined ? Math.floor(revenu / seuil) : 0;

    const joursChomage = joursChomageParAnnee.get(annee) ?? 0;
    const joursMaladie = joursMaladieParAnnee.get(annee) ?? 0;
    const assimilesBruts =
      Math.floor(joursChomage / JOURS_PAR_TRIMESTRE_CHOMAGE) + Math.floor(joursMaladie / JOURS_PAR_TRIMESTRE_MALADIE);

    const cotisesAnnee = Math.min(cotisesBruts, PLAFOND_TRIMESTRES_PAR_AN);
    const placeRestante = PLAFOND_TRIMESTRES_PAR_AN - cotisesAnnee;
    const assimilesAnnee = Math.min(assimilesBruts, placeRestante);

    cotises += cotisesAnnee;
    assimiles += assimilesAnnee;
  }

  return { cotises, assimiles, total: cotises + assimiles };
}
