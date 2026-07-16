import { Money, Lien, DmtgParams, ProgressiveTaxResult } from './types';

export function computeProgressiveTax(
  amountAfterAllowance: Money,
  lien: Lien,
  consumedBracketsAmount: Money,
  params: DmtgParams,
  comesFromRepresentationWithPlurality: boolean = false
): ProgressiveTaxResult {
  // Conjoint/PACS : exonération totale
  if (lien === 'conjoint' || lien === 'pacs') {
    return {
      taxe: 0,
      trancheDetails: [{
        from: 0,
        to: amountAfterAllowance,
        rate: 0,
        base: amountAfterAllowance,
        duty: 0
      }]
    };
  }

  // Sélectionner le barème approprié (un neveu/nièce venant en
  // représentation d'un frère/sœur prédécédé relève du barème frère/sœur,
  // pas du barème collatéral à 55%, cf. getBaremeForLien).
  const bareme = getBaremeForLien(lien, params, comesFromRepresentationWithPlurality);

  // Calcul progressif en tenant compte des tranches déjà consommées
  const trancheDetails: Array<{ from: Money; to: Money; rate: number; base: Money; duty: Money }> = [];
  let totalTaxe = 0;
  let currentBase = 0;
  let remainingAmount = amountAfterAllowance;

  for (const tranche of bareme) {
    const trancheMax = tranche.upTo || Infinity;
    const trancheSize = trancheMax - currentBase;
    
    // Calculer la partie de cette tranche déjà consommée par les donations
    const consumedInThisTranche = Math.max(0, Math.min(consumedBracketsAmount - currentBase, trancheSize));
    const availableInTranche = trancheSize - consumedInThisTranche;
    
    if (remainingAmount > 0 && availableInTranche > 0) {
      const baseForThisTranche = Math.min(remainingAmount, availableInTranche);
      const dutyForThisTranche = baseForThisTranche * tranche.rate;
      
      totalTaxe += dutyForThisTranche;
      remainingAmount -= baseForThisTranche;
      
      trancheDetails.push({
        from: currentBase + consumedInThisTranche,
        to: currentBase + consumedInThisTranche + baseForThisTranche,
        rate: tranche.rate,
        base: baseForThisTranche,
        duty: dutyForThisTranche
      });
    }
    
    currentBase = trancheMax;
    if (remainingAmount <= 0 || trancheMax === Infinity) break;
  }

  const result = {
    taxe: Math.round(totalTaxe),
    trancheDetails: trancheDetails.map(t => ({
      ...t,
      base: Math.round(t.base),
      duty: Math.round(t.duty)
    }))
  };
  
  if (import.meta.env.DEV) console.log(`Calcul progressif pour ${lien}: montant=${amountAfterAllowance}, tranches consommées=${consumedBracketsAmount}, résultat=${result.taxe}€`);
  return result;
}

export function getBaremeForLien(lien: Lien, params: DmtgParams, comesFromRepresentationWithPlurality?: boolean): Array<{ upTo: number | null; rate: number }> {
  switch (lien) {
    case 'enfant':
    case 'ascendant':
      return params.baremes.ligne_directe;
    case 'frere_soeur':
      return params.baremes.frere_soeur;
    case 'neveu_niece':
      // Tarif frères/sœurs si représentation avec pluralité de souches
      if (comesFromRepresentationWithPlurality) {
        return params.baremes.frere_soeur;
      }
      return [{ upTo: null, rate: 0.55 }];
    case 'collateral_4':
      return params.baremes.collateral_4;
    default:
      return params.baremes.autre;
  }
}