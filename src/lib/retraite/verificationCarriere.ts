/**
 * Vérification de carrière (phase 4, A3, modèle Sapiendo) — fonctions pures.
 *
 * Règles validées le 2026-10-22 :
 * - Détection sur le détail de carrière importé du RIS (périodes, revenu,
 *   régimes listés par ligne). Le RIS importé ne porte ni trimestres ni points
 *   par année : les contrôles de points reposent sur l'absence de la ligne du
 *   régime complémentaire, et le contrôle des trimestres sur l'écart global.
 * - Contrôles : années civiles sans aucune période entre la première et la
 *   dernière ; total RIS du régime général inférieur au total recalculé sur
 *   les revenus ; année salariée au régime général (1962 et après) sans ligne
 *   Agirc-Arrco ni Ircantec ; activité indépendante (2013 et après) sans ligne
 *   RCI ; chômage indemnisé sans ligne Agirc-Arrco ; trimestres enfants non
 *   reportés au RIS.
 * - Gain : pension annuelle recalculée (calculerPensionConsolidee) avec la
 *   correction, moins la pension sans, ÷ 12. Points estimés au barème actuel
 *   (approximation pour les années anciennes). Informatif : la pension
 *   affichée reste celle du RIS tel quel.
 */

import { PeriodeCarriere, RegimeDetecte } from './parseRIS';
import { EntreePensionConsolidee, calculerPensionConsolidee } from './pensionConsolidee';
import { estRegimeAgircArrco, pointsAgircArrcoAnnuels } from './calculAgircArrco';
import { pointsAnnuelsCaisse } from './calculCaissesPoints';
import { PARAMETRES_CAISSES_POINTS } from './parametres';
import { ABATTEMENT_MICRO_ENTREPRENEUR, classifierSousTypeMicroEntrepreneur } from './calculTrimestres';
import { AUCUN_TRIMESTRE_ENFANT, TrimestresEnfantsParRegime } from './trimestresEnfants';

export type TypeAnomalie =
  | 'annee_manquante'
  | 'trimestres_sous_comptes'
  | 'agirc_arrco_absent'
  | 'rci_absent'
  | 'chomage_sans_points'
  | 'trimestres_enfants';

export interface CorrectionAnomalie {
  trimestres?: number;
  pointsAgircArrco?: number;
  pointsRCI?: number;
  /** Trimestres enfants à retirer pour mesurer leur effet (déjà inclus dans l'entrée). */
  retirerTrimestresEnfants?: boolean;
}

export interface Anomalie {
  type: TypeAnomalie;
  annees: number[];
  libelle: string;
  correction: CorrectionAnomalie;
  /** Correction chiffrée sur un barème actuel ou une hypothèse. */
  estimation: boolean;
  /** Pièces à fournir à la caisse (bulletins, attestations…). */
  aJustifier: boolean;
}

const RE_ASSURANCE_RETRAITE = /assurance retraite/i;
const RE_IRCANTEC = /ircantec/i;
const RE_RCI = /\bRCI\b|ind[ée]pendants/i;
const RE_INDEPENDANT = /artisan|commer[çc]ant|ind[ée]pendant|\bRSI\b|\bSSI\b/i;
const RE_CHOMAGE_NON_INDEMNISE = /NON[\s-]?INDEMNIS/i;
const PREMIERE_ANNEE_AGIRC_ARRCO = 1962;
const PREMIERE_ANNEE_RCI = 2013;

const anneeDe = (iso: string) => Number(iso.slice(0, 4));

function anneesCouvertes(periode: PeriodeCarriere): number[] {
  const annees: number[] = [];
  for (let a = anneeDe(periode.dateDebut); a <= anneeDe(periode.dateFin); a++) annees.push(a);
  return annees;
}

/** Part d'une période tombant dans une année civile (au prorata des jours). */
function fractionDansAnnee(periode: PeriodeCarriere, annee: number): number {
  const debut = Date.parse(periode.dateDebut);
  const fin = Date.parse(periode.dateFin) + 86400000;
  const duree = fin - debut;
  if (duree <= 0) return 0;
  const recouvrement = Math.min(fin, Date.UTC(annee + 1, 0, 1)) - Math.max(debut, Date.UTC(annee, 0, 1));
  return Math.max(0, recouvrement) / duree;
}

/** Revenu de l'année réparti au prorata, pour les périodes retenues. */
function revenuAnnee(periodes: PeriodeCarriere[], annee: number, abattement = (_p: PeriodeCarriere) => 0): number {
  return periodes.reduce(
    (total, p) => total + (p.revenu ?? 0) * (1 - abattement(p)) * fractionDansAnnee(p, annee),
    0
  );
}

const lignesDeLAnnee = (periodes: PeriodeCarriere[], annee: number) =>
  periodes.filter((p) => anneesCouvertes(p).includes(annee));

const regimeListe = (periodes: PeriodeCarriere[], motif: RegimeDetecte['nom'] | RegExp) =>
  periodes.some((p) => p.regimes.some((r) => (typeof motif === 'string' ? r === motif : motif.test(r))));

