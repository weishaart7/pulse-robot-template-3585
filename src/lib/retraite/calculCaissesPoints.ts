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
 * Caisses paramétrées : CARMF complémentaire et ASV (médecins), CIPAV, CAVEC,
 * CNBF complémentaire (taux de la classe choisie sur 5 tranches de revenu ÷
 * coût d'acquisition ; minoration alignée sur la base), RCI (8,1 % jusqu'au
 * PASS et 9,1 % de 1 à 4 PASS ÷ revenu de référence ; abattement de 1 % par
 * trimestre manquant jusqu'à 12 puis 1,25 %, 22 % au plus, trimestres
 * manquants = plus favorable entre durée et âge de 67 ans).
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
 * - Ircantec (contractuels publics, statut `contractuel_public`) : 5,60 %
 *   jusqu'au PASS et 15,60 % de 1 à 8 PASS ÷ salaire de référence ;
 *   minoration selon les grilles d'anticipation Agirc-Arrco si la base est
 *   minorée (âge de référence 67 ans) ; surcote de 0,625 % par trimestre au-delà
 *   de la durée requise entre l'âge légal et 67 ans, puis 0,75 % par trimestre ;
 *   majoration de 10 % (3 enfants) à 30 % (7 et plus) ; sous 300 points,
 *   capital = points × salaire de référence.
 * - CARPIMKO complémentaire : depuis 2026, 8,70 % du revenu ramené entre 0,5 et
 *   3 PASS ÷ coût d'acquisition ; minoration identique à la base ; surcote de
 *   1,25 % par trimestre au-delà de la durée requise, 20 trimestres au plus.
 *   ASV (conventionnés) : 24,5 points + 0,40 % du revenu (5 PASS) ÷ coût du point,
 *   taux plein à 65 ans.
 * - CARCDSF complémentaire (dentistes et sages-femmes) : 6 points + 11,35 % du
 *   revenu entre 0,65 et 5 PASS ÷ coût d'acquisition ; taux plein à 67 ans,
 *   minoration et surcote de 1,25 % par trimestre. PCV propre à la profession
 *   déclarée (`CARCDSF_CD` : 10 + 1,93 points ; `CARCDSF_SF` : 18 points) ; les
 *   points PCV lus au RIS vont à la PCV de la profession déclarée (dentiste par
 *   défaut).
 */

import { RegimeDetecte } from './parseRIS';
import { DateNaissance, ageEnMois, ageLegalPourGeneration } from './calcul';
import { MILLESIME_COURANT, PARAMETRES_CAISSES_POINTS, ParametresCaissePoints } from './parametres';
import { decoteCNAVPL } from './calculCNAVPL';
import { coefficientAnticipationAgircArrco } from './calculAgircArrco';

export type IdentifiantCaisse = keyof typeof PARAMETRES_CAISSES_POINTS;

function ouvertePar(caisse: ParametresCaissePoints, caisseLiberale: string | null): boolean {
  if (!caisseLiberale) return false;
  return Array.isArray(caisse.caisseLiberale)
    ? caisse.caisseLiberale.includes(caisseLiberale)
    : caisse.caisseLiberale === caisseLiberale;
}

/**
 * Caisse reconnue au libellé du RIS. Plusieurs caisses possibles (PCV des
 * dentistes et des sages-femmes) : celle de la caisse déclarée, sinon la première.
 */
export function caisseDuRegime(nom: string, caisseLiberale: string | null = null): IdentifiantCaisse | null {
  const candidates = (Object.entries(PARAMETRES_CAISSES_POINTS) as [IdentifiantCaisse, ParametresCaissePoints][]).filter(
    ([, caisse]) =>
      new RegExp(caisse.motifNom, 'i').test(nom) &&
      !(caisse.exclureMotifNom && new RegExp(caisse.exclureMotifNom, 'i').test(nom))
  );
  return (candidates.find(([, caisse]) => ouvertePar(caisse, caisseLiberale)) ?? candidates[0])?.[0] ?? null;
}

