// Moteur fiscal simplifié et corrigé - intégré avec les règles complètes
import { 
  computeAbattementWithRappel, 
  computeProgressiveTaxWithBrackets,
  computeReductions,
  FiscalContext,
  AbattementResult,
  ProgressiveTaxResult
} from './fiscalRules';

type Money = number;
type Lien = 'enfant' | 'parent' | 'conjoint' | 'pacs' | 'frere_soeur' | 'neveu_niece' | 'petit_enfant' | 'cousin' | 'tiers' | 'autre';

interface Params {
  abattements: Record<string, Money>;
  baremes: { [k: string]: Array<{ upTo: number | null; rate: number }> };
}

interface BeneficiaryFiscalContext {
  personId: string;
  lien: Lien;
  isHandicapped?: boolean;
  isMutileGuerre?: boolean;
  isFromGuyane?: boolean;
  representationContext?: {
    isRepresenting: boolean;
    representedPersonId: string;
    numberOfRepresentants: number;
    hasPlurality?: boolean;
  };
}

interface CompleteFiscalResult {
  partBrute: Money;
  exonerations: Money;
  baseAvantAbattement: Money;
  abattementResult: AbattementResult;
  baseTaxable: Money;
  progressiveTaxResult: ProgressiveTaxResult;
  reductions: {
    reductionMutile: number;
    reductionGuyane: number;
    droitsApresReduction: number;
  };
  droitsFinaux: Money;
}

function roundEuros(n: number) { return Math.round(n); }

/**
 * Calcul fiscal complet pour un bénéficiaire
 */
export function computeInheritanceForBeneficiary(
  partBrute: Money,
  lien: Lien,
  consumedBracketsAmount: Money, // Conservé pour compatibilité - sera remplacé par rappel fiscal
  params: Params,
  fiscalContext?: FiscalContext,
  beneficiaryContext?: BeneficiaryFiscalContext
): { base: Money; abattementApplied: Money; tax: Money } {
  
  // Si on a le contexte complet, utiliser le nouveau moteur
  if (fiscalContext && beneficiaryContext) {
    const result = computeCompleteFiscalTax(
      partBrute,
      fiscalContext,
      beneficiaryContext
    );
    
    return {
      base: result.baseTaxable,
      abattementApplied: result.abattementResult.abattementUtilise,
      tax: result.droitsFinaux
    };
  }
  
  // Sinon, utiliser le moteur simplifié (pour compatibilité)
  return computeSimplifiedTax(partBrute, lien, consumedBracketsAmount, params);
}

/**
 * Moteur fiscal complet avec toutes les règles
 */
export function computeCompleteFiscalTax(
  partBrute: Money,
  fiscalContext: FiscalContext,
  beneficiaryContext: BeneficiaryFiscalContext
): CompleteFiscalResult {
  
  // 1. Exonérations (conjoint, etc.)
  const exonerations = beneficiaryContext.lien === 'conjoint' || beneficiaryContext.lien === 'pacs' 
    ? partBrute : 0;
  
  if (exonerations >= partBrute) {
    return {
      partBrute,
      exonerations,
      baseAvantAbattement: 0,
      abattementResult: {
        abattementTotal: 0,
        abattementUtilise: 0,
        abattementResiduel: 0,
        rappelFiscal: { donationsRappelees: [], totalRappele: 0, abattementDejaUtilise: 0 }
      },
      baseTaxable: 0,
      progressiveTaxResult: {
        baseTaxable: 0,
        tranchesConsommees: 0,
        tranches: [],
        droitsTotal: 0
      },
      reductions: { reductionMutile: 0, reductionGuyane: 0, droitsApresReduction: 0 },
      droitsFinaux: 0
    };
  }
  
  const baseAvantAbattement = partBrute - exonerations;
  
  // 2. Calcul de l'abattement avec rappel fiscal
  const abattementResult = computeAbattementWithRappel(
    beneficiaryContext.personId,
    beneficiaryContext.lien,
    beneficiaryContext.isHandicapped || false,
    fiscalContext,
    beneficiaryContext.representationContext
  );
  
  const baseTaxable = Math.max(0, baseAvantAbattement - abattementResult.abattementResiduel);
  
  // 3. Calcul de l'impôt progressif
  const progressiveTaxResult = computeProgressiveTaxWithBrackets(
    baseTaxable,
    beneficiaryContext.lien,
    abattementResult.rappelFiscal,
    beneficiaryContext.representationContext?.hasPlurality || false
  );
  
  // 4. Réductions
  const reductions = computeReductions(
    progressiveTaxResult.droitsTotal,
    {
      isMutileGuerre: beneficiaryContext.isMutileGuerre,
      isFromGuyane: beneficiaryContext.isFromGuyane
    }
  );
  
  return {
    partBrute,
    exonerations,
    baseAvantAbattement,
    abattementResult,
    baseTaxable,
    progressiveTaxResult,
    reductions,
    droitsFinaux: reductions.droitsApresReduction
  };
}

