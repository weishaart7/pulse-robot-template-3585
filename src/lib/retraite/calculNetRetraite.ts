/**
 * Revenu net à la retraite (audit Retraite du 2026-09-29, phase 3) —
 * fonctions pures. Passe des pensions brutes calculées par
 * `pensionConsolidee.ts` au revenu disponible du foyer, en réutilisant le
 * moteur d'impôt du module Fiscalité (`calculerImpot`, abattement de 10 % sur
 * les pensions).
 *
 * Règles validées le 2026-09-29 :
 * - CSG sur pensions : 0 / 3,8 / 6,6 / 8,3 % selon le RFR et le nombre de
 *   parts (seuils 2026, params-retraite.json) ; CRDS 0,5 % hors exonération ;
 *   CASA 0,3 % aux taux médian et normal ; cotisation maladie de 1 % sur les
 *   complémentaires hors exonération (hypothèse : due dès le taux réduit).
 * - Impôt : pension − CSG déductible − abattement de 10 % (plancher par
 *   pensionné, plafond par foyer), barème via `calculerImpot()`.
 * - Régime de croisière : le RFR retenu pour la CSG est celui des pensions
 *   elles-mêmes (dans la réalité, RFR N-2, qui contient encore des salaires
 *   les deux premières années). Point fixe : le RFR dépend de la CSG
 *   déductible, elle-même fonction du RFR — itéré jusqu'à stabilité.
 * - Revenus du foyer limités aux pensions (pas de revenus du patrimoine).
 */

import {
  abattementPensionDeclarant,
  PENSION_ABATTEMENT_PLAFOND_FOYER,
  calculerImpot,
  PartsFiscalesResult,
  FoyerFiscalInput,
} from '@/lib/fiscalite';
import { MILLESIME_COURANT, RATIO_NET_BRUT_ACTIVITE, TAUX_PRELEVEMENTS_PENSIONS, TrancheCSGPension } from './parametres';
import type { StatutActuel } from './projectionStatut';
import { TrajectoireRevenu, revenuFinDeProjection } from './hypotheseRevenuFutur';

/** Pensions annuelles brutes d'un pensionné, séparées base / complémentaires (1 % maladie). */
export interface PensionsBrutesPersonne {
  base: number;
  complementaires: number;
}

/**
 * Tranche de CSG selon le RFR et le nombre de parts (métropole). Chaque
 * demi-part au-delà de la première relève les seuils de la majoration
 * correspondante (un quart de part : la moitié).
 */
export function trancheCSGPension(revenuFiscalReference: number, nombreParts: number): TrancheCSGPension {
  const { seuilsRfrUnePart, majorationSeuilsParDemiPart } = MILLESIME_COURANT.prelevementsSociauxPensions;
  const demiPartsSupplementaires = Math.max(0, (nombreParts - 1) * 2);
  const seuil = (cle: keyof typeof seuilsRfrUnePart) =>
    seuilsRfrUnePart[cle] + demiPartsSupplementaires * majorationSeuilsParDemiPart[cle];
  if (revenuFiscalReference <= seuil('exoneration')) return 'exoneration';
  if (revenuFiscalReference <= seuil('tauxReduit')) return 'tauxReduit';
  if (revenuFiscalReference <= seuil('tauxMedian')) return 'tauxMedian';
  return 'tauxNormal';
}

export interface PrelevementsSociauxPension {
  csg: number;
  csgDeductible: number;
  crds: number;
  casa: number;
  maladieComplementaire: number;
  total: number;
}

export function prelevementsSociauxPension(
  pensions: PensionsBrutesPersonne,
  tranche: TrancheCSGPension
): PrelevementsSociauxPension {
  const taux = TAUX_PRELEVEMENTS_PENSIONS[tranche];
  const brut = pensions.base + pensions.complementaires;
  const csg = brut * taux.csg;
  const crds = brut * taux.crds;
  const casa = brut * taux.casa;
  const maladieComplementaire = pensions.complementaires * taux.maladieComplementaire;
  return {
    csg,
    csgDeductible: brut * taux.csgDeductible,
    crds,
    casa,
    maladieComplementaire,
    total: csg + crds + casa + maladieComplementaire,
  };
}

export interface ResultatNetRetraiteFoyer {
  pensionsBrutes: number;
  tranche: TrancheCSGPension;
  prelevementsSociaux: number;
  revenuImposable: number;
  revenuFiscalReference: number;
  impot: number;
  tmi: number;
  netAnnuel: number;
  netMensuel: number;
  /** Détail par pensionné, dans l'ordre d'entrée. */
  parPensionne: { brut: number; prelevementsSociaux: PrelevementsSociauxPension }[];
}

const ORDRE_TRANCHES: TrancheCSGPension[] = ['exoneration', 'tauxReduit', 'tauxMedian', 'tauxNormal'];

/**
 * Revenu net d'un foyer fiscal composé de pensionnés (1 ou 2 déclarants).
 * `parts` : résultat de `calculerPartsFiscales()` ; `situationFamille` :
 * celle du foyer (décote couple / célibataire).
 */