/** Caisses ouvertes à un libéral déclarant cette caisse (ASV, PCV si conventionné). */
export function caissesDuLiberal(caisseLiberale: string | null, conventionne: boolean): IdentifiantCaisse[] {
  return (Object.entries(PARAMETRES_CAISSES_POINTS) as [IdentifiantCaisse, ParametresCaissePoints][])
    .filter(([, caisse]) => ouvertePar(caisse, caisseLiberale) && (!caisse.conventionneSeulement || conventionne))
    .map(([id]) => id);
}

/** Points acquis sur une année complète pour un revenu annuel. */
export function pointsAnnuelsCaisse(
  caisse: ParametresCaissePoints,
  revenuAnnuel: number,
  classe?: string | null
): number {
  const revenu = Math.max(0, revenuAnnuel);
  const { acquisition } = caisse;
  if (acquisition.mode === 'tranchesEurosParClasse') {
    const taux = acquisition.tauxParClasse[classe ?? ''] ?? acquisition.tauxParClasse[acquisition.classeParDefaut];
    let cotisation = 0;
    let plancher = 0;
    acquisition.bornes.forEach((borne, i) => {
      cotisation += Math.max(0, Math.min(revenu, borne) - plancher) * taux[i];
      plancher = borne;
    });
    return cotisation / acquisition.prixAchatPoint;
  }
  if (acquisition.mode === 'classes') {
    const classe = acquisition.classes.find((c) => c.revenuMax === null || revenu <= c.revenuMax);
    return classe?.points ?? 0;
  }
  if (acquisition.mode === 'tranchesPrixAchat') {
    const assiette = Math.max(revenu, (acquisition.assietteMinEnPass ?? 0) * MILLESIME_COURANT.pass);
    let cotisation = 0;
    let plancher = 0;
    for (const tranche of acquisition.tranches) {
      const plafond = tranche.jusquAPass * MILLESIME_COURANT.pass;
      cotisation += Math.max(0, Math.min(assiette, plafond) - plancher) * tranche.taux;
      plancher = plafond;
    }
    return (acquisition.pointsForfait ?? 0) + cotisation / acquisition.prixAchatPoint;
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
 * `conditionDuree` : trimestres plafonnés à l'excédent sur la durée requise.
 */
export function coefficientAgeCaisse(
  caisse: ParametresCaissePoints,
  ageDepart: number,
  ageLegal: number,
  trimestresExcedentaires = Infinity
): number {
  let coefficient = 1;
  for (const tranche of caisse.surcote) {
    const debut = tranche.depuis === 'ageLegal' ? ageLegal : tranche.depuis;
    const trimestresAge = Math.max(0, Math.floor((Math.min(ageDepart, tranche.jusquA) - debut) * 4 + 1e-6));
    const trimestres = Math.min(
      tranche.conditionDuree ? Math.min(trimestresAge, Math.max(0, Math.floor(trimestresExcedentaires))) : trimestresAge,
      tranche.trimestresMax ?? Infinity
    );
    const majoration = trimestres * tranche.tauxParTrimestre;
    coefficient = tranche.multiplicatif ? coefficient * (1 + majoration) : coefficient + majoration;
  }
  return coefficient;
}

/**
 * Abattement par trimestres manquants (RCI) : nombre retenu = le plus
 * favorable entre les trimestres manquants tous régimes et les trimestres
 * jusqu'à l'âge de taux plein, borné ; 0 si la durée est atteinte.
 */
export function abattementParTrimestres(
  bareme: NonNullable<ParametresCaissePoints['abattementTrimestres']>,
  trimestresManquants: number,
  ageDepart: number | null
): number {
  const manquantsDuree = Math.max(0, Math.ceil(trimestresManquants));
  if (manquantsDuree === 0) return 0;
  const manquantsAge =
    ageDepart === null ? manquantsDuree : Math.max(0, Math.ceil((bareme.ageTauxPlein - ageDepart) * 4 - 1e-6));
  const retenus = Math.min(manquantsDuree, manquantsAge, bareme.trimestresMax);
  return (
    Math.min(retenus, bareme.palier) * bareme.tauxJusquAuPalier +
    Math.max(0, retenus - bareme.palier) * bareme.tauxAuDela
  );
}

/** Majoration pour enfants en % : barème par nombre d'enfants, sinon taux unique dès 3 enfants. */
export function majorationEnfantsPct(caisse: ParametresCaissePoints, nombreEnfants: number): number {
  if (caisse.majorationEnfantsBaremePct) {
    let pct = 0;
    for (const [seuil, taux] of Object.entries(caisse.majorationEnfantsBaremePct)) {
      if (nombreEnfants >= Number(seuil)) pct = Math.max(pct, taux);
    }
    return pct;
  }
  return nombreEnfants >= 3 ? caisse.majorationTroisEnfantsPct : 0;
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
  /** Classe de cotisation choisie (CNBF : C1, C2, C2+). */
  classe?: string | null;
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
    const id = caisseDuRegime(regime.nom, entree.caisseLiberale);
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
        ? (pointsAnnuelsCaisse(caisse, entree.revenuAnnuel, entree.classe) * Math.max(0, entree.trimestresProjetes)) / 4
        : 0;
    const coefficientSurcote =
      ageDepart !== null && ageLegal !== null
        ? coefficientAgeCaisse(caisse, ageDepart, ageLegal, -entree.trimestresManquants)
        : 1;
    // Minoration de la base (CNAVPL) : écart de trimestres, plus favorable avec l'âge.
    const minoration = caisse.decoteCommeBase
      ? decoteCNAVPL(-Math.max(0, entree.trimestresManquants), 0, ageDepart)
      : 0;
    // Minoration propre (âge de taux plein fixe) : trimestres manquants arrondis au supérieur.
    const minorationAge =
      caisse.decoteAge && ageDepart !== null
        ? -Math.min(
            Math.max(0, Math.ceil((caisse.decoteAge.ageTauxPlein - ageDepart) * 4 - 1e-6)),
            caisse.decoteAge.trimestresMax ?? Infinity
          ) * caisse.decoteAge.tauxParTrimestre
        : 0;
    const abattement = caisse.abattementTrimestres
      ? -abattementParTrimestres(caisse.abattementTrimestres, entree.trimestresManquants, ageDepart)
      : 0;
    // Grilles Agirc-Arrco, seulement si la base est minorée (trimestres manquants avant l'âge de référence).
    const coefficientAnticipation = caisse.anticipationAgircArrco
      ? coefficientAnticipationAgircArrco(
          entree.trimestresManquants > 0 && (ageDepart === null || ageDepart < caisse.anticipationAgircArrco.ageTauxPlein),
          ageDepart,
          entree.trimestresManquants
        )
      : 1;
    const coefficientAge =
      coefficientSurcote * (1 + minoration / 100) * (1 + minorationAge) * (1 + abattement) * coefficientAnticipation;
    const pointsRetenus = (pointsAcquis + pointsProjetes) * coefficientAge;
    const pensionAvantMajoration = pointsRetenus * caisse.valeurServicePoint;
    const majorationEnfants = (pensionAvantMajoration * majorationEnfantsPct(caisse, entree.nombreEnfantsEligibles)) / 100;
    const enCapital = caisse.capital !== undefined && pointsRetenus < caisse.capital.seuilPoints;
    const capital = !enCapital
      ? 0
      : caisse.capital!.prixParPoint !== undefined
        ? pointsRetenus * caisse.capital!.prixParPoint
        : (pensionAvantMajoration + majorationEnfants) * (caisse.capital!.multipleAnnuites ?? 0);
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
