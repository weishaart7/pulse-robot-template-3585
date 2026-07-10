import { differenceInYears } from 'date-fns';

/**
 * Barème fiscal de l'usufruit (art. 669 I du CGI) : valeur de l'usufruit et
 * de la nue-propriété en fonction de l'âge de l'usufruitier au jour du
 * démembrement. Isolé de qualification.ts, qui ne gère que la qualification
 * propre/commun/indivision, pas la valorisation du démembrement.
 */

export interface TrancheBareme669 {
  ageMax: number;
  usufruit: number;
  nuePropriete: number;
}

export const BAREME_669_CGI: TrancheBareme669[] = [
  { ageMax: 21, usufruit: 0.90, nuePropriete: 0.10 },
  { ageMax: 31, usufruit: 0.80, nuePropriete: 0.20 },
  { ageMax: 41, usufruit: 0.70, nuePropriete: 0.30 },
  { ageMax: 51, usufruit: 0.60, nuePropriete: 0.40 },
  { ageMax: 61, usufruit: 0.50, nuePropriete: 0.50 },
  { ageMax: 71, usufruit: 0.40, nuePropriete: 0.60 },
  { ageMax: 81, usufruit: 0.30, nuePropriete: 0.70 },
  { ageMax: 91, usufruit: 0.20, nuePropriete: 0.80 },
  { ageMax: Infinity, usufruit: 0.10, nuePropriete: 0.90 },
];

export const computeAge = (dateNaissance: string | undefined | null): number | null => {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  return differenceInYears(new Date(), d);
};

export const getTrancheBareme669 = (age: number): TrancheBareme669 => {
  return BAREME_669_CGI.find((t) => age < t.ageMax) ?? BAREME_669_CGI[BAREME_669_CGI.length - 1];
};

/**
 * Usufruit conjoint ou successif (plusieurs usufruitiers simultanés) : le
 * barème s'applique sur l'âge du plus jeune usufruitier, l'usufruit durant
 * jusqu'au décès du dernier survivant (doctrine BOFiP, BOI-ENR-DMTG-10-40-10-30).
 */
export const getTrancheBaremeForYoungest = (ages: number[]): TrancheBareme669 | null => {
  const validAges = ages.filter((a): a is number => typeof a === 'number' && !isNaN(a));
  if (validAges.length === 0) return null;
  return getTrancheBareme669(Math.min(...validAges));
};
