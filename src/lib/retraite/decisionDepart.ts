/**
 * Moteur de décision « quand partir ? » (audit Retraite du 2026-09-29, phase
 * 6a) — fonctions pures, au-dessus de `simulationDepart.ts`.
 *
 * Règles validées le 2026-09-29 :
 * - Dates testées : chaque trimestre, de la première date de départ possible
 *   (âge légal ou départ anticipé) au 1er du mois suivant les 70 ans.
 * - Critère : cumul des pensions brutes (tous régimes, capital RAFP compris)
 *   perçues jusqu'à un âge de référence, actualisé à la première date testée
 *   (taux par défaut 0 % : les montants sont déjà en euros constants).
 * - Âge de référence : 65 ans + espérance de vie INSEE 2025 à 65 ans selon la
 *   civilité (moyenne hommes/femmes si inconnue). Tables du moment : elles
 *   sous-estiment la longévité des générations, ce qui favorise les départs
 *   précoces — biais affiché, avec une sensibilité à ±5 ans.
 * - Délai de récupération d'un départ plus tardif : pensions non perçues
 *   pendant l'attente ÷ gain annuel de pension, exprimé en âge atteint.
 * - Les salaires d'une activité poursuivie ne sont pas comptés (pensions
 *   seules) ; le net est affiché à titre indicatif (personne seule, 1 part).
 */

import { DateNaissance, dateAnniversaireLegal } from './calcul';
import { PARAMETRES_ESPERANCE_VIE } from './parametres';
import { SimulateurDepart, ResultatSimulationDepart } from './simulationDepart';

export type Sexe = 'homme' | 'femme';

/** Sexe déduit de la civilité (« M. », « M », « Mme », « Mlle »), `null` si inconnue. */
export function sexeDepuisCivilite(civilite: string | null | undefined): Sexe | null {
  if (!civilite) return null;
  const c = civilite.trim().toLowerCase();
  if (c.startsWith('mme') || c.startsWith('mlle') || c.startsWith('madame') || c.startsWith('mademoiselle')) return 'femme';
  if (c === 'm' || c === 'm.' || c.startsWith('monsieur') || c === 'mr') return 'homme';
  return null;
}

/** Âge de référence (en années) : 65 ans + espérance de vie INSEE à 65 ans. */
export function ageReferenceDeces(sexe: Sexe | null): number {
  const { hommes, femmes } = PARAMETRES_ESPERANCE_VIE.a65;
  const esperance = sexe === 'homme' ? hommes : sexe === 'femme' ? femmes : (hommes + femmes) / 2;
  return 65 + esperance;
}

const indexMois = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth();

/** Date à laquelle est atteint un âge décimal (1er du mois de l'anniversaire, au mois près). */
function dateAge(dateNaissance: DateNaissance, age: number): Date {
  const ans = Math.floor(age);
  return dateAnniversaireLegal(dateNaissance, { ans, mois: Math.round((age - ans) * 12) });
}

/** Dates testées : trimestre par trimestre, du premier départ possible aux 70 ans. */
export function datesDepartCandidates(simulateur: SimulateurDepart, dateNaissance: DateNaissance): Date[] {
  if (!simulateur.dateDepartAuPlusTot) return [];
  const fin = indexMois(dateAge(dateNaissance, 70)) + 1;
  const dates: Date[] = [];
  for (let m = indexMois(simulateur.dateDepartAuPlusTot); m <= fin; m += 3) {
    dates.push(new Date(Date.UTC(Math.floor(m / 12), m % 12, 1)));
  }
  return dates;
}

/**
 * Cumul actualisé des pensions d'une date de départ jusqu'à l'âge de
 * référence : flux mensuels, plus le capital RAFP éventuel versé au départ.
 * `dateOrigine` : date d'actualisation (première date testée).
 */
export function cumulPensions(params: {
  simulation: ResultatSimulationDepart;
  dateNaissance: DateNaissance;
  ageReference: number;
  tauxActualisation: number;
  dateOrigine: Date;
}): number {
  const { simulation, dateNaissance, ageReference, tauxActualisation, dateOrigine } = params;
  const moisDepuisOrigine = indexMois(simulation.dateEffet) - indexMois(dateOrigine);
  const nombreMois = Math.max(0, indexMois(dateAge(dateNaissance, ageReference)) - indexMois(simulation.dateEffet));
  const facteur = (mois: number) => Math.pow(1 + tauxActualisation, -mois / 12);
  let cumul = simulation.rafpCapital * facteur(moisDepuisOrigine);
  const mensualite = simulation.pensionTotale / 12;
  for (let k = 0; k < nombreMois; k++) {
    cumul += mensualite * facteur(moisDepuisOrigine + k);
  }
  return cumul;
}

export interface LigneDecisionDepart {
  simulation: ResultatSimulationDepart;
  cumul: number;
  /** Âge auquel un départ à cette date rattrape le premier départ possible, `null` si jamais (gain nul). */
  ageRecuperation: number | null;
}

export interface ResultatDecisionDepart {
  ageReference: number;
  lignes: LigneDecisionDepart[];
  meilleure: LigneDecisionDepart | null;
  /** Meilleure date pour un âge de référence −5 / +5 ans (sensibilité). */
  meilleureSiVieCourte: Date | null;
  meilleureSiVieLongue: Date | null;
  /** Première date sans décote (taux plein), `null` si aucune avant 70 ans. */
  premiereDateTauxPlein: Date | null;
}

export function deciderDateDepart(params: {
  simulateur: SimulateurDepart;
  dateNaissance: DateNaissance;
  sexe: Sexe | null;
  tauxActualisation: number;
}): ResultatDecisionDepart {
  const { simulateur, dateNaissance, sexe, tauxActualisation } = params;
  const ageReference = ageReferenceDeces(sexe);
  const simulations = datesDepartCandidates(simulateur, dateNaissance)
    .map((d) => simulateur.simuler(d))
    .filter((s) => !s.avantAgeLegal);
  if (simulations.length === 0) {
    return {
      ageReference,
      lignes: [],
      meilleure: null,
      meilleureSiVieCourte: null,
      meilleureSiVieLongue: null,
      premiereDateTauxPlein: null,
    };
  }

  const origine = simulations[0];
  const cumulPour = (s: ResultatSimulationDepart, age: number) =>
    cumulPensions({ simulation: s, dateNaissance, ageReference: age, tauxActualisation, dateOrigine: origine.dateEffet });
  const meilleurePour = (age: number) =>
    simulations.reduce((best, s) => (cumulPour(s, age) > cumulPour(best, age) ? s : best)).dateEffet;

  const lignes = simulations.map((s) => {
    const moisAttente = indexMois(s.dateEffet) - indexMois(origine.dateEffet);
    const gain = s.pensionTotale - origine.pensionTotale;
    const perdu = origine.pensionTotale * (moisAttente / 12) + origine.rafpCapital - s.rafpCapital;
    return {
      simulation: s,
      cumul: cumulPour(s, ageReference),
      ageRecuperation: moisAttente === 0 ? s.ageDepartAnnees : gain > 0 ? s.ageDepartAnnees + perdu / gain : null,
    };
  });

  return {
    ageReference,
    lignes,
    meilleure: lignes.reduce((best, l) => (l.cumul > best.cumul ? l : best)),
    meilleureSiVieCourte: meilleurePour(ageReference - 5),
    meilleureSiVieLongue: meilleurePour(ageReference + 5),
    premiereDateTauxPlein: simulations.find((s) => s.decote === 0)?.dateEffet ?? null,
  };
}
