/**
 * Moteur de calcul de la pension de retraite (régime de base + surcote/décote).
 * Fonctions pures, sans JSX ni state React — sur le modèle de
 * src/lib/patrimoine/bareme669CGI.ts.
 */

import { RegimeDetecte } from './parseRIS';

/**
 * Trimestres requis pour le taux plein, par année de naissance.
 * Source : trajectoire de la réforme des retraites 2023 (loi n° 2023-270 du
 * 14 avril 2023), telle que suspendue par la LFSS 2026 jusqu'au 1er janvier
 * 2028 — les générations 1964 et 1965, qui auraient dû voir leur durée
 * d'assurance continuer à augmenter (171, puis 171 ou 172 selon le mois de
 * naissance), restent gelées à 170 trimestres pendant la suspension.
 *
 * ⚠️ Barème à réviser si la suspension prend fin au 1er janvier 2028 (retour
 * à la trajectoire pleine de la réforme 2023) ou si une nouvelle réforme
 * intervient d'ici là.
 *
 * Simplification assumée : la réforme applique en réalité une granularité
 * mensuelle sur certaines générations (ex : la génération 1961 est scindée
 * selon le mois de naissance exact). Cet outil de simulation indicative ne
 * connaît pas le mois de naissance et retient une seule valeur par année
 * civile — à affiner si une granularité mensuelle est disponible.
 */
const TRIMESTRES_REQUIS_PAR_GENERATION: { anneeMax: number; trimestres: number }[] = [
  { anneeMax: 1958, trimestres: 166 },
  { anneeMax: 1960, trimestres: 167 },
  { anneeMax: 1961, trimestres: 168 },
  { anneeMax: 1962, trimestres: 169 },
  { anneeMax: 1965, trimestres: 170 },
  { anneeMax: Infinity, trimestres: 172 },
];

export function trimestresRequisPourGeneration(anneeNaissance: number): number {
  const tranche = TRIMESTRES_REQUIS_PAR_GENERATION.find((t) => anneeNaissance <= t.anneeMax);
  return tranche ? tranche.trimestres : 172;
}

/**
 * Taux de proratisation, plafonné à 100 % : au-delà de trimestresRequis,
 * l'avantage supplémentaire relève de la surcote (calculée séparément),
 * pas d'un ratio > 1 ici.
 */
export function tauxProratisation(trimestresValides: number, trimestresRequis: number): number {
  return Math.min(trimestresValides / trimestresRequis, 1);
}

/**
 * Décote/surcote basée sur l'écart de trimestres validés par rapport aux
 * trimestres requis : -1,25 % par trimestre manquant (plafonné à -20 %),
 * +1,25 % par trimestre excédentaire.
 */
export function decoteSurTrimestres(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) {
    return Math.max(difference * 1.25, -20);
  }
  if (difference > 0) {
    return difference * 1.25;
  }
  return 0;
}

/**
 * Décote/surcote basée sur l'écart de trimestres validés par rapport aux
 * trimestres requis, avec un plafond de -25 % (20 trimestres) au lieu de
 * -20 % — mécanique partagée par plusieurs régimes dont le barème de décote
 * diffère du régime général sur ce seul point (fonction publique, CNAVPL).
 *
 * ⚠️ Ne pas confondre avec decoteSurTrimestres() ci-dessus (plafond -20 %,
 * régime général) : la mécanique (1,25 %/trimestre) est identique, seul le
 * plafond change selon le régime.
 */
export function decoteSurTrimestresPlafond25(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) {
    return Math.max(difference * 1.25, -25);
  }
  if (difference > 0) {
    return difference * 1.25;
  }
  return 0;
}

/**
 * Décote basée sur l'écart d'âge par rapport à l'âge du taux plein
 * automatique (67 ans par défaut) : même barème que decoteSurTrimestres pour
 * un départ anticipé (1,25 % par trimestre d'écart, 4 trimestres par année
 * d'écart, plafonné à -20 %). À partir de l'âge du taux plein automatique,
 * celui-ci est acquis d'office : cette règle ne génère jamais de surcote (la
 * seule surcote possible vient de decoteSurTrimestres, via decoteApplicable).
 */