/**
 * Moteur simplifié (pour compatibilité avec l'ancien système)
 */
function computeSimplifiedTax(
  partBrute: Money,
  lien: Lien,
  consumedBracketsAmount: Money,
  params: Params
): { base: Money; abattementApplied: Money; tax: Money } {
  
  // Exonération conjoint/PACS
  if (lien === 'conjoint' || lien === 'pacs') {
    return { base: 0, abattementApplied: partBrute, tax: 0 };
  }
  
  // 1) Appliquer abattement
  const { base, abattementApplied } = applyAbattement(partBrute, lien, params);
  
  // 2) Calculer l'impôt progressif avec tranches consommées
  const { tax } = computeProgressiveTax(base, lien, consumedBracketsAmount, params);
  
  return { base, abattementApplied, tax };
}

/** soustrait abattement (capped at amount) */
function applyAbattement(amount: Money, lien: Lien, params: Params): { base: Money; abattementApplied: Money } {
  const key = (lien === 'enfant' || lien === 'parent') ? 'enfant_ascendant'
            : lien === 'frere_soeur' ? 'frere_soeur'
            : lien === 'neveu_niece' ? 'neveu_niece'
            : lien === 'tiers' ? 'tiers'
            : 'enfant_ascendant';
  const ab = params.abattements[key] ?? 0;
  const applied = Math.min(ab, amount);
  return { base: Math.max(0, amount - applied), abattementApplied: applied };
}

/**
 * compute progressive tax with "consumedBracketsAmount"
 * consumedBracketsAmount = amount already 'consumed' by prior donations (rappel) that used lower tax brackets
 * We simulate consumption by "skipping" the bottom of the barème by consumedBracketsAmount.
 */
function computeProgressiveTax(amount: Money, lien: Lien, consumedBracketsAmount: Money, params: Params) {
  // Exonération conjoint/PACS
  if (lien === 'conjoint' || lien === 'pacs') {
    return { tax: 0 };
  }

  const bareme = (lien === 'enfant' || lien === 'parent') ? params.baremes['ligne_directe']
               : lien === 'frere_soeur' ? params.baremes['frere_soeur']
               : params.baremes['autre'];

  // If consumedBracketsAmount > 0, we reduce the "starting point"
  // by removing consumedBracketsAmount from the lowest tranches first.
  let remainingConsumed = consumedBracketsAmount;
  let tax = 0;
  let prevLimit = 0;
  let remainingAmount = amount;

  for (let i = 0; i < bareme.length; i++) {
    const tranche = bareme[i];
    const trancheLimit = tranche.upTo === null ? Infinity : tranche.upTo;
    const trancheWidth = trancheLimit - prevLimit;

    // If consumed still covers this whole tranche, skip it
    if (remainingConsumed >= trancheWidth) {
      remainingConsumed -= trancheWidth;
      prevLimit = trancheLimit;
      continue;
    }

    // Part of this tranche is consumed, so we start from the remaining part
    const effectiveStart = prevLimit + remainingConsumed;
    const effectiveEnd = trancheLimit;
    
    // How much of our amount falls in this tranche?
    const amountInThisTranche = Math.max(0, Math.min(remainingAmount, effectiveEnd - effectiveStart));
    
    if (amountInThisTranche > 0) {
      tax += amountInThisTranche * tranche.rate;
      remainingAmount -= amountInThisTranche;
    }

    // After first tranche with consumption, no more consumption
    remainingConsumed = 0;
    prevLimit = trancheLimit;
    
    if (remainingAmount <= 0) break;
  }

  return { tax: roundEuros(tax) };
}

/**
 * Debug function to compare calculations
 */
export function debugCalculation(
  partBrute: Money,
  lien: Lien,
  consumedBracketsAmount: Money,
  params: Params
) {
  if (import.meta.env.DEV) console.log(`=== Debug calcul pour ${lien} ===`);
  if (import.meta.env.DEV) console.log(`Part brute: ${partBrute}€`);
  if (import.meta.env.DEV) console.log(`Tranches consommées: ${consumedBracketsAmount}€`);

  const result = computeInheritanceForBeneficiary(partBrute, lien, consumedBracketsAmount, params);

  if (import.meta.env.DEV) console.log(`Abattement appliqué: ${result.abattementApplied}€`);
  if (import.meta.env.DEV) console.log(`Base taxable: ${result.base}€`);
  if (import.meta.env.DEV) console.log(`Droits calculés: ${result.tax}€`);
  
  return result;
}