const aAgircArrco = (periodes: PeriodeCarriere[]) =>
  periodes.some((p) => p.regimes.some((r) => estRegimeAgircArrco(r) || RE_IRCANTEC.test(r)));

function abattementMicro(p: PeriodeCarriere): number {
  if (p.typeActivite !== 'micro_entrepreneur') return 0;
  const sousType = classifierSousTypeMicroEntrepreneur(p.employeur);
  return sousType === null ? 1 : ABATTEMENT_MICRO_ENTREPRENEUR[sousType];
}

export interface ContexteVerification {
  periodes: PeriodeCarriere[];
  /** Trimestres du régime général au RIS. */
  trimestresRISRegimeGeneral: number;
  /** Trimestres recalculés sur le détail de carrière (historique). */
  historique: { total: number; parAnnee: { annee: number; cotises: number }[] };
  trimestresEnfants: TrimestresEnfantsParRegime;
  mdaDejaAuRis: boolean;
}

export function detecterAnomalies(ctx: ContexteVerification): Anomalie[] {
  const { periodes } = ctx;
  const anomalies: Anomalie[] = [];
  if (periodes.length === 0) return anomalies;

  // 1. Années sans aucune période entre la première et la dernière.
  const couvertes = new Set(periodes.flatMap(anneesCouvertes));
  const premiere = Math.min(...couvertes);
  const derniere = Math.max(...couvertes);
  for (let a = premiere + 1; a < derniere; a++) {
    if (!couvertes.has(a)) {
      anomalies.push({
        type: 'annee_manquante',
        annees: [a],
        libelle: `Aucune période au relevé en ${a} : activité, service national, études ou activité à l'étranger à vérifier.`,
        correction: { trimestres: 4 },
        estimation: true,
        aJustifier: true,
      });
    }
  }

  // 2. Total RIS du régime général inférieur au total recalculé sur les revenus.
  const ecart = ctx.historique.total - ctx.trimestresRISRegimeGeneral;
  if (ctx.trimestresRISRegimeGeneral > 0 && ecart > 0) {
    const anneesPleines = ctx.historique.parAnnee.filter((a) => a.cotises >= 4).map((a) => a.annee);
    anomalies.push({
      type: 'trimestres_sous_comptes',
      annees: anneesPleines,
      libelle: `Le relevé compte ${ctx.trimestresRISRegimeGeneral} trimestres au régime général, les revenus en justifient ${ctx.historique.total} : écart de ${ecart} trimestre(s), années à vérifier parmi celles qui valident 4 trimestres.`,
      correction: { trimestres: ecart },
      estimation: false,
      aJustifier: true,
    });
  }

  for (let a = premiere; a <= derniere; a++) {
    const lignes = lignesDeLAnnee(periodes, a);

    // 3. Année salariée au régime général sans ligne Agirc-Arrco ni Ircantec.
    const salariees = lignes.filter(
      (p) => p.typeActivite === 'employeur' && p.regimes.some((r) => RE_ASSURANCE_RETRAITE.test(r)) && !RE_INDEPENDANT.test(p.employeur) && !regimeListe([p], RE_RCI)
    );
    if (a >= PREMIERE_ANNEE_AGIRC_ARRCO && salariees.length > 0 && !aAgircArrco(lignes)) {
      const revenu = revenuAnnee(salariees, a);
      if (revenu > 0) {
        anomalies.push({
          type: 'agirc_arrco_absent',
          annees: [a],
          libelle: `Salaire de ${Math.round(revenu).toLocaleString('fr-FR')} € en ${a} sans points Agirc-Arrco au relevé.`,
          correction: { pointsAgircArrco: pointsAgircArrcoAnnuels(revenu) },
          estimation: true,
          aJustifier: true,
        });
      }
    }

    // 4. Activité indépendante sans ligne RCI.
    const independantes = lignes.filter(
      (p) => p.typeActivite === 'micro_entrepreneur' || (p.typeActivite === 'employeur' && RE_INDEPENDANT.test(p.employeur))
    );
    if (a >= PREMIERE_ANNEE_RCI && independantes.length > 0 && !regimeListe(lignes, RE_RCI)) {
      const revenu = revenuAnnee(independantes, a, abattementMicro);
      if (revenu > 0) {
        anomalies.push({
          type: 'rci_absent',
          annees: [a],
          libelle: `Revenu d'indépendant de ${Math.round(revenu).toLocaleString('fr-FR')} € en ${a} sans points RCI au relevé.`,
          correction: { pointsRCI: pointsAnnuelsCaisse(PARAMETRES_CAISSES_POINTS.rci, revenu) },
          estimation: true,
          aJustifier: true,
        });
      }
    }
  }

  // 5. Chômage indemnisé sans ligne Agirc-Arrco : points sur le dernier salaire connu.
  for (const p of periodes.filter((x) => x.typeActivite === 'chomage' && !RE_CHOMAGE_NON_INDEMNISE.test(x.employeur))) {
    const annees = anneesCouvertes(p).filter(
      (a) => a >= PREMIERE_ANNEE_AGIRC_ARRCO && !aAgircArrco(lignesDeLAnnee(periodes, a))
    );
    if (annees.length === 0) continue;
    // Salaire de référence : année précédant le chômage, sinon année où il commence.
    // Lignes du régime de base seulement : le RIS répète la période sur une ligne Agirc-Arrco.
    const salaries = periodes.filter(
      (x) => x.typeActivite === 'employeur' && x.regimes.some((r) => RE_ASSURANCE_RETRAITE.test(r))
    );
    const salaireReference = [anneeDe(p.dateDebut) - 1, anneeDe(p.dateDebut)]
      .map((a) => revenuAnnee(salaries, a))
      .find((r) => r > 0);
    if (!salaireReference) continue;
    const dureeAnnees = (Date.parse(p.dateFin) + 86400000 - Date.parse(p.dateDebut)) / (365.25 * 86400000);
    const fraction = dureeAnnees * annees.reduce((t, a) => t + fractionDansAnnee(p, a), 0);
    anomalies.push({
      type: 'chomage_sans_points',
      annees,
      libelle: `Chômage indemnisé (${p.dateDebut} au ${p.dateFin}) sans points Agirc-Arrco au relevé ; points estimés sur le dernier salaire annuel connu.`,
      correction: { pointsAgircArrco: pointsAgircArrcoAnnuels(salaireReference) * Math.min(1, fraction) },
      estimation: true,
      aJustifier: true,
    });
  }

  // 6. Trimestres enfants à faire valoir à la liquidation.
  if (!ctx.mdaDejaAuRis && ctx.trimestresEnfants.total > 0) {
    anomalies.push({
      type: 'trimestres_enfants',
      annees: [],
      libelle: `${ctx.trimestresEnfants.total} trimestre(s) pour enfants absents du relevé, à faire valoir à la liquidation (déjà comptés dans la pension estimée).`,
      correction: { retirerTrimestresEnfants: true },
      estimation: false,
      aJustifier: true,
    });
  }

  return anomalies;
}