export function decoteSurAge(ageDepart: number, ageTauxPleinAuto = 67): number {
  if (ageDepart >= ageTauxPleinAuto) {
    return 0;
  }
  const ecartTrimestres = (ageDepart - ageTauxPleinAuto) * 4;
  return Math.max(ecartTrimestres * 1.25, -20);
}

/**
 * Retient la décote/surcote la plus favorable (la moins négative) entre les
 * deux règles : l'utilisateur bénéficie du calcul le plus avantageux.
 */
export function decoteApplicable(decoteSurTrimestres: number, decoteSurAge: number): number {
  return Math.max(decoteSurTrimestres, decoteSurAge);
}

/**
 * Pension de base ajustée : SAM × 50 % × taux de proratisation, puis
 * application de la décote/surcote.
 */
export function pensionBase(
  salaireAnnuelMoyen: number,
  tauxProratisation: number,
  decote: number
): number {
  const tauxPlein = 0.5;
  const pensionBrute = salaireAnnuelMoyen * tauxPlein * tauxProratisation;
  return pensionBrute * (1 + decote / 100);
}

/**
 * Pension complémentaire annuelle d'un régime à points : uniquement
 * calculable si points et valeurPoint sont tous deux connus (pas de valeur
 * par défaut inventée si l'un des deux manque). Constante dans le temps :
 * ne dépend d'aucun âge de départ.
 */
export function pensionComplementaireAnnuelle(regime: RegimeDetecte): number | undefined {
  return regime.points !== undefined && regime.valeurPoint !== undefined
    ? regime.points * regime.valeurPoint
    : undefined;
}

/**
 * Rachat de trimestres (« versement pour la retraite ») — coût par trimestre.
 *
 * Barème CNAV 2026 (circulaire n° 2026-04 du 5 février 2026), gelé depuis
 * 2013 : seuls les seuils de revenus (indexés sur le PASS) sont réactualisés
 * chaque année. Applicable au régime général ET aux indépendants SSI
 * (retraite de base alignée sur le régime général depuis 2018).
 *
 * ⚠️ NE PAS utiliser pour les professions libérales réglementées (CIPAV,
 * CARMF, CARPIMKO, CAVEC...) : leur barème de rachat n'est pas public, chaque
 * caisse établit un devis individualisé sur demande.
 *
 * Source : moneyvox.fr, citant la circulaire CNAV n° 2026-04. À
 * vérifier/réactualiser chaque année si une nouvelle circulaire CNAV est
 * publiée.
 */
export type OptionRachat = 'tauxSeul' | 'tauxEtDuree';

interface TrancheRachat {
  bas: number; // coût fixe si revenu < 36 045 €
  pourcentage: number; // % du revenu si 36 045 € <= revenu <= 48 060 €
  haut: number; // coût fixe si revenu > 48 060 €
}