export function calculerNetRetraiteFoyer(
  pensionnes: PensionsBrutesPersonne[],
  parts: PartsFiscalesResult,
  situationFamille: FoyerFiscalInput['situationFamille']
): ResultatNetRetraiteFoyer {
  const bruts = pensionnes.map((p) => p.base + p.complementaires);
  const pensionsBrutes = bruts.reduce((a, b) => a + b, 0);

  const calculerPourTranche = (tranche: TrancheCSGPension) => {
    const ps = pensionnes.map((p) => prelevementsSociauxPension(p, tranche));
    const apresCsgDeductible = bruts.map((b, i) => Math.max(0, b - ps[i].csgDeductible));
    const abattementsBruts = apresCsgDeductible.map((m) => abattementPensionDeclarant(m));
    const totalAbattementsBruts = abattementsBruts.reduce((a, b) => a + b, 0);
    const abattementRetenu = Math.min(PENSION_ABATTEMENT_PLAFOND_FOYER, totalAbattementsBruts);
    const revenuImposable = Math.max(
      0,
      apresCsgDeductible.reduce((a, b) => a + b, 0) - abattementRetenu
    );
    const impot = calculerImpot(revenuImposable, parts, situationFamille);
    return { ps, revenuImposable, impot };
  };

  // Point fixe sur la tranche : départ au taux normal, recalcul du RFR.
  // Oscillation possible près d'un seuil (la CSG déductible d'une tranche
  // plus basse fait repasser le RFR au-dessus du seuil, et inversement) :
  // la tranche la plus élevée des deux est alors retenue (choix prudent, le
  // net ne peut être que sous-estimé).
  let tranche: TrancheCSGPension = 'tauxNormal';
  let resultat = calculerPourTranche(tranche);
  const visitees = new Set<TrancheCSGPension>([tranche]);
  for (let i = 0; i < ORDRE_TRANCHES.length; i++) {
    const nouvelle = trancheCSGPension(resultat.impot.revenuFiscalReference, parts.nombreParts);
    if (nouvelle === tranche) break;
    if (visitees.has(nouvelle)) {
      tranche = ORDRE_TRANCHES.indexOf(nouvelle) > ORDRE_TRANCHES.indexOf(tranche) ? nouvelle : tranche;
      resultat = calculerPourTranche(tranche);
      break;
    }
    visitees.add(nouvelle);
    tranche = nouvelle;
    resultat = calculerPourTranche(tranche);
  }

  const prelevementsSociaux = resultat.ps.reduce((a, p) => a + p.total, 0);
  const impot = Math.max(0, resultat.impot.impotNet);
  const netAnnuel = pensionsBrutes - prelevementsSociaux - impot;
  return {
    pensionsBrutes,
    tranche,
    prelevementsSociaux,
    revenuImposable: resultat.revenuImposable,
    revenuFiscalReference: resultat.impot.revenuFiscalReference,
    impot,
    tmi: resultat.impot.tmi,
    netAnnuel,
    netMensuel: netAnnuel / 12,
    parPensionne: bruts.map((brut, i) => ({ brut, prelevementsSociaux: resultat.ps[i] })),
  };
}

/**
 * Dernier revenu d'activité brut avant le départ (référence des taux de
 * remplacement) : revenu de la dernière année projetée selon l'évolution des
 * revenus. Fonctionnaire : TIB de fin de carrière (déjà projeté) + primes.
 */
export function revenuActiviteBrutFinDeCarriere(params: {
  statut: StatutActuel;
  revenuBrut: number | null;
  tibFinDeCarriere: number | null;
  primesAnnuelles: number | null;
  trimestresProjetes: number;
  trajectoire?: TrajectoireRevenu;
}): number | null {
  const { statut, revenuBrut, tibFinDeCarriere, primesAnnuelles, trimestresProjetes, trajectoire } = params;
  if (statut === 'fonctionnaire' && tibFinDeCarriere && tibFinDeCarriere > 0) {
    return tibFinDeCarriere + revenuFinDeProjection(primesAnnuelles ?? 0, trimestresProjetes, trajectoire);
  }
  return revenuBrut && revenuBrut > 0 ? revenuFinDeProjection(revenuBrut, trimestresProjetes, trajectoire) : null;
}

/**
 * Revenu d'activité net (avant impôt) = brut × ratio du statut (convention
 * Sapiendo, params-retraite.json `ratioNetBrutActivite`).
 */
export function revenuActiviteNet(revenuBrut: number, statut: StatutActuel): number {
  const ratio = RATIO_NET_BRUT_ACTIVITE[statut];
  return revenuBrut * (typeof ratio === 'number' ? ratio : 1);
}

/**
 * Taux de remplacement net sur net, avant impôt : pension nette de
 * prélèvements sociaux ÷ dernier revenu d'activité net.
 */
export function tauxRemplacementNet(
  pensionBrute: number,
  prelevementsSociaux: number,
  dernierRevenuBrut: number | null,
  statut: StatutActuel
): number | null {
  if (!dernierRevenuBrut || dernierRevenuBrut <= 0) return null;
  return (pensionBrute - prelevementsSociaux) / revenuActiviteNet(dernierRevenuBrut, statut);
}

/** Taux de remplacement brut : pension brute ÷ dernier revenu d'activité brut. */
export function tauxRemplacementBrut(pensionBrute: number, dernierRevenuBrut: number | null): number | null {
  return dernierRevenuBrut && dernierRevenuBrut > 0 ? pensionBrute / dernierRevenuBrut : null;
}
