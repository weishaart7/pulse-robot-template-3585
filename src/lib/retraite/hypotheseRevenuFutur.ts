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
 * `revenuAnnuel × trimestres / 4`, régime de base) pour injection dans
 * `calculerSAM()` aux côtés des périodes réelles du RIS — seul usage prévu
 * de ces périodes synthétiques : ne jamais les persister ni les mélanger au
 * `detailCarriere` affiché/enregistré sur l'écran Carrière.
 */
export function periodesSynthetiquesProjetees(
  projection: TrimestresProjetesAnnee[],
  revenuAnnuel: number
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
      revenu: (revenuAnnuel * trimestres) / 4,
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
  aujourdHui: Date
): ProjectionRevenuFutur {
  const dateEffet = dateNaissance ? dateEffetDepartAgeLegal(dateNaissance, aujourdHui) : null;
  const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);
  const sansProjection = {
    salaireAnnuelMoyenProjete: salaireAnnuelMoyen,
    trimestresValidesProjetes: 0,
    dateEffet,
    anneesPasseesSansDonnees: anneesPasseesSansDonnees(parAnnee, aujourdHui),
  };
  if (!dateNaissance || !dateEffet) return sansProjection;

  const revenuHypothese =
    modeHypothese === 'derniere_annee_connue'
      ? revenuAnnuelHypotheseDerniereAnneeConnue(parAnnee)
      : revenuHypotheseManuel;
  const projection = trimestresProjetesParAnnee(parAnnee, aujourdHui, dateEffet);
  const trimestresValidesProjetes = projection.reduce((total, a) => total + a.trimestres, 0);
  if (revenuHypothese === null || revenuHypothese <= 0 || trimestresValidesProjetes === 0) {
    return sansProjection;
  }

  const salaireAnnuelMoyenProjete = calculerSAM(
    [...detailCarriere, ...periodesSynthetiquesProjetees(projection, revenuHypothese)],
    dateNaissance.annee,
    undefined,
    dateEffet.getUTCFullYear()
  ).sam;

  return { ...sansProjection, salaireAnnuelMoyenProjete, trimestresValidesProjetes };
}