const BAREME_RACHAT_TAUX_SEUL: Record<number, TrancheRachat> = {
  20: { bas: 1055, pourcentage: 3.8, haut: 1407 },
  21: { bas: 1076, pourcentage: 3.87, haut: 1434 },
  22: { bas: 1097, pourcentage: 3.95, haut: 1462 },
  23: { bas: 1118, pourcentage: 4.03, haut: 1491 },
  24: { bas: 1168, pourcentage: 4.2, haut: 1557 },
  25: { bas: 1219, pourcentage: 4.39, haut: 1625 },
  26: { bas: 1271, pourcentage: 4.58, haut: 1694 },
  27: { bas: 1324, pourcentage: 4.77, haut: 1765 },
  28: { bas: 1377, pourcentage: 4.96, haut: 1836 },
  29: { bas: 1432, pourcentage: 5.16, haut: 1909 },
  30: { bas: 1487, pourcentage: 5.35, haut: 1983 },
  31: { bas: 1543, pourcentage: 5.55, haut: 2057 },
  32: { bas: 1599, pourcentage: 5.76, haut: 2132 },
  33: { bas: 1656, pourcentage: 5.96, haut: 2208 },
  34: { bas: 1713, pourcentage: 6.17, haut: 2284 },
  35: { bas: 1771, pourcentage: 6.38, haut: 2361 },
  36: { bas: 1828, pourcentage: 6.58, haut: 2438 },
  37: { bas: 1886, pourcentage: 6.79, haut: 2515 },
  38: { bas: 1945, pourcentage: 7.0, haut: 2593 },
  39: { bas: 2005, pourcentage: 7.22, haut: 2673 },
  40: { bas: 2065, pourcentage: 7.43, haut: 2753 },
  41: { bas: 2126, pourcentage: 7.65, haut: 2834 },
  42: { bas: 2187, pourcentage: 7.87, haut: 2915 },
  43: { bas: 2247, pourcentage: 8.09, haut: 2995 },
  44: { bas: 2306, pourcentage: 8.3, haut: 3075 },
  45: { bas: 2366, pourcentage: 8.52, haut: 3154 },
  46: { bas: 2426, pourcentage: 8.74, haut: 3235 },
  47: { bas: 2488, pourcentage: 8.96, haut: 3317 },
  48: { bas: 2549, pourcentage: 9.18, haut: 3398 },
  49: { bas: 2610, pourcentage: 9.4, haut: 3479 },
  50: { bas: 2672, pourcentage: 9.62, haut: 3563 },
  51: { bas: 2734, pourcentage: 9.84, haut: 3646 },
  52: { bas: 2796, pourcentage: 10.07, haut: 3728 },
  53: { bas: 2857, pourcentage: 10.29, haut: 3810 },
  54: { bas: 2919, pourcentage: 10.51, haut: 3891 },
  55: { bas: 2980, pourcentage: 10.73, haut: 3973 },
  56: { bas: 3041, pourcentage: 10.95, haut: 4055 },
  57: { bas: 3103, pourcentage: 11.17, haut: 4138 },
  58: { bas: 3162, pourcentage: 11.39, haut: 4216 },
  59: { bas: 3220, pourcentage: 11.59, haut: 4294 },
  60: { bas: 3275, pourcentage: 11.79, haut: 4367 },
  61: { bas: 3329, pourcentage: 11.99, haut: 4439 },
  62: { bas: 3383, pourcentage: 12.18, haut: 4510 },
  63: { bas: 3298, pourcentage: 11.87, haut: 4397 },
  64: { bas: 3214, pourcentage: 11.57, haut: 4285 },
  65: { bas: 3129, pourcentage: 11.27, haut: 4172 },
  66: { bas: 3044, pourcentage: 10.96, haut: 4059 },
};

