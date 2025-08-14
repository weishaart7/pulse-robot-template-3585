import { AVContract, Beneficiary, DmtgParams, AssuranceVieResult } from './types';

export function computeAssuranceVie(
  contracts: AVContract[],
  beneficiaries: Beneficiary[],
  params: DmtgParams,
  deathDate: string
): AssuranceVieResult {
  const perBeneficiary: Record<string, { prelev990I: number; reintegration757B: number }> = {};
  const notes: string[] = [];

  // Initialiser pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = { prelev990I: 0, reintegration757B: 0 };
  });

  // Calculer la réintégration 757B globale
  const totalPrimesApres70 = contracts.reduce((sum, contract) => sum + contract.primesApres70, 0);
  const exces757B = Math.max(0, totalPrimesApres70 - params.abattements.apres70_AV_global);
  
  if (exces757B > 0) {
    notes.push(`Primes après 70 ans : ${totalPrimesApres70}€ - Plafond : ${params.abattements.apres70_AV_global}€ - Excédent à réintégrer : ${exces757B}€`);
  }

  // Traiter chaque contrat
  contracts.forEach(contract => {
    // Calculer la répartition de l'excédent 757B pour ce contrat
    const ratioContrat = totalPrimesApres70 > 0 ? contract.primesApres70 / totalPrimesApres70 : 0;
    const exces757BContrat = exces757B * ratioContrat;

    contract.beneficiaires.forEach(beneficiaire => {
      const benef = beneficiaries.find(b => b.id === beneficiaire.beneficiaryId);
      if (!benef) return;

      // Réintégration 757B (prorata des quotes-parts)
      const reintegration757B = exces757BContrat * beneficiaire.quotePart;
      perBeneficiary[benef.id].reintegration757B += reintegration757B;

      // Prélèvement 990I
      let prelev990I = 0;
      
      // Vérifier les exonérations
      const isConjointPacsExonere = (benef.lien === 'conjoint' || benef.lien === 'pacs') && contract.isExonereBeneficiaireConjointPacs;
      const isFraterieExonere = benef.lien === 'frere_soeur' && contract.isSiblingExonEligible;

      if (!isConjointPacsExonere && !isFraterieExonere) {
        // Capital soumis au prélèvement (primes avant 70 ans)
        const capitalSoumis = contract.primesAvant70 * beneficiaire.quotePart;
        
        // Abattement 990I par bénéficiaire
        const baseImposable990I = Math.max(0, capitalSoumis - params.abattements.av_990I_allowance);
        
        if (baseImposable990I > 0) {
          // Appliquer le barème 990I
          prelev990I = computeBareme990I(baseImposable990I, params);
        }
      }

      perBeneficiary[benef.id].prelev990I += prelev990I;

      if (prelev990I > 0 || reintegration757B > 0) {
        notes.push(`${benef.id} - Contrat ${contract.id} : 990I=${Math.round(prelev990I)}€, 757B=${Math.round(reintegration757B)}€`);
      }
    });
  });

  // Arrondir les résultats
  Object.keys(perBeneficiary).forEach(benId => {
    perBeneficiary[benId].prelev990I = Math.round(perBeneficiary[benId].prelev990I);
    perBeneficiary[benId].reintegration757B = Math.round(perBeneficiary[benId].reintegration757B);
  });

  return { perBeneficiary, notes };
}

function computeBareme990I(baseImposable: number, params: DmtgParams): number {
  let totalTax = 0;
  let currentBase = 0;
  let remainingAmount = baseImposable;

  for (const tranche of params.av_990I_rates) {
    const trancheMax = tranche.upTo || Infinity;
    const trancheSize = trancheMax - currentBase;
    
    if (remainingAmount > 0) {
      const baseForThisTranche = Math.min(remainingAmount, trancheSize);
      const taxForThisTranche = baseForThisTranche * tranche.rate;
      
      totalTax += taxForThisTranche;
      remainingAmount -= baseForThisTranche;
    }
    
    currentBase = trancheMax;
    if (remainingAmount <= 0 || trancheMax === Infinity) break;
  }

  return totalTax;
}