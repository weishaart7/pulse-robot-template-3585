import { DMTGContext, DMTGResult, DmtgParams } from './types';
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
  const { deathDate, params, assets, civilShares, beneficiaries, donations, avContracts } = ctx;

  logs.push(`=== Calcul DMTG pour décès du ${deathDate} ===`);
  if (import.meta.env.DEV) console.log('Context DMTG:', ctx);

  // Phase 1 (liquidation matrimoniale) : plus appelée ici depuis le
  // 2026-07-17. `regimeMatrimonial` (ctx) n'est plus jamais renseigné par
  // transmission/index.ts, seul appelant réel — la liquidation de communauté
  // est désormais faite en amont, bien par bien, par
  // lib/patrimoine/succession.ts::getPartSuccessorale (appliquée directement
  // sur `assets[].valeurVenale` ci-dessous). Appeler
  // dmtg/matrimonial.ts::computeMatrimonialLiquidation ici avec des valeurs
  // par défaut (regime 'séparation', 0€) ne ferait que produire un texte
  // trompeur (ex. "Régime de séparation : pas de communauté à partager" pour
  // un couple réellement en communauté légale déjà liquidée ailleurs) —
  // supprimé pour ne pas contredire le calcul réel. dmtg/matrimonial.ts
  // lui-même n'est pas modifié, seul cet appel l'est.

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
    
    if (import.meta.env.DEV) console.log(`=== Calcul pour ${benId} (${beneficiary.lien}) ===`);
    if (import.meta.env.DEV) console.log(`Base hors AV: ${baseHorsAV}€`);

    // Ajouter la réintégration 757B à la base
    const reintegration757B = avResult.perBeneficiary[benId]?.reintegration757B || 0;
    const baseApresFrais = baseHorsAV + reintegration757B;
    if (import.meta.env.DEV) console.log(`Base après frais: ${baseApresFrais}€`);

    // Phase 4 : Rappel fiscal (15 ans)
    const donations15y = filterDonations15Years(donations, deathDate, benId);
    const recallResult = computeRecallAndAllowances({
      beneficiary,
      donations15y,
      params
    });
    
    if (import.meta.env.DEV) console.log(`Abattement résiduel: ${recallResult.allowanceGeneralResidual}€`);
    if (import.meta.env.DEV) console.log(`Tranches consommées: ${recallResult.consumedBracketsAmount}€`);

    // Base taxable après abattements
    const taxableAfterAllowance = Math.max(0, baseApresFrais - (recallResult.allowanceGeneralResidual === Infinity ? baseApresFrais : recallResult.allowanceGeneralResidual));
    if (import.meta.env.DEV) console.log(`Base taxable après abattement: ${taxableAfterAllowance}€`);

    // Phase 5 : Barème & calcul de droits
    const taxResult = computeProgressiveTax(
      taxableAfterAllowance,
      beneficiary.lien,
      recallResult.consumedBracketsAmount,
      params,
      beneficiary.comesFromRepresentationWithPlurality
    );
    
    if (import.meta.env.DEV) console.log(`Droits calculés: ${taxResult.taxe}€`);

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