const BAREME_RACHAT_TAUX_ET_DUREE: Record<number, TrancheRachat> = {
  20: { bas: 1564, pourcentage: 5.63, haut: 2085 },
  21: { bas: 1594, pourcentage: 5.74, haut: 2126 },
  22: { bas: 1625, pourcentage: 5.85, haut: 2167 },
  23: { bas: 1657, pourcentage: 5.96, haut: 2209 },
  24: { bas: 1731, pourcentage: 6.23, haut: 2308 },
  25: { bas: 1806, pourcentage: 6.5, haut: 2408 },
  26: { bas: 1883, pourcentage: 6.78, haut: 2511 },
  27: { bas: 1961, pourcentage: 7.06, haut: 2615 },
  28: { bas: 2041, pourcentage: 7.35, haut: 2721 },
  29: { bas: 2122, pourcentage: 7.64, haut: 2829 },
  30: { bas: 2204, pourcentage: 7.93, haut: 2938 },
  31: { bas: 2286, pourcentage: 8.23, haut: 3048 },
  32: { bas: 2370, pourcentage: 8.53, haut: 3160 },
  33: { bas: 2454, pourcentage: 8.84, haut: 3272 },
  34: { bas: 2539, pourcentage: 9.14, haut: 3385 },
  35: { bas: 2624, pourcentage: 9.45, haut: 3499 },
  36: { bas: 2709, pourcentage: 9.76, haut: 3613 },
  37: { bas: 2795, pourcentage: 10.06, haut: 3727 },
  38: { bas: 2882, pourcentage: 10.38, haut: 3843 },
  39: { bas: 2971, pourcentage: 10.7, haut: 3961 },
  40: { bas: 3060, pourcentage: 11.02, haut: 4080 },
  41: { bas: 3150, pourcentage: 11.34, haut: 4201 },
  42: { bas: 3240, pourcentage: 11.67, haut: 4320 },
  43: { bas: 3329, pourcentage: 11.99, haut: 4439 },
  44: { bas: 3418, pourcentage: 12.3, haut: 4557 },
  45: { bas: 3506, pourcentage: 12.62, haut: 4674 },
  46: { bas: 3596, pourcentage: 12.95, haut: 4794 },
  47: { bas: 3687, pourcentage: 13.27, haut: 4915 },
  48: { bas: 3777, pourcentage: 13.6, haut: 5036 },
  49: { bas: 3867, pourcentage: 13.92, haut: 5156 },
  50: { bas: 3960, pourcentage: 14.26, haut: 5279 },
  51: { bas: 4052, pourcentage: 14.59, haut: 5402 },
  52: { bas: 4143, pourcentage: 14.92, haut: 5525 },
  53: { bas: 4234, pourcentage: 15.25, haut: 5646 },
  54: { bas: 4325, pourcentage: 15.57, haut: 5767 },
  55: { bas: 4416, pourcentage: 15.9, haut: 5888 },
  56: { bas: 4507, pourcentage: 16.23, haut: 6009 },
  57: { bas: 4599, pourcentage: 16.56, haut: 6132 },
  58: { bas: 4686, pourcentage: 16.87, haut: 6248 },
  59: { bas: 4772, pourcentage: 17.18, haut: 6363 },
  60: { bas: 4854, pourcentage: 17.48, haut: 6472 },
  61: { bas: 4933, pourcentage: 17.76, haut: 6578 },
  62: { bas: 5013, pourcentage: 18.05, haut: 6684 },
  63: { bas: 4888, pourcentage: 17.6, haut: 6517 },
  64: { bas: 4762, pourcentage: 17.15, haut: 6350 },
  65: { bas: 4637, pourcentage: 16.7, haut: 6183 },
  66: { bas: 4512, pourcentage: 16.24, haut: 6015 },
};

const SEUIL_REVENU_BAS = 36045;
const SEUIL_REVENU_HAUT = 48060;

/**
 * Coût d'un trimestre racheté, selon l'âge au moment du rachat, le revenu
 * moyen des 3 dernières années (donnée distincte du SAM) et l'option
 * choisie.
 *
 * En dessous de 20 ans : cas limite sans portée pratique (âge minimum
 * légal d'entrée dans la vie active), on retient la borne basse du barème.
 * Au-delà de 66 ans : retourne `undefined` — contrairement à la borne
 * basse, ce n'est pas une limite de couverture du barème mais une
 * impossibilité légale (le rachat de trimestres n'est plus ouvert
 * au-delà de 66 ans), donc pas de coût à afficher, même approximatif.
 */
export function coutRachatTrimestre(
  age: number,
  revenuMoyen3DernieresAnnees: number,
  option: OptionRachat
): number | undefined {
  // Années révolues (floor), pas arrondi au plus proche : à 66,99 ans on a
  // encore légalement 66 ans, pas 67.
  const ageRevolu = Math.floor(age);
  if (ageRevolu > 66) {
    return undefined;
  }
  const ageBareme = Math.max(20, ageRevolu);
  const bareme = option === 'tauxSeul' ? BAREME_RACHAT_TAUX_SEUL : BAREME_RACHAT_TAUX_ET_DUREE;
  const tranche = bareme[ageBareme];

  if (revenuMoyen3DernieresAnnees < SEUIL_REVENU_BAS) {
    return tranche.bas;
  }
  if (revenuMoyen3DernieresAnnees <= SEUIL_REVENU_HAUT) {
    return revenuMoyen3DernieresAnnees * (tranche.pourcentage / 100);
  }
  return tranche.haut;
}

/**
 * Point mort du rachat, en années : nombre d'années de pension nécessaires
 * pour rentabiliser le coût total, brut de fiscalité (le rachat de
 * trimestres est déductible du revenu imposable, non pris en compte ici).
 */
export function pointMort(coutTotal: number, gainPensionAnnuel: number): number {
  return coutTotal / gainPensionAnnuel;
}
