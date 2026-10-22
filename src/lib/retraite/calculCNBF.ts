/**
 * Retraite de base des avocats (CNBF, phase 3.3) — fonctions pures.
 * Paramètres : bloc `cnbf` de `params-retraite.json` (barème CNBF 2026).
 * La complémentaire CNBF passe par le moteur des caisses à points
 * (calculCaissesPoints.ts, caisse `cnbf`).
 *
 * Règles validées le 2026-10-22 :
 * - Base forfaitaire × trimestres CNBF ÷ durée requise (trimestres plafonnés
 *   à la durée requise) ; moins de 60 trimestres CNBF : fraction de l'AVTS
 *   au prorata de 60 trimestres.
 * - Décote de 1,25 % par trimestre manquant tous régimes, 25 % au plus, le
 *   plus favorable entre durée et âge (taux plein à 67 ans), comme la CNAVPL.
 * - Majoration de 10 % à partir de 3 enfants, après décote.
 * - Surcote non calculée : aucune donnée datée des trimestres CNBF cotisés
 *   après l'âge légal (même limite que la fonction publique et la CNAVPL).
 */

import { decoteCNAVPL } from './calculCNAVPL';
import { PARAMETRES_CNBF } from './parametres';

export interface DonneesCNBF {
  trimestresCNBF: number;
  /** Classe de cotisation de la complémentaire (C1, C2, C2+). */
  classe: string;
}

export interface ResultatCNBF {
  pensionBrute: number;
  decotePct: number;
  majorationEnfants: number;
  pensionHorsMajorationEnfants: number;
  pensionFinale: number;
}

export function pensionBaseCNBF(params: {
  trimestresCNBF: number;
  trimestresRequis: number;
  trimestresTousRegimes: number;
  ageDepartAnnees: number | null;
  nombreEnfantsEligibles: number;
}): ResultatCNBF {
  const { trimestresCNBF, trimestresRequis } = params;
  const { retraiteBaseForfaitaire, seuilTrimestresAVTS, avtsPour60Trimestres, majorationTroisEnfantsPct } =
    PARAMETRES_CNBF;
  if (trimestresCNBF <= 0 || trimestresRequis <= 0) {
    return { pensionBrute: 0, decotePct: 0, majorationEnfants: 0, pensionHorsMajorationEnfants: 0, pensionFinale: 0 };
  }
  const pensionBrute =
    trimestresCNBF < seuilTrimestresAVTS
      ? (avtsPour60Trimestres * trimestresCNBF) / seuilTrimestresAVTS
      : (retraiteBaseForfaitaire * Math.min(trimestresCNBF, trimestresRequis)) / trimestresRequis;
  const decotePct = decoteCNAVPL(params.trimestresTousRegimes, trimestresRequis, params.ageDepartAnnees);
  const pensionHorsMajorationEnfants = pensionBrute * (1 + decotePct / 100);
  const majorationEnfants =
    params.nombreEnfantsEligibles >= 3 ? (pensionHorsMajorationEnfants * majorationTroisEnfantsPct) / 100 : 0;
  return {
    pensionBrute,
    decotePct,
    majorationEnfants,
    pensionHorsMajorationEnfants,
    pensionFinale: pensionHorsMajorationEnfants + majorationEnfants,
  };
}
