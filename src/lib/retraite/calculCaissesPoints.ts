/**
 * Moteur commun des caisses de retraite à points (phase 3.2, A1) —
 * fonctions pures, paramétrées caisse par caisse dans le bloc
 * `caissesPoints` de `params-retraite.json`. Remplace, pour les caisses
 * connues, le calcul « points × valeur du point lue au RIS »
 * (`pensionComplementaireAnnuelle()`), conservé pour les autres.
 *
 * Séquence (validée le 2026-10-22) : caisse reconnue au nom du régime dans
 * le RIS (ou déclarée comme caisse du libéral) → points acquis (RIS) +
 * points projetés (statut libéral de cette caisse, revenu futur) × valeur de
 * service du millésime → coefficient d'âge (surcote) → majoration pour 3
 * enfants → réversion au taux de la caisse.
 *
 * Caisses paramétrées : CARMF complémentaire et ASV (médecins), CIPAV, CAVEC.
 * - Taux plein à l'âge légal ; un départ plus tôt n'est possible que par un
 *   dispositif de départ anticipé, retenu ici à taux plein (coefficient 1).
 * - Surcote : +1,25 % par trimestre de l'âge légal à 65 ans, puis la
 *   pension à 65 ans majorée de 0,75 % par trimestre jusqu'à 70 ans.
 * - ASV : médecins conventionnés seulement (case dans Carrière).
 * - Capital optionnel de la CARMF (20 points ou moins) : non retenu.
 * - CIPAV : cotisation 9 % jusqu'à 1 PASS et 22 % de 1 à 3 PASS ÷ valeur
 *   d'achat ; minoration identique à la base (1,25 % par trimestre
 *   manquant, le plus favorable entre âge et durée, base liquidée en même
 *   temps) ; majoration de report (30 ans d'affiliation) non modélisée.
 * - CAVEC : classe selon le revenu (points par an) ; taux plein à 65 ans,
 *   minoration de 1,25 % par trimestre manquant avant, surcote de 1,25 % par
 *   trimestre après, dans la limite de 20 trimestres ; sous 500 points
 *   (après minoration ou surcote), versement unique de 15 annuités, exclu de
 *   la pension annuelle.
 */

import { RegimeDetecte } from './parseRIS';
import { DateNaissance, ageEnMois, ageLegalPourGeneration } from './calcul';
import { MILLESIME_COURANT, PARAMETRES_CAISSES_POINTS, ParametresCaissePoints } from './parametres';
import { decoteCNAVPL } from './calculCNAVPL';

export type IdentifiantCaisse = keyof typeof PARAMETRES_CAISSES_POINTS;

export function caisseDuRegime(nom: string): IdentifiantCaisse | null {
  for (const [id, caisse] of Object.entries(PARAMETRES_CAISSES_POINTS) as [IdentifiantCaisse, ParametresCaissePoints][]) {
    if (!new RegExp(caisse.motifNom, 'i').test(nom)) continue;
    if (caisse.exclureMotifNom && new RegExp(caisse.exclureMotifNom, 'i').test(nom)) continue;
    return id;
  }
  return null;
}

/** Caisses ouvertes à un libéral déclarant cette caisse (ASV si conventionné). */
export function caissesDuLiberal(caisseLiberale: string | null, conventionne: boolean): IdentifiantCaisse[] {
  if (!caisseLiberale) return [];
  return (Object.entries(PARAMETRES_CAISSES_POINTS) as [IdentifiantCaisse, ParametresCaissePoints][])
    .filter(([, caisse]) => caisse.caisseLiberale === caisseLiberale && (!caisse.conventionneSeulement || conventionne))
    .map(([id]) => id);
}

/** Points acquis sur une année complète pour un revenu annuel. */
export function pointsAnnuelsCaisse(caisse: ParametresCaissePoints, revenuAnnuel: number): number {
  const revenu = Math.max(0, revenuAnnuel);
  const { acquisition } = caisse;
  if (acquisition.mode === 'classes') {
    const classe = acquisition.classes.find((c) => c.revenuMax === null || revenu <= c.revenuMax);
    return classe?.points ?? 0;
  }
  if (acquisition.mode === 'tranchesPrixAchat') {
    let cotisation = 0;
    let plancher = 0;
    for (const tranche of acquisition.tranches) {
      const plafond = tranche.jusquAPass * MILLESIME_COURANT.pass;
      cotisation += Math.max(0, Math.min(revenu, plafond) - plancher) * tranche.taux;
      plancher = plafond;
    }
    return cotisation / acquisition.prixAchatPoint;
  }
  if (acquisition.mode === 'revenuParPoint') {
    return Math.min(acquisition.pointsMaxAnnuels, revenu / acquisition.revenuParPoint);
  }
  return acquisition.pointsForfait + Math.min(acquisition.pointsMaxProportionnels, revenu / acquisition.revenuParPoint);
}

/**
 * Coefficient d'âge à la liquidation : 1 jusqu'au début de la première
 * tranche de surcote, puis surcote par trimestre entier, additive dans une
 * tranche, multiplicative sur la tranche précédente si `multiplicatif`.
 */
export function coefficientAgeCaisse(caisse: ParametresCaissePoints, ageDepart: number, ageLegal: number): number {
  let coefficient = 1;
  for (const tranche of caisse.surcote) {
    const debut = tranche.depuis === 'ageLegal' ? ageLegal : tranche.depuis;
    const trimestres = Math.max(0, Math.floor((Math.min(ageDepart, tranche.jusquA) - debut) * 4 + 1e-6));
    const majoration = trimestres * tranche.tauxParTrimestre;
    coefficient = tranche.multiplicatif ? coefficient * (1 + majoration) : coefficient + majoration;
  }
  return coefficient;
}

