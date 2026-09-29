/**
 * Chargement des données Transmission et calcul chaîné « ordre normal »
 * (l'Utilisateur décède en premier, puis le conjoint survivant), partagés
 * par Succession2ndDeces.tsx et la comparaison des options du conjoint
 * (Optimisation). Extraction à l'identique du code de Succession2ndDeces.tsx :
 * aucune règle nouvelle. Synthese.tsx et ProcessusCalcul.tsx gardent pour
 * l'instant leur propre chargement (dette signalée, cf. docs/transmission.md).
 */
import { supabase } from '@/integrations/supabase/client';
import { societeDutreilService } from '@/services/societeExtendedService';
import { assetDemembrementService } from '@/services/assetDemembrementService';
import type { Emprunt, Passif } from '@/services/passifService';
import {
  buildFamilyGraph,
  buildPatrimonySnapshot,
  buildPassifLines,
  buildTransmissionLiberalites,
  buildAVContracts,
  buildSpouseAsDecedentFamilyGraph,
  buildSurvivingSpousePatrimony,
  computeRecuAuPremierDeces,
  buildRecuAuPremierDecesRawAssets,
  buildSpouseRawAssets,
  buildParticipationAcquetsContext,
  buildRecompensesCalcInput,
  buildCreancesCalcInput,
  computeAVReintegrationCivile,
  AVContractRawRow
} from '@/utils/transmissionHelpers';
import {
  computeTransmission,
  computeChainedTransmission,
  ChainedTransmissionResult,
  ConjointOption,
  FamilyGraph,
  TransmissionParams,
  TransmissionContext
} from '@/lib/transmission';
import { DemembrementFractionContext } from '@/lib/patrimoine/demembrementFraction';
import { PatrimoineOriginaire, PatrimoineFinal } from '@/types/participationAcquets';
import { Recompense } from '@/types/recompense';
import { CreanceEntreEpoux } from '@/types/creanceEntreEpoux';
import { hasDonneesContratAV } from '@/constants/assetTypes';
import transmissionParamsData from '@/data/transmission-params.json';

export const buildTransmissionParams = (): TransmissionParams => ({
  abattements: {
    ...transmissionParamsData.abattements,
    conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
  },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I,
  debours: {
    mode: transmissionParamsData.debours.mode as 'pourcentage' | 'forfait',
    valeur: transmissionParamsData.debours.valeur
  }
});

/** Données brutes lues en base, sans aucun calcul. */
export interface TransmissionData {
  familyProfile: any;
  maritalStatus: any;
  familyLinks: any[];
  assets: any[];
  societesDutreil: string[];
  assetDemembrements: Awaited<ReturnType<typeof assetDemembrementService.getAllForUser>>;
  demembrementCtx: DemembrementFractionContext;
  totalAV: number;
  avContractsRaw: AVContractRawRow[];
  liberalites: any[];
  recompensesRows: Recompense[];
  creancesRows: CreanceEntreEpoux[];
  patrimoineOriginaireRows: PatrimoineOriginaire[];
  patrimoineFinalRows: PatrimoineFinal[];
}

