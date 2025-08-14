// Diagnostic fiscal complet - comparaison ancien vs nouveau moteur
import { computeInheritanceForBeneficiary, computeCompleteFiscalTax } from './simpleFiscal';
import { FiscalContext } from './fiscalRules';
import DMTG_PARAMS from './params-dmtg.json';

export interface DiagnosticResult {
  beneficiary: {
    id: string;
    nom: string;
    lien: string;
    partBrute: number;
  };
  ancien: {
    abattementApplique: number;
    baseTaxable: number;
    droitsCalcules: number;
  };
  nouveau: {
    abattementTotal: number;
    abattementUtilise: number;
    abattementResiduel: number;
    baseTaxable: number;
    droitsCalcules: number;
    rappelFiscal: {
      donationsRappelees: number;
      totalRappele: number;
    };
    detailTranches: Array<{
      de: number;
      a: number | null;
      taux: number;
      baseImposable: number;
      droits: number;
    }>;
  };
  ecarts: {
    abattement: number;
    baseTaxable: number;
    droits: number;
    pourcentageEcart: number;
  };
  problemesPotentiels: string[];
}

/**
 * Effectue un diagnostic fiscal pour un bénéficiaire
 */
export function diagnoseFiscalCalculation(
  beneficiaryId: string,
  nom: string,
  lien: string,
  partBrute: number,
  fiscalContext: FiscalContext,
  isHandicapped: boolean = false,
  representationContext?: {
    isRepresenting: boolean;
    representedPersonId: string;
    numberOfRepresentants: number;
    hasPlurality?: boolean;
  }
): DiagnosticResult {
  
  // Calcul avec l'ancien moteur (simplifié)
  const ancienResult = computeInheritanceForBeneficiary(
    partBrute,
    lien as any,
    0, // Pas de tranches consommées dans l'ancien système
    DMTG_PARAMS
  );
  
  // Calcul avec le nouveau moteur (complet)
  const nouveauResult = computeCompleteFiscalTax(
    partBrute,
    fiscalContext,
    {
      personId: beneficiaryId,
      lien: lien as any,
      isHandicapped,
      representationContext
    }
  );
  
  // Calcul des écarts
  const ecartAbattement = nouveauResult.abattementResult.abattementUtilise - ancienResult.abattementApplied;
  const ecartBaseTaxable = nouveauResult.baseTaxable - ancienResult.base;
  const ecartDroits = nouveauResult.droitsFinaux - ancienResult.tax;
  const pourcentageEcart = ancienResult.tax > 0 ? 
    Math.round((ecartDroits / ancienResult.tax) * 100) : 0;
  
  // Identification des problèmes potentiels
  const problemes: string[] = [];
  
  if (Math.abs(ecartAbattement) > 100) {
    problemes.push(`Écart abattement significatif: ${ecartAbattement.toLocaleString()}€`);
  }
  
  if (nouveauResult.abattementResult.rappelFiscal.donationsRappelees.length > 0) {
    problemes.push(`${nouveauResult.abattementResult.rappelFiscal.donationsRappelees.length} donation(s) rappelée(s) sur 15 ans`);
  }
  
  if (Math.abs(pourcentageEcart) > 10) {
    problemes.push(`Écart droits > 10%: ${pourcentageEcart}%`);
  }
  
  if (lien === 'conjoint' && nouveauResult.droitsFinaux > 0) {
    problemes.push('Conjoint taxé (devrait être exonéré)');
  }
  
  if (nouveauResult.progressiveTaxResult.tranchesConsommees > 0) {
    problemes.push(`Tranches consommées par rappel: ${nouveauResult.progressiveTaxResult.tranchesConsommees.toLocaleString()}€`);
  }
  
  return {
    beneficiary: {
      id: beneficiaryId,
      nom,
      lien,
      partBrute
    },
    ancien: {
      abattementApplique: ancienResult.abattementApplied,
      baseTaxable: ancienResult.base,
      droitsCalcules: ancienResult.tax
    },
    nouveau: {
      abattementTotal: nouveauResult.abattementResult.abattementTotal,
      abattementUtilise: nouveauResult.abattementResult.abattementUtilise,
      abattementResiduel: nouveauResult.abattementResult.abattementResiduel,
      baseTaxable: nouveauResult.baseTaxable,
      droitsCalcules: nouveauResult.droitsFinaux,
      rappelFiscal: {
        donationsRappelees: nouveauResult.abattementResult.rappelFiscal.donationsRappelees.length,
        totalRappele: nouveauResult.abattementResult.rappelFiscal.totalRappele
      },
      detailTranches: nouveauResult.progressiveTaxResult.tranches
    },
    ecarts: {
      abattement: ecartAbattement,
      baseTaxable: ecartBaseTaxable,
      droits: ecartDroits,
      pourcentageEcart
    },
    problemesPotentiels: problemes
  };
}

/**
 * Diagnostic simple pour test de référence
 */
export function runFiscalDiagnostic() {
  console.log('🔍 === DIAGNOSTIC FISCAL DMTG ===');
  
  const params = DMTG_PARAMS;

  // Test 1: Référence officielle
  console.log('\n📋 Test 1: Enfant hérite 1,200,000€ (référence officielle)');
  const test1 = computeInheritanceForBeneficiary(1200000, 'enfant', 0, params);
  console.log(`✅ Résultat attendu: 292,673€`);
  console.log(`${test1.tax === 292673 ? '✅' : '❌'} Résultat obtenu: ${test1.tax.toLocaleString()}€`);

  // Test 2: Conjoint (exonération)
  console.log('\n📋 Test 2: Conjoint (exonération totale)');
  const test2 = computeInheritanceForBeneficiary(1000000, 'conjoint', 0, params);
  console.log(`${test2.tax === 0 ? '✅' : '❌'} Conjoint - droits: ${test2.tax}€`);

  console.log('\n🔍 === FIN DIAGNOSTIC ===');
  
  return {
    test1: test1.tax === 292673,
    test2: test2.tax === 0
  };
}