export interface DetailCaissePoints {
  id: IdentifiantCaisse;
  nom: string;
  pointsAcquis: number;
  pointsProjetes: number;
  valeurServicePoint: number;
  coefficientAge: number;
  majorationEnfants: number;
  /** Rente annuelle (0 si versée en capital). */
  pensionAnnuelle: number;
  /** Versement unique sous le seuil de points de la caisse, exclu de la pension annuelle. */
  capital: number;
  tauxReversion: number;
}

export interface EntreeCaissesPoints {
  regimesPoints: RegimeDetecte[];
  dateNaissance: DateNaissance | null;
  dateEffet: Date;
  nombreEnfantsEligibles: number;
  /** Projection (statut libéral) : caisse déclarée, revenu et trimestres projetés. */
  caisseLiberale: string | null;
  conventionne: boolean;
  revenuAnnuel: number | null;
  trimestresProjetes: number;
  /** Trimestres manquants tous régimes à la date d'effet (minoration liée à la base). */
  trimestresManquants: number;
}

export interface ResultatCaissesPoints {
  details: DetailCaissePoints[];
  total: number;
  /** Régimes à points non reconnus : calcul « points × valeur lue au RIS » par l'appelant. */
  regimesNonReconnus: RegimeDetecte[];
}

export function calculerCaissesPoints(entree: EntreeCaissesPoints): ResultatCaissesPoints {
  const pointsParCaisse = new Map<IdentifiantCaisse, number>();
  const regimesNonReconnus: RegimeDetecte[] = [];
  for (const regime of entree.regimesPoints) {
    const id = caisseDuRegime(regime.nom);
    if (id === null) regimesNonReconnus.push(regime);
    else pointsParCaisse.set(id, (pointsParCaisse.get(id) ?? 0) + (regime.points ?? 0));
  }
  const caissesProjetees = caissesDuLiberal(entree.caisseLiberale, entree.conventionne);
  for (const id of caissesProjetees) if (!pointsParCaisse.has(id)) pointsParCaisse.set(id, 0);

  const ageDepart = entree.dateNaissance ? ageEnMois(entree.dateNaissance, entree.dateEffet) / 12 : null;
  const resultatAgeLegal = entree.dateNaissance ? ageLegalPourGeneration(entree.dateNaissance, entree.dateEffet) : null;
  const ageLegal = resultatAgeLegal?.stable ? resultatAgeLegal.age.ans + resultatAgeLegal.age.mois / 12 : null;

  const details: DetailCaissePoints[] = [];
  for (const [id, pointsAcquis] of pointsParCaisse) {
    const caisse = PARAMETRES_CAISSES_POINTS[id];
    const pointsProjetes =
      caissesProjetees.includes(id) && entree.revenuAnnuel !== null
        ? (pointsAnnuelsCaisse(caisse, entree.revenuAnnuel) * Math.max(0, entree.trimestresProjetes)) / 4
        : 0;
    const coefficientSurcote =
      ageDepart !== null && ageLegal !== null ? coefficientAgeCaisse(caisse, ageDepart, ageLegal) : 1;
    // Minoration de la base (CNAVPL) : écart de trimestres, plus favorable avec l'âge.
    const minoration = caisse.decoteCommeBase
      ? decoteCNAVPL(-Math.max(0, entree.trimestresManquants), 0, ageDepart)
      : 0;
    // Minoration propre (âge de taux plein fixe) : trimestres manquants arrondis au supérieur.
    const minorationAge =
      caisse.decoteAge && ageDepart !== null
        ? -Math.max(0, Math.ceil((caisse.decoteAge.ageTauxPlein - ageDepart) * 4 - 1e-6)) *
          caisse.decoteAge.tauxParTrimestre
        : 0;
    const coefficientAge = coefficientSurcote * (1 + minoration / 100) * (1 + minorationAge);
    const pensionAvantMajoration = (pointsAcquis + pointsProjetes) * caisse.valeurServicePoint * coefficientAge;
    const majorationEnfants =
      entree.nombreEnfantsEligibles >= 3 ? (pensionAvantMajoration * caisse.majorationTroisEnfantsPct) / 100 : 0;
    const enCapital =
      caisse.capital !== undefined && (pointsAcquis + pointsProjetes) * coefficientAge < caisse.capital.seuilPoints;
    const capital = enCapital ? (pensionAvantMajoration + majorationEnfants) * caisse.capital!.multipleAnnuites : 0;
    details.push({
      id,
      nom: caisse.nom,
      pointsAcquis,
      pointsProjetes,
      valeurServicePoint: caisse.valeurServicePoint,
      coefficientAge,
      majorationEnfants,
      pensionAnnuelle: enCapital ? 0 : pensionAvantMajoration + majorationEnfants,
      capital,
      tauxReversion: caisse.tauxReversion,
    });
  }
  return {
    details,
    total: details.reduce((total, d) => total + d.pensionAnnuelle, 0),
    regimesNonReconnus,
  };
}

/** Réversion annuelle des caisses à points (taux propre à chaque caisse). */
export function reversionCaissesPoints(details: DetailCaissePoints[]): number {
  // Hors majoration pour enfants (non transmise, comme au régime général).
  return details.reduce(
    (total, d) => total + (d.pensionAnnuelle > 0 ? (d.pensionAnnuelle - d.majorationEnfants) * d.tauxReversion : 0),
    0
  );
}