export async function loadTransmissionData(userId: string): Promise<TransmissionData> {
  const { data: familyProfile } = await supabase
    .from('family_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: maritalStatus } = await supabase
    .from('marital_status')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('*')
    .eq('user_id', userId);

  // Sociétés sous pacte Dutreil validé (art. 787 B CGI, exonération de 75 %).
  const societesDutreil = await societeDutreilService.getSocietesEligibles().catch(() => [] as string[]);

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', userId);

  // Démembrement (barème 669 CGI) des actifs déjà en Usufruit/Nue-propriété
  // — même pondération que le Résumé Patrimoine (usePatrimoineCalculations.ts).
  const assetDemembrements = await assetDemembrementService.getAllForUser();
  const demembrementCtx: DemembrementFractionContext = { familyProfile, maritalStatus, familyLinks };

  const avAssets = (assets || []).filter(a => hasDonneesContratAV(a));
  const totalAV = avAssets.reduce((sum, a) => sum + (Number(a.valeur_estimee) || 0), 0);
  const avAssetIds = avAssets.map(a => a.id);
  const [avDetailsRes, avOperationsRes] = avAssetIds.length > 0
    ? await Promise.all([
        supabase.from('av_contract_details').select('asset_id, clause_beneficiaire_structuree, origine_fonds').in('asset_id', avAssetIds),
        supabase.from('av_operations').select('asset_id, type_operation, montant, date_operation').in('asset_id', avAssetIds)
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (avDetailsRes.error) {
    if (import.meta.env.DEV) {
      console.error('Erreur chargement détails assurance-vie:', avDetailsRes.error);
    }
    throw new Error("Les données d'assurance-vie n'ont pas pu être chargées, le calcul ne peut pas être fiable.");
  }
  if (avOperationsRes.error) {
    if (import.meta.env.DEV) {
      console.error('Erreur chargement opérations assurance-vie:', avOperationsRes.error);
    }
    throw new Error("Les opérations d'assurance-vie n'ont pas pu être chargées, le calcul ne peut pas être fiable.");
  }

  const avClauseByAsset = new Map<string, any>(
    (avDetailsRes.data || []).map((d: any) => [d.asset_id, d.clause_beneficiaire_structuree || null])
  );
  const avOrigineFondsByAsset = new Map<string, string | null>(
    (avDetailsRes.data || []).map((d: any) => [d.asset_id, d.origine_fonds || null])
  );
  const avOperationsByAsset = new Map<string, { type_operation: string; montant: number | null; date_operation: string }[]>();
  (avOperationsRes.data || []).forEach((op: any) => {
    const list = avOperationsByAsset.get(op.asset_id) || [];
    list.push({ type_operation: op.type_operation, montant: op.montant, date_operation: op.date_operation });
    avOperationsByAsset.set(op.asset_id, list);
  });
  const avContractsRaw: AVContractRawRow[] = avAssets.map(a => ({
    assetId: a.id,
    label: a.denomination,
    valeurEstimee: a.valeur_estimee,
    detenteur: a.detenteur,
    origineFonds: avOrigineFondsByAsset.get(a.id) || null,
    operations: avOperationsByAsset.get(a.id) || [],
    clauseBeneficiaireStructuree: avClauseByAsset.get(a.id) || null,
    nature: a.nature,
    sousTypePer: a.sous_type_per,
    garantieDeces: a.garantie_deces,
    conditionsExoneration990I: a.conditions_exoneration_990i
  }));

  const { data: liberalites } = await supabase
    .from('liberalites')
    .select('*')
    .eq('user_id', userId);

  // Participation aux acquêts (art. 1569-1581 C. civ.) et récompenses/
  // créances entre époux : lignes globales au couple, identiques quel que
  // soit le sens de décès simulé.
  const { data: patrimoineOriginaireRows } = await supabase
    .from('patrimoine_originaire')
    .select('*')
    .eq('user_id', userId);
  const { data: patrimoineFinalRows } = await supabase
    .from('patrimoine_final')
    .select('*')
    .eq('user_id', userId);
  const { data: recompensesRows } = await supabase
    .from('recompenses')
    .select('*')
    .eq('user_id', userId);
  const { data: creancesRows } = await supabase
    .from('creances_entre_epoux')
    .select('*')
    .eq('user_id', userId);

  return {
    familyProfile,
    maritalStatus,
    familyLinks: familyLinks || [],
    assets: assets || [],
    societesDutreil,
    assetDemembrements,
    demembrementCtx,
    totalAV,
    avContractsRaw,
    liberalites: liberalites || [],
    recompensesRows: (recompensesRows || []) as Recompense[],
    creancesRows: (creancesRows || []) as CreanceEntreEpoux[],
    patrimoineOriginaireRows: (patrimoineOriginaireRows || []) as PatrimoineOriginaire[],
    patrimoineFinalRows: (patrimoineFinalRows || []) as PatrimoineFinal[]
  };
}

/**
 * Éléments communs aux deux ordres de décès, indépendants de l'option du
 * conjoint. Peut lever AVDonneesInsuffisantesError (buildAVContracts).
 */
export interface OrdreNormalBase {
  data: TransmissionData;
  params: TransmissionParams;
  referenceDate: string;
  optionConjointEnregistree: ConjointOption | undefined;
  regimeMatrimonial: string | null | undefined;
  familyUtilisateur: FamilyGraph;
  avContractsUtilisateur: ReturnType<typeof buildAVContracts>;
  passifLinesUtilisateur: ReturnType<typeof buildPassifLines>;
  passifLinesBrut: ReturnType<typeof buildPassifLines>;
  participationAcquets: ReturnType<typeof buildParticipationAcquetsContext>;
  recompenses: ReturnType<typeof buildRecompensesCalcInput>;
  creancesEntreEpoux: ReturnType<typeof buildCreancesCalcInput>;
  /** Contexte du décès de l'Utilisateur, sans conjointOption (posé par option). */
  ctxUtilisateurDecedeSansOption: TransmissionContext;
}

export function buildOrdreNormalBase(data: TransmissionData, passifs: Passif[], emprunts: Emprunt[]): OrdreNormalBase {
  const { familyProfile, maritalStatus, familyLinks, assets, assetDemembrements, demembrementCtx } = data;
  const params = buildTransmissionParams();
  const referenceDate = new Date().toISOString().split('T')[0];
  const optionConjoint = (maritalStatus as any)?.option_conjoint as ConjointOption | null;
  const partageEnvisage = !!(maritalStatus as any)?.partage_envisage;
  const duhOpte = !!(maritalStatus as any)?.duh_opte;
  // regime_matrimonial n'a de sens que sous Marié(e) : ce champ n'est
  // jamais effacé en changeant de statut (cf. RelationInfoForm.tsx), donc
  // un ex-marié devenu Pacsé/Concubin peut garder une valeur périmée.
  const regimeMatrimonial = (maritalStatus as any)?.statut_couple === 'Marié(e)'
    ? ((maritalStatus as any)?.regime_matrimonial as string | null)
    : undefined;

  const familyUtilisateur: FamilyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks);
  const avContractsUtilisateur = buildAVContracts(
    data.avContractsRaw,
    familyProfile?.date_naissance,
    familyUtilisateur,
    referenceDate,
    (maritalStatus as any)?.date_naissance_conjoint
  );
  // Deux variantes du passif fusionné : `passifLinesUtilisateur` déduit la
  // part des emprunts couverte par l'assurance décès de l'Utilisateur (les
  // buildPatrimonySnapshot modélisent toujours SON propre patrimoine) ;
  // `passifLinesBrut` reste inchangé, pour buildSurvivingSpousePatrimony/
  // buildSpouseOwnBasePatrimony qui approximent le passif du conjoint
  // (l'assurance emprunteur du conjoint n'est pas déduite — limitation
  // documentée).
  const passifLinesUtilisateur = buildPassifLines(passifs, emprunts, 'user');
  const passifLinesBrut = buildPassifLines(passifs, emprunts);
  const patrimonyUtilisateur = buildPatrimonySnapshot(assets, passifLinesUtilisateur, data.totalAV, assetDemembrements, demembrementCtx);
  const participationAcquets = buildParticipationAcquetsContext(data.patrimoineOriginaireRows, data.patrimoineFinalRows, false);
  const recompenses = buildRecompensesCalcInput(data.recompensesRows);
  const creancesEntreEpoux = buildCreancesCalcInput(data.creancesRows);
  const { liberalites: liberalitesFormatted } = buildTransmissionLiberalites(data.liberalites, assets, true);

  const ctxUtilisateurDecedeSansOption: TransmissionContext = {
    family: familyUtilisateur,
    patrimony: patrimonyUtilisateur,
    liberalites: liberalitesFormatted,
    params,
    societesDutreil: data.societesDutreil,
    referenceDate,
    rawAssets: assets,
    assetDemembrements,
    demembrementCtx,
    avContracts: avContractsUtilisateur,
    // Contrat AV détenu par le conjoint survivant, non dénoué puisque
    // l'Utilisateur décède en premier ici : réintégré civilement (doctrine
    // Ciot, §9.6.1) sous régime de communauté + origine_fonds deniers
    // communs, jamais dans avContracts.
    avReintegrationCivileMontant: computeAVReintegrationCivile(avContractsUtilisateur, 'spouse', regimeMatrimonial),
    partageEnvisage,
    // Valeurs au jour du partage (art. 860) — succession de l'Utilisateur.
    valeurBiensPartage: (maritalStatus as { valeur_biens_partage?: number | null } | null)?.valeur_biens_partage ?? null,
    duhOpte,
    regimeMatrimonial,
    participationAcquets,
    recompenses,
    creancesEntreEpoux
  };

  return {
    data,
    params,
    referenceDate,
    optionConjointEnregistree: optionConjoint || undefined,
    regimeMatrimonial,
    familyUtilisateur,
    avContractsUtilisateur,
    passifLinesUtilisateur,
    passifLinesBrut,
    participationAcquets,
    recompenses,
    creancesEntreEpoux,
    ctxUtilisateurDecedeSansOption
  };
}

/**
 * Succession de l'Utilisateur puis du conjoint survivant, pour une option du
 * conjoint donnée. Le patrimoine du conjoint au 2nd décès dépend du 1er
 * décès (reçu en pleine propriété), donc de l'option.
 */
export function computeOrdreNormal(base: OrdreNormalBase, conjointOption: ConjointOption | undefined): ChainedTransmissionResult {
  const { data, params, referenceDate } = base;
  const { familyProfile, maritalStatus, familyLinks, assets, assetDemembrements, demembrementCtx } = data;
  const ctxUtilisateurDecede: TransmissionContext = { ...base.ctxUtilisateurDecedeSansOption, conjointOption };

  const firstDeathUtilisateur = computeTransmission(ctxUtilisateurDecede);
  const spouseFamily = buildSpouseAsDecedentFamilyGraph(familyProfile, maritalStatus, familyLinks);
  // Contrats du conjoint, dénoués à SON décès : clauses résolues contre
  // le graphe du 2nd décès (l'Utilisateur y est déjà décédé — une clause
  // à son profit est caduque ou bascule au rang suivant).
  const avContractsConjointAuDeces = buildAVContracts(
    data.avContractsRaw,
    familyProfile?.date_naissance,
    spouseFamily,
    referenceDate,
    (maritalStatus as any)?.date_naissance_conjoint
  );
  // Contrats réels du 1er décès : les capitaux AV/PER reçus par le conjoint
  // entrent dans sa succession — cf. computeRecuAuPremierDeces.
  const spousePatrimony = buildSurvivingSpousePatrimony(
    assets,
    base.passifLinesBrut,
    firstDeathUtilisateur,
    base.familyUtilisateur.survivingSpouseId!,
    base.avContractsUtilisateur,
    assetDemembrements,
    demembrementCtx
  );
  const recuParConjoint = computeRecuAuPremierDeces(firstDeathUtilisateur, base.familyUtilisateur.survivingSpouseId!, base.avContractsUtilisateur);
  return computeChainedTransmission({
    firstDeath: ctxUtilisateurDecede,
    secondDeath: {
      family: spouseFamily,
      patrimony: spousePatrimony,
      liberalites: [],
      params,
      societesDutreil: data.societesDutreil,
      referenceDate,
      // + reçu du 1er décès dans l'assiette fiscale (même montant que le
      // civil ci-dessus, cf. buildRecuAuPremierDecesRawAssets).
      rawAssets: [
        ...buildSpouseRawAssets(assets, assetDemembrements, demembrementCtx),
        ...buildRecuAuPremierDecesRawAssets(recuParConjoint)
      ],
      assetDemembrements,
      demembrementCtx,
      avContracts: avContractsConjointAuDeces
    }
  });
}

/** Indicateurs d'une option, lus sur le résultat chaîné (aucun recalcul). */
export interface OptionConjointSynthese {
  /** Net reçu par le conjoint au 1er décès (usufruit valorisé au barème 669 CGI). */
  netConjoint: number;
  /** Net reçu au 1er décès par les autres héritiers. */
  netAutresHeritiers1erDeces: number;
  droits1erDeces: number;
  droits2ndDeces: number;
  droitsTotaux: number;
  fraisNotaireTotaux: number;
  /** Net cumulé des héritiers hors conjoint : 1er décès + 2nd décès (réunion d'usufruit incluse). */
  netHeritiersCumule: number;
}

export function summarizeOptionConjoint(result: ChainedTransmissionResult): OptionConjointSynthese {
  const { firstDeath, secondDeath } = result;
  const spouseId = firstDeath.family.survivingSpouseId;
  const heirs1 = firstDeath.netBreakdown.heirs;
  const netConjoint = heirs1.filter(h => h.personId === spouseId).reduce((s, h) => s + h.netARecevoir, 0);
  const netAutresHeritiers1erDeces = heirs1.filter(h => h.personId !== spouseId).reduce((s, h) => s + h.netARecevoir, 0);
  const net2nd = result.transmissionNetteCombinee.reduce((s, e) => s + e.montant, 0);
  const droits1erDeces = firstDeath.dmtg.totals.droitsTotaux;
  const droits2ndDeces = secondDeath.dmtg.totals.droitsTotaux;
  return {
    netConjoint,
    netAutresHeritiers1erDeces,
    droits1erDeces,
    droits2ndDeces,
    droitsTotaux: droits1erDeces + droits2ndDeces,
    fraisNotaireTotaux: firstDeath.netBreakdown.totals.fraisNotaire + secondDeath.netBreakdown.totals.fraisNotaire,
    netHeritiersCumule: netAutresHeritiers1erDeces + net2nd
  };
}
