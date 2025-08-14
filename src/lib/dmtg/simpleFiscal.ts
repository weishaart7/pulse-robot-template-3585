// lib/dmtg/simpleFiscal.ts
type Money = number;
type Lien = 'enfant' | 'parent' | 'conjoint' | 'frere_soeur' | 'neveu_niece' | 'tiers' | 'autre';

interface Params {
  abattements: Record<string, Money>;
  baremes: { [k: string]: Array<{ upTo: number | null; rate: number }> };
}

function roundEuros(n: number) { return Math.round(n); }

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
  if (lien === 'conjoint') {
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

/** High-level compute for single beneficiary (without AV/demembrement) */
export function computeInheritanceForBeneficiary(
  partBrute: Money,
  lien: Lien,
  consumedBracketsAmount: Money,
  params: Params
) {
  // 1) apply abattement
  const { base, abattementApplied } = applyAbattement(partBrute, lien, params);
  // 2) compute progressive tax with consumed brackets
  const { tax } = computeProgressiveTax(base, lien, consumedBracketsAmount, params);
  return { base, abattementApplied, tax };
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
  console.log(`=== Debug calcul pour ${lien} ===`);
  console.log(`Part brute: ${partBrute}€`);
  console.log(`Tranches consommées: ${consumedBracketsAmount}€`);
  
  const result = computeInheritanceForBeneficiary(partBrute, lien, consumedBracketsAmount, params);
  
  console.log(`Abattement appliqué: ${result.abattementApplied}€`);
  console.log(`Base taxable: ${result.base}€`);
  console.log(`Droits calculés: ${result.tax}€`);
  
  return result;
}