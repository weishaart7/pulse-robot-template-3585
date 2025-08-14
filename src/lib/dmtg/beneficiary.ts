import { CivilShare, AssetValuationResult, Beneficiary, DmtgParams, TaxBaseResult } from './types';

export function buildTaxBaseByBeneficiary(
  civilShares: CivilShare[],
  assetValuations: AssetValuationResult,
  beneficiaries: Beneficiary[],
  params: DmtgParams,
  deathDate: string
): TaxBaseResult {
  const perBeneficiary: Record<string, number> = {};
  const justifs: string[] = [];

  // Initialiser les bases pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = 0;
  });

  // Répartir selon les parts civiles
  civilShares.forEach(share => {
    if (perBeneficiary.hasOwnProperty(share.beneficiaryId)) {
      const partBrute = assetValuations.totalBaseTaxable * share.fraction;
      perBeneficiary[share.beneficiaryId] += partBrute;
      justifs.push(`${share.beneficiaryId} : ${(share.fraction * 100)}% = ${Math.round(partBrute)}€`);
    }
  });

  // Déduire forfait frais funéraires (1500€ réparti pro-rata)
  const totalBasesAvantFrais = Object.values(perBeneficiary).reduce((sum, val) => sum + val, 0);
  
  if (totalBasesAvantFrais > 0) {
    beneficiaries.forEach(ben => {
      if (perBeneficiary[ben.id] > 0) {
        const ratioFrais = perBeneficiary[ben.id] / totalBasesAvantFrais;
        const fraisImputes = params.fraisFunerairesForfait * ratioFrais;
        perBeneficiary[ben.id] -= fraisImputes;
        perBeneficiary[ben.id] = Math.max(0, Math.round(perBeneficiary[ben.id]));
        justifs.push(`${ben.id} : frais funéraires imputés ${Math.round(fraisImputes)}€`);
      }
    });
  }

  const total = Object.values(perBeneficiary).reduce((sum, val) => sum + val, 0);

  return {
    perBeneficiary,
    total: Math.round(total),
    justifs
  };
}