/** Entrée de calcul avec la correction appliquée. */
export function appliquerCorrection(entree: EntreePensionConsolidee, correction: CorrectionAnomalie): EntreePensionConsolidee {
  let regimesPoints = entree.regimesPoints;
  const ajouterPoints = (estDuRegime: (nom: string) => boolean, nom: string, points: number) => {
    if (points <= 0) return;
    const index = regimesPoints.findIndex((r) => r.type === 'points' && estDuRegime(r.nom));
    regimesPoints =
      index === -1
        ? [...regimesPoints, { nom, type: 'points', points }]
        : regimesPoints.map((r, i) => (i === index ? { ...r, points: (r.points ?? 0) + points } : r));
  };
  ajouterPoints(estRegimeAgircArrco, 'Agirc-Arrco', correction.pointsAgircArrco ?? 0);
  ajouterPoints((nom) => /\bRCI\b/i.test(nom), 'RCI', correction.pointsRCI ?? 0);
  return {
    ...entree,
    regimesPoints,
    trimestresValides: entree.trimestresValides + (correction.trimestres ?? 0),
  };
}

function cumuler(corrections: CorrectionAnomalie[]): CorrectionAnomalie {
  return corrections.reduce<CorrectionAnomalie>(
    (total, c) => ({
      trimestres: (total.trimestres ?? 0) + (c.trimestres ?? 0),
      pointsAgircArrco: (total.pointsAgircArrco ?? 0) + (c.pointsAgircArrco ?? 0),
      pointsRCI: (total.pointsRCI ?? 0) + (c.pointsRCI ?? 0),
    }),
    {}
  );
}

export interface AnomalieChiffree extends Anomalie {
  /** Gain de pension brute en € par mois, au départ du scénario. */
  gainMensuel: number;
}

export interface ResultatVerification {
  anomalies: AnomalieChiffree[];
  /** Gain de toutes les corrections ensemble (effets de seuil compris), € par mois. */
  gainMensuelTotal: number;
}

export function estimerGains(entree: EntreePensionConsolidee, anomalies: Anomalie[]): ResultatVerification {
  const pension = (e: EntreePensionConsolidee) => calculerPensionConsolidee(e).pensionTotaleConsolidee;
  const sansEnfants: EntreePensionConsolidee = { ...entree, trimestresEnfants: AUCUN_TRIMESTRE_ENFANT };
  const reference = pension(entree);
  const chiffrees = anomalies.map((a) => {
    const gainAnnuel = a.correction.retirerTrimestresEnfants
      ? reference - pension(sansEnfants)
      : pension(appliquerCorrection(entree, a.correction)) - reference;
    return { ...a, gainMensuel: gainAnnuel / 12 };
  });
  // Trimestres enfants déjà inclus dans la référence : hors du total des régularisations.
  const corrigeables = anomalies.filter((a) => !a.correction.retirerTrimestresEnfants);
  const total =
    corrigeables.length === 0
      ? 0
      : (pension(appliquerCorrection(entree, cumuler(corrigeables.map((a) => a.correction)))) - reference) / 12;
  return { anomalies: chiffrees, gainMensuelTotal: total };
}
