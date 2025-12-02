import { Money, MatrimonialLiquidationResult } from './types';
import { MatrimonialAnalysisResult, ClausesData, getSimplifiedRegime, RegimeType } from '@/types/matrimonial';

export interface MatrimonialLiquidationOptions {
  regime: 'communauté' | 'séparation' | 'participation' | 'autre';
  actifCommun: Money;
  passifCommun: Money;
  avantagesMatrimoniaux?: Array<{ 
    type: 'attribution_integrale' | 'preciput' | 'parts_inegales' | 'autre'; 
    valeur: Money;
    partPleineProprietee?: number;
    partUsufruit?: number;
  }>;
  clausesAnalysis?: MatrimonialAnalysisResult;
}

/**
 * Calcule l'impact de la liquidation du régime matrimonial sur la succession
 * En présence de clauses (attribution intégrale, préciput, etc.), ces biens
 * sont exclus de la masse successorale et transmis hors fiscalité DMTG
 */
export function computeMatrimonialLiquidation(opts: MatrimonialLiquidationOptions): MatrimonialLiquidationResult {
  const notes: string[] = [];
  let demiBoniPourSuccession = 0;
  let totalExcluParClauses = 0;

  // Calcul de base selon le régime
  if (opts.regime === 'communauté') {
    const boniCommun = opts.actifCommun - opts.passifCommun;
    
    // Vérifier si une clause d'attribution intégrale existe
    const attributionIntegrale = opts.avantagesMatrimoniaux?.find(
      av => av.type === 'attribution_integrale'
    );
    
    if (attributionIntegrale) {
      // Attribution intégrale : tout le boni va au conjoint, rien dans la succession
      demiBoniPourSuccession = 0;
      totalExcluParClauses += boniCommun;
      notes.push(`Clause d'attribution intégrale : la communauté (${boniCommun.toLocaleString()}€) revient intégralement au conjoint survivant`);
      notes.push(`Avantage matrimonial : exonéré de droits de succession`);
    } else {
      // Vérifier partage inégal
      const partageInegal = opts.avantagesMatrimoniaux?.find(
        av => av.type === 'parts_inegales'
      );
      
      if (partageInegal && partageInegal.partPleineProprietee) {
        // Partage inégal : le conjoint reçoit plus que 50%
        const partConjoint = partageInegal.partPleineProprietee / 100;
        const partSuccession = 1 - partConjoint;
        demiBoniPourSuccession = boniCommun * partSuccession;
        const avantageConjoint = boniCommun * partConjoint - (boniCommun / 2);
        totalExcluParClauses += avantageConjoint;
        notes.push(`Partage inégal : conjoint ${partageInegal.partPleineProprietee}% / succession ${(100 - partageInegal.partPleineProprietee)}%`);
        notes.push(`Part intégrée à la succession : ${demiBoniPourSuccession.toLocaleString()}€`);
        if (avantageConjoint > 0) {
          notes.push(`Avantage matrimonial (exonéré) : ${avantageConjoint.toLocaleString()}€`);
        }
      } else {
        // Partage normal 50/50
        demiBoniPourSuccession = boniCommun / 2;
        notes.push(`Régime de communauté : demi-boni de ${demiBoniPourSuccession.toLocaleString()}€ intégré à la succession`);
      }
    }
  } else if (opts.regime === 'séparation' || opts.regime === 'participation') {
    notes.push(`Régime de ${opts.regime} : pas de communauté à partager`);
    
    // Mais il peut y avoir une société d'acquêts
    if (opts.clausesAnalysis?.avantagesMatrimoniaux.some(av => av.clauseKey === 'societe_acquets')) {
      notes.push(`Société d'acquêts présente : voir clauses spécifiques`);
    }
  } else {
    notes.push(`Régime ${opts.regime} : pas d'impact sur la masse successorale`);
  }

  // Traitement des autres avantages matrimoniaux (préciput, etc.)
  if (opts.avantagesMatrimoniaux?.length) {
    for (const av of opts.avantagesMatrimoniaux) {
      if (av.type === 'preciput' && av.valeur > 0) {
        totalExcluParClauses += av.valeur;
        notes.push(`Préciput : ${av.valeur.toLocaleString()}€ prélevés par le conjoint (hors succession)`);
      }
    }
  }

  // Utiliser l'analyse des clauses si disponible
  if (opts.clausesAnalysis) {
    // Ajouter les notes de l'analyse
    opts.clausesAnalysis.notes.forEach(note => {
      if (!notes.includes(note)) {
        notes.push(note);
      }
    });
    
    // Récupérer le total exclu si pas déjà calculé
    if (totalExcluParClauses === 0 && opts.clausesAnalysis.totalExcluSuccession > 0) {
      totalExcluParClauses = opts.clausesAnalysis.totalExcluSuccession;
    }
  }

  if (totalExcluParClauses > 0) {
    notes.push(`─────────────────────────────`);
    notes.push(`Total transmis hors succession (avantages matrimoniaux) : ${totalExcluParClauses.toLocaleString()}€`);
  }

  return {
    demiBoniPourSuccession: Math.round(demiBoniPourSuccession),
    notes
  };
}

/**
 * Convertit les clauses stockées en base vers le format d'avantages matrimoniaux
 * pour le calcul DMTG
 */
export function convertClausesToAvantages(
  clausesData: ClausesData | null,
  regimeType: RegimeType | string,
  assetValues: Record<string, number>
): MatrimonialLiquidationOptions['avantagesMatrimoniaux'] {
  if (!clausesData) return [];
  
  const avantages: MatrimonialLiquidationOptions['avantagesMatrimoniaux'] = [];
  
  // Parcourir les clauses actives
  for (const [key, state] of Object.entries(clausesData)) {
    if (!state?.enabled) continue;
    
    // Calculer la valeur des biens sélectionnés
    let valeur = 0;
    if (state.selectedAssets?.length) {
      valeur = state.selectedAssets.reduce((sum, assetId) => sum + (assetValues[assetId] || 0), 0);
    }
    
    // Mapper vers le type d'avantage
    if (key.includes('attribution_integrale')) {
      avantages.push({
        type: 'attribution_integrale',
        valeur,
        partPleineProprietee: state.partPleineProprietee,
        partUsufruit: state.partUsufruit
      });
    } else if (key.includes('preciput')) {
      avantages.push({
        type: 'preciput',
        valeur
      });
    } else if (key.includes('partage_inegal')) {
      avantages.push({
        type: 'parts_inegales',
        valeur,
        partPleineProprietee: state.partPleineProprietee,
        partUsufruit: state.partUsufruit
      });
    }
  }
  
  return avantages;
}

/**
 * Détermine le régime simplifié à partir de la chaîne de régime matrimonial
 */
export function getRegimeFromString(regimeMatrimonial: string | null | undefined): 'communauté' | 'séparation' | 'participation' | 'autre' {
  if (!regimeMatrimonial) return 'autre';
  
  const regime = regimeMatrimonial.toLowerCase();
  
  if (regime.includes('communaut') || regime.includes('légal')) {
    return 'communauté';
  }
  if (regime.includes('sépar') || regime.includes('separ')) {
    return 'séparation';
  }
  if (regime.includes('participation')) {
    return 'participation';
  }
  
  return 'autre';
}
