/**
 * Retraite anticipée pour carrière longue (RACL) — audit Retraite du
 * 2026-09-29, phase 5. Fonctions pures. Source : circulaire Cnav n° 2026-29
 * du 04/09/2026 (pensions prenant effet à compter du 01/09/2026), paramètres
 * dans `params-retraite.json` (bloc `carriereLongue`).
 *
 * Deux conditions cumulatives :
 * - début d'activité : 5 trimestres validés (4 si né au 4e trimestre civil)
 *   à la fin de l'année civile du 16e, 18e, 20e ou 21e anniversaire ;
 * - durée cotisée tous régimes de base ≥ durée requise pour le taux plein de
 *   la génération. Trimestres cotisés (RIS, projection, autres régimes de
 *   base) + réputés cotisés visibles au RIS : maternité (sans limite),
 *   maladie (4 max), chômage indemnisé (4 max). Service national,
 *   invalidité, AVPF/Ava, majorations pour enfants, rachats : invisibles au
 *   RIS, non comptés (choix prudent validé le 2026-09-29 — éligibilité
 *   possiblement sous-estimée, jamais accordée à tort).
 *
 * Effets : pension à taux plein (aucune décote, donc aucun coefficient
 * d'anticipation Agirc-Arrco).
 */

import { DateNaissance, dateAnniversaireLegal, trimestresRequisPourGeneration } from './calcul';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';
import { PARAMETRES_CARRIERE_LONGUE } from './parametres';

const cleMois = (annee: number, mois: number) => `${annee}-${String(mois).padStart(2, '0')}`;

/** Âges de départ anticipé de la génération (vide si hors barème). */
export function agesCarriereLongue(dateNaissance: DateNaissance): { debutAvant: number; ans: number; mois: number }[] {
  const cle = cleMois(dateNaissance.annee, dateNaissance.mois);
  const generation = PARAMETRES_CARRIERE_LONGUE.generations.find((g) => cle >= g.naissanceMin && cle <= g.naissanceMax);
  return generation?.ages ?? [];
}

/**
 * Condition de début d'activité pour une borne d'âge (16, 18, 20 ou 21 ans) :
 * trimestres validés (cotisés + assimilés) jusqu'à la fin de l'année civile
 * de l'anniversaire.
 */
export function debutActiviteRempli(
  dateNaissance: DateNaissance,
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee'],
  debutAvant: number
): boolean {
  const anneeAnniversaire = dateNaissance.annee + debutAvant;
  const valides = parAnnee
    .filter((a) => a.annee <= anneeAnniversaire)
    .reduce((total, a) => total + a.cotises + a.assimiles, 0);
  const requis =
    dateNaissance.mois >= 10
      ? PARAMETRES_CARRIERE_LONGUE.trimestresDebutActiviteNeAuQuatriemeTrimestre
      : PARAMETRES_CARRIERE_LONGUE.trimestresDebutActivite;
  return valides >= requis;
}

/**
 * Durée cotisée retenue pour la RACL : cotisés connus + projetés + autres
 * régimes de base + réputés cotisés (maternité, maladie et chômage
 * indemnisé plafonnés).
 */
export function dureeCotiseeCarriereLongue(params: {
  trimestres: ResultatTrimestresCotisesEtAssimiles;
  trimestresProjetes: number;
  trimestresAutresRegimes: number;
}): number {
  const { trimestres, trimestresProjetes, trimestresAutresRegimes } = params;
  const { plafondsReputesCotises } = PARAMETRES_CARRIERE_LONGUE;
  const reputes =
    trimestres.assimilesParNature.maternite +
    Math.min(plafondsReputesCotises.maladie, trimestres.assimilesParNature.maladie) +
    Math.min(plafondsReputesCotises.chomageIndemnise, trimestres.assimilesParNature.chomageIndemnise);
  return trimestres.cotises + trimestresProjetes + trimestresAutresRegimes + reputes;
}

export interface OptionCarriereLongue {
  debutAvant: number;
  ageDepart: { ans: number; mois: number };
  /** 1er jour du mois suivant l'anniversaire, au plus tôt le 01/09/2026 et le mois prochain. */
  dateEffet: Date;
  debutActiviteRempli: boolean;
  dureeCotisee: number;
  dureeRequise: number;
  eligible: boolean;
}

export interface ResultatCarriereLongue {
  options: OptionCarriereLongue[];
  /** Première date de départ anticipé ouverte, `null` si aucune. */
  premiereDateEligible: Date | null;
}

/**
 * Évalue chaque âge de départ anticipé de la génération. `trimestresProjetesJusqua`
 * donne les trimestres futurs supposés cotisés jusqu'à une date d'effet
 * (même projection que la retraite de base).
 */
export function evaluerCarriereLongue(params: {
  dateNaissance: DateNaissance;
  trimestres: ResultatTrimestresCotisesEtAssimiles;
  trimestresAutresRegimes: number;
  trimestresProjetesJusqua: (dateEffet: Date) => number;
  aujourdHui: Date;
}): ResultatCarriereLongue {
  const { dateNaissance, trimestres, trimestresAutresRegimes, trimestresProjetesJusqua, aujourdHui } = params;
  const dateMinimale = new Date(`${PARAMETRES_CARRIERE_LONGUE.dateEffetMinimale}T00:00:00Z`);
  const moisProchain = new Date(Date.UTC(aujourdHui.getUTCFullYear(), aujourdHui.getUTCMonth() + 1, 1));
  const plancher = Math.max(dateMinimale.getTime(), moisProchain.getTime());

  const options = agesCarriereLongue(dateNaissance).map(({ debutAvant, ans, mois }) => {
    const anniversaire = dateAnniversaireLegal(dateNaissance, { ans, mois });
    const moisSuivant = Date.UTC(anniversaire.getUTCFullYear(), anniversaire.getUTCMonth() + 1, 1);
    const dateEffet = new Date(Math.max(moisSuivant, plancher));
    const debut = debutActiviteRempli(dateNaissance, trimestres.parAnnee, debutAvant);
    const dureeCotisee = dureeCotiseeCarriereLongue({
      trimestres,
      trimestresProjetes: trimestresProjetesJusqua(dateEffet),
      trimestresAutresRegimes,
    });
    const dureeRequise = trimestresRequisPourGeneration(dateNaissance, dateEffet);
    return {
      debutAvant,
      ageDepart: { ans, mois },
      dateEffet,
      debutActiviteRempli: debut,
      dureeCotisee,
      dureeRequise,
      eligible: debut && dureeCotisee >= dureeRequise,
    };
  });

  const eligibles = options.filter((o) => o.eligible).map((o) => o.dateEffet.getTime());
  return {
    options,
    premiereDateEligible: eligibles.length > 0 ? new Date(Math.min(...eligibles)) : null,
  };
}

/**
 * Départ anticipé ouvert à une date donnée : une option éligible dont la
 * date d'effet est atteinte (la durée cotisée n'est pas réévaluée à cette
 * date : les trimestres projetés ne font qu'augmenter avec le temps).
 */
export function carriereLongueOuverteA(resultat: ResultatCarriereLongue, dateEffet: Date): boolean {
  return resultat.options.some((o) => o.eligible && o.dateEffet.getTime() <= dateEffet.getTime());
}
