import { CivilShare, AssetValuationResult, Beneficiary, DmtgParams, TaxBaseResult } from './types';

export function buildTaxBaseByBeneficiary(
  civilShares: CivilShare[],
  assetValuations: AssetValuationResult,
  beneficiaries: Beneficiary[],
  params: DmtgParams,
  deathDate: string,
  passif: number = 0,
  // Donations de biens ruraux en régime agricole du défunt à chaque
  // bénéficiaire, depuis moins de 15 ans : s'imputent sur son seuil (art.
  // 793 bis al. 2 CGI). Défaut : aucune.
  donationsRuralesParBeneficiaire: Record<string, number> = {}
): TaxBaseResult {
  // Actif net taxable (art. 768 CGI) : le passif s'impute sur l'actif après
  // abattements par bien (RP, bois…), jamais sous 0. Le forfait mobilier
  // reste réparti sur sa propre assiette (actif brut), cf. plus bas.
  const actifNetTaxable = Math.max(0, assetValuations.totalBaseTaxable - passif);

  const perBeneficiary: Record<string, number> = {};
  const perBeneficiaryForfaitMobilier: Record<string, number> = {};
  const justifs: string[] = [];

  // Initialiser les bases pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = 0;
    perBeneficiaryForfaitMobilier[ben.id] = 0;
  });

  // Répartir selon les parts civiles
  civilShares.forEach(share => {
    if (perBeneficiary.hasOwnProperty(share.beneficiaryId)) {
      const partBrute = actifNetTaxable * share.fraction;
      perBeneficiary[share.beneficiaryId] += partBrute;

      // Biens ruraux en régime agricole (art. 793 bis CGI) : au-delà du seuil
      // apprécié sur la part de CE bénéficiaire, l'exonération tombe de 3/4 à
      // 1/2 — la différence est réintégrée dans sa base.
      const { seuilAgricole, tauxAgricole, tauxAgricoleAuDela } = params.exonerationRurale;
      const seuilResiduel = Math.max(0, seuilAgricole - (donationsRuralesParBeneficiaire[share.beneficiaryId] || 0));
      const excedentAgricole = Math.max(0, assetValuations.valeurRuraleAgricole * share.fraction - seuilResiduel);
      if (excedentAgricole > 0) {
        const reintegration = excedentAgricole * (tauxAgricole - tauxAgricoleAuDela);
        perBeneficiary[share.beneficiaryId] += reintegration;
        justifs.push(`${share.beneficiaryId} : biens ruraux au-delà de ${Math.round(seuilResiduel)}€, exonération ramenée à 1/2 (+${Math.round(reintegration)}€)`);
      }
      justifs.push(`${share.beneficiaryId} : ${(share.fraction * 100)}% = ${Math.round(partBrute)}€`);

      // Forfait mobilier (art. 764 CGI) : même clé de répartition, mais
      // jamais mêlé à perBeneficiary (fiction fiscale, cf. types.ts).
      if (assetValuations.forfaitMobilier > 0) {
        perBeneficiaryForfaitMobilier[share.beneficiaryId] += assetValuations.forfaitMobilier * share.fraction;
      }
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

  beneficiaries.forEach(ben => {
    perBeneficiaryForfaitMobilier[ben.id] = Math.round(perBeneficiaryForfaitMobilier[ben.id]);
  });

  return {
    perBeneficiary,
    perBeneficiaryForfaitMobilier,
    total: Math.round(total),
    justifs
  };
}