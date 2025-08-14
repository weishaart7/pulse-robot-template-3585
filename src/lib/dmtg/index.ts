import { DMTGContext, DMTGResult, DmtgParams } from './types';
import { computeMatrimonialLiquidation } from './matrimonial';
import { filterAndValueEstateAssets } from './assets';
import { buildTaxBaseByBeneficiary } from './beneficiary';
import { computeRecallAndAllowances, filterDonations15Years } from './recall';
import { computeProgressiveTax } from './tax';
import { computeAssuranceVie } from './assurance-vie';
import dmtgParamsData from './params-dmtg.json';

/**
 * Orchestrateur principal : calcule les droits de mutation à titre gratuit (DMTG)
 */
export function computeDMTG(ctx: DMTGContext): DMTGResult {
  const logs: string[] = [];
  const { deathDate, params, regimeMatrimonial, assets, civilShares, beneficiaries, donations, avContracts } = ctx;

  logs.push(`=== Calcul DMTG pour décès du ${deathDate} ===`);

  // Phase 1 : Liquidation matrimoniale & périmètre taxable
  const matrimonialResult = computeMatrimonialLiquidation({
    regime: regimeMatrimonial?.regime || 'séparation',
    actifCommun: regimeMatrimonial?.actifCommun || 0,
    passifCommun: regimeMatrimonial?.passifCommun || 0,
    avantagesMatrimoniaux: regimeMatrimonial?.avantagesMatrimoniaux || []
  });
  logs.push(`Liquidation matrimoniale : ${matrimonialResult.demiBoniPourSuccession}€`);

  // Phase 2 : Évaluation des actifs
  const assetValuations = filterAndValueEstateAssets(assets, params, deathDate);
  logs.push(`Masse taxable après abattements : ${assetValuations.totalBaseTaxable}€`);

  // Phase 3 : Base par bénéficiaire (hors AV)
  const taxBaseResult = buildTaxBaseByBeneficiary(
    civilShares,
    assetValuations,
    beneficiaries,
    params,
    deathDate
  );
  logs.push(`Base répartie entre ${beneficiaries.length} bénéficiaires`);

  // Phase 6 : Assurance-vie (calculée séparément)
  const avResult = computeAssuranceVie(avContracts, beneficiaries, params, deathDate);
  logs.push(`Contrats AV traités : ${avContracts.length}`);

  // Phase 4, 5, 7 : Calcul par bénéficiaire
  const perBeneficiary: Record<string, any> = {};
  let totalDroitsHorsAV = 0;
  let totalPrelev990I = 0;

  beneficiaries.forEach(beneficiary => {
    const benId = beneficiary.id;
    const baseHorsAV = taxBaseResult.perBeneficiary[benId] || 0;
    
    // Ajouter la réintégration 757B à la base
    const reintegration757B = avResult.perBeneficiary[benId]?.reintegration757B || 0;
    const baseApresFrais = baseHorsAV + reintegration757B;

    // Phase 4 : Rappel fiscal (15 ans)
    const donations15y = filterDonations15Years(donations, deathDate, benId);
    const recallResult = computeRecallAndAllowances({
      beneficiary,
      donations15y,
      params
    });

    // Base taxable après abattements
    const taxableAfterAllowance = Math.max(0, baseApresFrais - (recallResult.allowanceGeneralResidual === Infinity ? baseApresFrais : recallResult.allowanceGeneralResidual));

    // Phase 5 : Barème & calcul de droits
    const taxResult = computeProgressiveTax(
      taxableAfterAllowance,
      beneficiary.lien,
      recallResult.consumedBracketsAmount,
      params
    );

    const prelev990I = avResult.perBeneficiary[benId]?.prelev990I || 0;
    const droitsTotaux = taxResult.taxe + prelev990I;

    totalDroitsHorsAV += taxResult.taxe;
    totalPrelev990I += prelev990I;

    perBeneficiary[benId] = {
      baseHorsAV: Math.round(baseHorsAV),
      fraisFunerairesImputes: Math.round(baseHorsAV > 0 ? params.fraisFunerairesForfait * (baseHorsAV / taxBaseResult.total) : 0),
      baseApresFrais: Math.round(baseApresFrais),
      allowanceGeneralResidual: recallResult.allowanceGeneralResidual,
      taxableAfterAllowance: Math.round(taxableAfterAllowance),
      consumedBracketsAmount: recallResult.consumedBracketsAmount,
      droitsHorsAV: taxResult.taxe,
      prelev990I: Math.round(prelev990I),
      reintegration757B: Math.round(reintegration757B),
      droitsTotaux: Math.round(droitsTotaux),
      notes: [
        ...matrimonialResult.notes,
        ...assetValuations.lignes.filter(l => l.assetId.includes(benId)).flatMap(l => l.justifs),
        ...avResult.notes.filter(note => note.includes(benId))
      ]
    };

    logs.push(`${benId} (${beneficiary.lien}) : base=${Math.round(baseApresFrais)}€, droits=${Math.round(droitsTotaux)}€`);
  });

  return {
    perBeneficiary,
    totals: {
      droitsHorsAV: Math.round(totalDroitsHorsAV),
      prelev990I: Math.round(totalPrelev990I),
      droitsTotaux: Math.round(totalDroitsHorsAV + totalPrelev990I)
    },
    logs
  };
}

// Fonctions utilitaires exportées
export * from './types';
export * from './matrimonial';
export * from './assets';
export * from './beneficiary';
export * from './recall';
export * from './tax';
export * from './assurance-vie';

// Paramètres par défaut
export const DEFAULT_DMTG_PARAMS: DmtgParams = dmtgParamsData as DmtgParams;