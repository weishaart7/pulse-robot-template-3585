/**
 * Hypothèse de revenu pour la période future (du trimestre civil en cours au
 * trimestre précédant la date d'effet d'un départ à l'âge légal) — permet d'estimer les
 * trimestres futurs et la pension pour un profil dont la carrière connue
 * (RIS) s'arrête avant l'âge légal réel. Fonctions pures, sans JSX ni state
 * React — sur le modèle de calculSAM.ts.
 *
 * Deux modes (cf. Synthese.tsx pour le toggle) :
 * - `derniere_annee_connue` : revenu dérivé automatiquement de la dernière
 *   année du RIS ayant validé au moins un trimestre, annualisé si l'année
 *   était partielle.
 * - `revenu_moyen_projete` : revenu saisi manuellement par le conseiller.
 *
 * Chaque trimestre civil de la période projetée est compté comme validé
 * (hypothèse de carrière continue), dans la limite de 4 par année civile
 * trimestres réels déjà validés compris — volontairement PAS recalculée
 * via `trimestresCotisesEtAssimilesDepuisCarriere()` : le barème de seuil de
 * validation (`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`) ne couvre que jusqu'à
 * 2026, une année future au-delà retomberait à tort sur 0 trimestre validé.
 */

import { PeriodeCarriere } from './parseRIS';
import { ResultatTrimestresCotisesEtAssimiles, trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';
import { DateNaissance, dateEffetDepartAgeLegal, indexTrimestreCivil } from './calcul';
import { calculerSAM } from './calculSAM';

export type ModeHypotheseRevenuFutur = 'derniere_annee_connue' | 'revenu_moyen_projete';

/** Évolutions réelles (hors inflation) proposées pour les revenus futurs. */
export const EVOLUTIONS_REVENUS = [0, 0.015, 0.03] as const;

/**
 * Trajectoire des revenus futurs (moteur en euros constants : PASS, valeurs
 * de point et classes gelés, donc croissance réelle). Revenu de l'année de
 * rang k (0 = année en cours) = revenu de base × (1 + evolution)^k.
 * `trimestreDebut` : trimestre civil en cours (0-3), premier trimestre projeté.
 */
export interface TrajectoireRevenu {
  evolution: number;
  trimestreDebut: number;
}

/** « Stable », « +1,5 % / an », « +3 % / an ». */
export function libelleEvolutionRevenus(evolution: number): string {
  return evolution === 0 ? 'Stable' : `+${(evolution * 100).toLocaleString('fr-FR')} % / an`;
}

export function trajectoireRevenu(evolution: number | null | undefined, aujourdHui: Date): TrajectoireRevenu {
  return { evolution: evolution ?? 0, trimestreDebut: Math.floor(aujourdHui.getUTCMonth() / 3) };
}

/** Revenu de l'année de rang `rang` (0 = année en cours). */
export function revenuAnneeProjetee(revenuBase: number, evolution: number, rang: number): number {
  return revenuBase * Math.pow(1 + evolution, Math.max(0, rang));
}

/**
 * Répartit `trimestres` projetés en années civiles consécutives à partir du
 * trimestre en cours : [{ rang, fraction d'année }]. Sans trajectoire, une
 * seule tranche de rang 0 (revenu constant).
 */
function tranchesAnnuelles(trimestres: number, trajectoire?: TrajectoireRevenu): { rang: number; fraction: number }[] {
  const total = Math.max(0, trimestres);
  if (!trajectoire || trajectoire.evolution === 0) return total > 0 ? [{ rang: 0, fraction: total / 4 }] : [];
  const tranches: { rang: number; fraction: number }[] = [];
  let reste = total;
  let capacite = 4 - trajectoire.trimestreDebut;
  for (let rang = 0; reste > 0; rang++) {
    const pris = Math.min(reste, capacite);
    tranches.push({ rang, fraction: pris / 4 });
    reste -= pris;
    capacite = 4;
  }
  return tranches;
}

/**
 * Σ fraction × f(revenu de l'année) sur les années projetées : remplace
 * « années × f(revenu constant) » pour les droits proportionnels au revenu
 * (points, cotisations). Identique à `trimestres / 4 × f(revenuBase)` à
 * évolution nulle.
 */
export function sommeSurAnneesProjetees(
  trimestres: number,
  revenuBase: number,
  trajectoire: TrajectoireRevenu | undefined,
  f: (revenu: number) => number
): number {
  return tranchesAnnuelles(trimestres, trajectoire).reduce(
    (total, { rang, fraction }) => total + fraction * f(revenuAnneeProjetee(revenuBase, trajectoire?.evolution ?? 0, rang)),
    0
  );
}

/** Revenu de la dernière année projetée (TIB des 6 derniers mois en fonction publique). */
export function revenuFinDeProjection(revenuBase: number, trimestres: number, trajectoire?: TrajectoireRevenu): number {
  const tranches = tranchesAnnuelles(trimestres, trajectoire);
  const rang = tranches.length > 0 ? tranches[tranches.length - 1].rang : 0;
  return revenuAnneeProjetee(revenuBase, trajectoire?.evolution ?? 0, rang);
}

/**
 * Dernière année du `parAnnee` (triée croissante par l'appelant, cf.
 * `trimestresCotisesEtAssimilesDepuisCarriere()`) ayant validé au moins un
 * trimestre (cotisé ou assimilé) — recule tant qu'une année a 0 trimestre,
 * conformément au besoin fonctionnel. `null` si aucune année du RIS n'a de
 * trimestre validé (RIS vide ou inexploitable).
 */
export function derniereAnneeAvecTrimestreValide(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee']
): ResultatTrimestresCotisesEtAssimiles['parAnnee'][number] | null {
  for (let i = parAnnee.length - 1; i >= 0; i--) {
    const annee = parAnnee[i];
    if (annee.cotises + annee.assimiles > 0) return annee;
  }
  return null;
}

/**
 * Revenu annuel hypothèse en mode "dernière année connue" : revenu de la
 * dernière année validée, ramené à un équivalent 12 mois si l'année était
 * partielle (`revenu_annualisé = revenu_année ÷ (trimestres_validés × 3) ×
 * 12`). `trimestres_validés` = cotisés + assimilés de cette année (déjà
 * plafonné à 4 par `trimestresCotisesEtAssimilesDepuisCarriere()`).
 *
 * `null` si aucune année n'a de trimestre validé — cas limite RIS vide, à
 * l'appelant de basculer sur le mode manuel dans ce cas (cf. Synthese.tsx).
 */
export function revenuAnnuelHypotheseDerniereAnneeConnue(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee']
): number | null {
  const derniereAnnee = derniereAnneeAvecTrimestreValide(parAnnee);
  if (derniereAnnee === null) return null;

  const trimestresValides = derniereAnnee.cotises + derniereAnnee.assimiles;
  return (derniereAnnee.revenuCotise / (trimestresValides * 3)) * 12;
}

export interface TrimestresProjetesAnnee {
  annee: number;
  trimestres: number;
  premierTrimestre: number; // 0-3, premier trimestre civil projeté de l'année
  dernierTrimestre: number; // 0-3, dernier trimestre civil projeté de l'année
}

/**
 * Trimestres projetés par année civile, du trimestre civil contenant
 * `aujourdHui` (inclus) au trimestre civil précédant `dateEffet` (inclus —
 * fin de la période d'assurance retenue pour une liquidation à cette date).
 * Pour chaque année : au plus le nombre de trimestres civils de la période
 * dans cette année, et au plus `4 - trimestres déjà validés` dans le détail
 * de carrière réel (plafond de 4/an, pas de double compte de l'année en
 * cours). Aucune année antérieure à l'année en cours n'est projetée : un
 * trou dans le passé (RIS ancien) n'est jamais comblé, cf.
 * `anneesPasseesSansDonnees()`.
 */
export function trimestresProjetesParAnnee(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee'],
  aujourdHui: Date,
  dateEffet: Date
): TrimestresProjetesAnnee[] {
  const debut = indexTrimestreCivil(aujourdHui);
  const fin = indexTrimestreCivil(dateEffet) - 1;
  const valides = new Map(parAnnee.map((a) => [a.annee, a.cotises + a.assimiles]));
  const resultat: TrimestresProjetesAnnee[] = [];
  for (let annee = Math.floor(debut / 4); annee <= Math.floor(fin / 4); annee++) {
    const premier = Math.max(debut, annee * 4) - annee * 4;
    const dernier = Math.min(fin, annee * 4 + 3) - annee * 4;
    const trimestres = Math.min(dernier - premier + 1, Math.max(0, 4 - (valides.get(annee) ?? 0)));
    if (trimestres > 0) resultat.push({ annee, trimestres, premierTrimestre: premier, dernierTrimestre: dernier });
  }
  return resultat;
}

/**
 * Années passées (entre la dernière année validée du détail de carrière et
 * l'année en cours, exclues) sans aucune donnée — non projetées, à signaler
 * à l'écran (RIS probablement ancien).
 */
export function anneesPasseesSansDonnees(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee'],
  aujourdHui: Date
): number[] {
  const derniere = derniereAnneeAvecTrimestreValide(parAnnee);
  if (derniere === null) return [];
  const annees: number[] = [];
  for (let annee = derniere.annee + 1; annee < aujourdHui.getUTCFullYear(); annee++) {
    annees.push(annee);
  }
  return annees;
}

/**
 * Construit des `PeriodeCarriere` synthétiques (une par année projetée,
 * couvrant les trimestres civils projetés de l'année, revenu au prorata
 * `revenu de l'année × trimestres / 4`, régime de base ; revenu de l'année
 * selon l'évolution, rang 0 = `anneeReference`) pour injection dans
 * `calculerSAM()` aux côtés des périodes réelles du RIS — seul usage prévu
 * de ces périodes synthétiques : ne jamais les persister ni les mélanger au
 * `detailCarriere` affiché/enregistré sur l'écran Carrière.
 */
export function periodesSynthetiquesProjetees(
  projection: TrimestresProjetesAnnee[],
  revenuAnnuel: number,
  evolution = 0,
  anneeReference = projection[0]?.annee ?? 0
): PeriodeCarriere[] {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0');
  return projection.map(({ annee, trimestres, premierTrimestre, dernierTrimestre }) => {
    const moisFin = dernierTrimestre * 3 + 3;
    const jourFin = new Date(Date.UTC(annee, moisFin, 0)).getUTCDate();
    return {
      employeur: 'Hypothèse de revenu futur',
      typeActivite: 'employeur',
      dateDebut: `${annee}-${deuxChiffres(premierTrimestre * 3 + 1)}-01`,
      dateFin: `${annee}-${deuxChiffres(moisFin)}-${deuxChiffres(jourFin)}`,
      revenu: (revenuAnneeProjetee(revenuAnnuel, evolution, annee - anneeReference) * trimestres) / 4,
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    };
  });
}

export interface ProjectionRevenuFutur {
  salaireAnnuelMoyenProjete: number;
  trimestresValidesProjetes: number;
  /** Date d'effet du scénario (départ à l'âge légal), `null` si indéterminée. */
  dateEffet: Date | null;
  /** Années passées sans donnée, non projetées (cf. `anneesPasseesSansDonnees()`). */
  anneesPasseesSansDonnees: number[];
  /** Trimestres civils projetés jusqu'à la date d'effet, même sans revenu hypothèse. */
  trimestresProjetesJusquADateEffet: number;
  /** Revenu annuel hypothèse retenu (plafonné au PASS en mode RIS), `null` si indéterminé. */
  revenuHypothese: number | null;
  /** Évolution des revenus retenue, à transmettre aux régimes projetés. */
  trajectoire: TrajectoireRevenu;
}

/**
 * Glue de la projection de revenu futur — orchestre les fonctions pures
 * ci-dessus pour produire la date d'effet du scénario « départ à l'âge
 * légal », un salaire annuel moyen et un nombre de trimestres projetés, à
 * ajouter aux valeurs réelles avant de les passer à
 * `calculerPensionConsolidee()` AVEC cette même date d'effet.
 *
 * Appelée à l'identique par `usePensionConsolidee.ts` (Synthèse) et par
 * `Carriere.tsx` — un seul endroit où corriger cette logique.
 */
export function calculerProjectionRevenuFutur(
  dateNaissance: DateNaissance | null,
  detailCarriere: PeriodeCarriere[],
  salaireAnnuelMoyen: number,
  modeHypothese: ModeHypotheseRevenuFutur,
  revenuHypotheseManuel: number | null,
  aujourdHui: Date,
  evolution = 0
): ProjectionRevenuFutur {
  return projectionRevenuFuturA(
    dateNaissance,
    detailCarriere,
    salaireAnnuelMoyen,
    modeHypothese,
    revenuHypotheseManuel,
    aujourdHui,
    evolution,
    dateNaissance ? dateEffetDepartAgeLegal(dateNaissance, aujourdHui) : null
  );
}

/**
 * Même projection pour une date d'effet quelconque (scénarios de départ de
 * l'Optimisation) : SAM recalculé avec les années projetées jusqu'au
 * trimestre précédant `dateEffet`, année de liquidation = année de `dateEffet`.
 */
export function projectionRevenuFuturA(
  dateNaissance: DateNaissance | null,
  detailCarriere: PeriodeCarriere[],
  salaireAnnuelMoyen: number,
  modeHypothese: ModeHypotheseRevenuFutur,
  revenuHypotheseManuel: number | null,
  aujourdHui: Date,
  evolution: number,
  dateEffet: Date | null
): ProjectionRevenuFutur {
  const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);
  const sansProjection = {
    salaireAnnuelMoyenProjete: salaireAnnuelMoyen,
    trimestresValidesProjetes: 0,
    dateEffet,
    anneesPasseesSansDonnees: anneesPasseesSansDonnees(parAnnee, aujourdHui),
    trimestresProjetesJusquADateEffet: 0,
    revenuHypothese: null as number | null,
    trajectoire: trajectoireRevenu(evolution, aujourdHui),
  };
  if (!dateNaissance || !dateEffet) return sansProjection;

  const revenuHypothese =
    modeHypothese === 'derniere_annee_connue'
      ? revenuAnnuelHypotheseDerniereAnneeConnue(parAnnee)
      : revenuHypotheseManuel;
  const projection = trimestresProjetesParAnnee(parAnnee, aujourdHui, dateEffet);
  const trimestresValidesProjetes = projection.reduce((total, a) => total + a.trimestres, 0);
  if (revenuHypothese === null || revenuHypothese <= 0 || trimestresValidesProjetes === 0) {
    return { ...sansProjection, trimestresProjetesJusquADateEffet: trimestresValidesProjetes, revenuHypothese };
  }

  const salaireAnnuelMoyenProjete = calculerSAM(
    [...detailCarriere, ...periodesSynthetiquesProjetees(projection, revenuHypothese, evolution, aujourdHui.getUTCFullYear())],
    dateNaissance.annee,
    undefined,
    dateEffet.getUTCFullYear()
  ).sam;

  return {
    ...sansProjection,
    salaireAnnuelMoyenProjete,
    trimestresValidesProjetes,
    trimestresProjetesJusquADateEffet: trimestresValidesProjetes,
    revenuHypothese,
  };
}

/**
 * Salaire retenu pour projeter les points Agirc-Arrco futurs : le salaire
 * brut total saisi s'il existe, sinon le revenu hypothèse de la retraite de
 * base — plafonné au PASS en mode RIS, donc sous-estimant les points de
 * tranche 2 d'un cadre (`estPlafonne`, à signaler à l'écran). `null` si
 * aucun des deux n'est connu.
 */
export function salaireProjectionComplementaire(
  salaireBrutAnnuel: number | null | undefined,
  revenuHypothese: number | null
): { salaireAnnuel: number; estPlafonne: boolean } | null {
  if (salaireBrutAnnuel && salaireBrutAnnuel > 0) return { salaireAnnuel: salaireBrutAnnuel, estPlafonne: false };
  if (revenuHypothese && revenuHypothese > 0) return { salaireAnnuel: revenuHypothese, estPlafonne: true };
  return null;
}
