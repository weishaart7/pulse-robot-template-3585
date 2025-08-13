import { TransmissionParams } from './types';

export interface FiscalResult {
  baseImposable: number;
  abattement: number;
  baseNette: number;
  droitsSuccession: number;
}

export interface Prelevement990IResult {
  baseImposable: number;
  droits990I: number;
  exonere: boolean;
}

export interface NotaryFeesResult {
  base: number;
  frais: number;
}

/**
 * Calcule les droits de succession après abattement et application du barème
 */
export function computeInheritanceTax(
  partNette: number,
  lien: string,
  params: TransmissionParams
): FiscalResult {
  // Appliquer l'abattement selon le lien de parenté
  const abattement = params.abattements[lien] || 0;
  const baseNette = Math.max(0, partNette - abattement);
  
  // Si abattement infini (ex: conjoint), pas de droits
  if (abattement === Infinity || baseNette === 0) {
    return {
      baseImposable: partNette,
      abattement,
      baseNette: 0,
      droitsSuccession: 0
    };
  }
  
  // Trouver le barème applicable selon le lien
  const baremeApplicable = params.bareme.find(b => b.lien === lien);
  if (!baremeApplicable) {
    // Barème par défaut (le plus élevé)
    const baremeDefault = params.bareme.find(b => b.lien === "autre") || 
                         params.bareme[params.bareme.length - 1];
    const droitsDefault = calculateTaxFromBareme(baseNette, baremeDefault.tranches);
    return {
      baseImposable: partNette,
      abattement,
      baseNette,
      droitsSuccession: droitsDefault
    };
  }
  
  const droitsSuccession = calculateTaxFromBareme(baseNette, baremeApplicable.tranches);
  
  return {
    baseImposable: partNette,
    abattement,
    baseNette,
    droitsSuccession
  };
}

/**
 * Calcule les droits selon un barème progressif par tranches
 */
function calculateTaxFromBareme(
  baseNette: number, 
  tranches: { seuil: number; taux: number }[]
): number {
  let droits = 0;
  let baseRestante = baseNette;
  
  // Trier les tranches par seuil croissant
  const tranchesSorted = [...tranches].sort((a, b) => a.seuil - b.seuil);
  
  for (let i = 0; i < tranchesSorted.length; i++) {
    const tranche = tranchesSorted[i];
    const seuilSuivant = i < tranchesSorted.length - 1 ? tranchesSorted[i + 1].seuil : Infinity;
    
    if (baseRestante <= 0) break;
    
    // Montant imposable dans cette tranche
    const montantTranche = Math.min(baseRestante, seuilSuivant - tranche.seuil);
    
    if (montantTranche > 0) {
      droits += montantTranche * (tranche.taux / 100);
      baseRestante -= montantTranche;
    }
  }
  
  return Math.round(droits);
}

/**
 * Calcule le prélèvement 990 I sur les contrats d'assurance-vie
 */
export function compute990I(
  beneficiaire: string,
  lien: string,
  montantCapitaux: number,
  params: TransmissionParams
): Prelevement990IResult {
  const prelevement990I = params.prelevement990I;
  
  if (!prelevement990I) {
    return {
      baseImposable: montantCapitaux,
      droits990I: 0,
      exonere: true
    };
  }
  
  // Vérifier les exonérations
  const exonere = prelevement990I.exonerations.includes(lien);
  if (exonere) {
    return {
      baseImposable: montantCapitaux,
      droits990I: 0,
      exonere: true
    };
  }
  
  // Appliquer le seuil par bénéficiaire
  const baseImposable = Math.max(0, montantCapitaux - prelevement990I.seuilParBenef);
  
  if (baseImposable === 0) {
    return {
      baseImposable: montantCapitaux,
      droits990I: 0,
      exonere: false
    };
  }
  
  // Calculer les droits selon le barème 990 I
  const droits990I = calculateTaxFromBareme(baseImposable, prelevement990I.tranches);
  
  return {
    baseImposable: montantCapitaux,
    droits990I,
    exonere: false
  };
}

/**
 * Calcule les frais de notaire
 */
export function computeNotaryFees(
  base: number,
  params: TransmissionParams
): NotaryFeesResult {
  const fraisNotaire = params.fraisNotaire;
  
  if (!fraisNotaire) {
    return {
      base,
      frais: 0
    };
  }
  
  let frais = 0;
  
  if (fraisNotaire.mode === "pourcentage") {
    frais = base * (fraisNotaire.valeur / 100);
  } else if (fraisNotaire.mode === "forfait") {
    frais = fraisNotaire.valeur;
  }
  
  return {
    base,
    frais: Math.round(frais)
  };
}

/**
 * Barème par défaut pour les droits de succession (2025)
 */
export const DEFAULT_BAREME_2025 = [
  {
    lien: "enfant",
    tranches: [
      { seuil: 0, taux: 5 },
      { seuil: 8072, taux: 10 },
      { seuil: 12109, taux: 15 },
      { seuil: 15932, taux: 20 },
      { seuil: 552324, taux: 30 },
      { seuil: 902838, taux: 40 },
      { seuil: 1805677, taux: 45 }
    ]
  },
  {
    lien: "conjoint",
    tranches: [] // Exonéré
  },
  {
    lien: "frere_soeur",
    tranches: [
      { seuil: 0, taux: 35 },
      { seuil: 24430, taux: 45 }
    ]
  },
  {
    lien: "neveu_niece",
    tranches: [
      { seuil: 0, taux: 55 }
    ]
  },
  {
    lien: "autre",
    tranches: [
      { seuil: 0, taux: 60 }
    ]
  }
];