import { computeInheritanceForBeneficiary, debugCalculation } from './simpleFiscal';
import { DEFAULT_DMTG_PARAMS } from './index';

/**
 * Diagnostic immédiat des calculs DMTG
 * Compare le moteur actuel avec le moteur de référence
 */
export function runFiscalDiagnostic() {
  console.log('🔍 === DIAGNOSTIC FISCAL DMTG ===');
  
  const params = {
    abattements: {
      enfant_ascendant: 100000,
      frere_soeur: 15932,
      neveu_niece: 7967,
      tiers: 1594,
      handicap: 159325
    },
    baremes: {
      ligne_directe: [
        { upTo: 8072, rate: 0.05 },
        { upTo: 12109, rate: 0.10 },
        { upTo: 15932, rate: 0.15 },
        { upTo: 552324, rate: 0.20 },
        { upTo: 902838, rate: 0.30 },
        { upTo: 1805677, rate: 0.40 },
        { upTo: null, rate: 0.45 }
      ],
      frere_soeur: [
        { upTo: 24430, rate: 0.35 },
        { upTo: null, rate: 0.45 }
      ],
      autre: [
        { upTo: null, rate: 0.60 }
      ]
    }
  };

  // Test 1: Référence officielle
  console.log('\n📋 Test 1: Enfant hérite 1,200,000€ (référence officielle)');
  const test1 = debugCalculation(1200000, 'enfant', 0, params);
  console.log(`✅ Résultat attendu: 292,673€`);
  console.log(`${test1.tax === 292673 ? '✅' : '❌'} Résultat obtenu: ${test1.tax.toLocaleString()}€`);

  // Test 2: Cas actuel problématique
  console.log('\n📋 Test 2: Cas actuel - Tiers hérite 717,206€');
  const test2 = debugCalculation(717206, 'autre', 0, params);
  const expectedTax2 = Math.round((717206 - 1594) * 0.60);
  console.log(`✅ Calcul attendu: ${expectedTax2.toLocaleString()}€ (60% sur ${(717206 - 1594).toLocaleString()}€)`);
  console.log(`${test2.tax === expectedTax2 ? '✅' : '❌'} Résultat obtenu: ${test2.tax.toLocaleString()}€`);

  // Test 3: Conjoint (exonération)
  console.log('\n📋 Test 3: Conjoint (exonération totale)');
  const test3 = computeInheritanceForBeneficiary(1000000, 'conjoint', 0, params);
  console.log(`${test3.tax === 0 ? '✅' : '❌'} Conjoint - droits: ${test3.tax}€`);

  // Test 4: Vérification des tranches
  console.log('\n📋 Test 4: Vérification calcul par tranches (enfant)');
  verifyBracketCalculation();

  console.log('\n🔍 === FIN DIAGNOSTIC ===');
  
  return {
    test1: test1.tax === 292673,
    test2: test2.tax === expectedTax2,
    test3: test3.tax === 0
  };
}

function verifyBracketCalculation() {
  const amount = 1100000; // Après abattement de 100k pour un enfant
  
  // Calcul manuel des tranches
  const tranches = [
    { from: 0, to: 8072, rate: 0.05 },
    { from: 8072, to: 12109, rate: 0.10 },
    { from: 12109, to: 15932, rate: 0.15 },
    { from: 15932, to: 552324, rate: 0.20 },
    { from: 552324, to: 902838, rate: 0.30 },
    { from: 902838, to: 1805677, rate: 0.40 }
  ];

  let totalTax = 0;
  let remaining = amount;
  
  console.log('   Détail par tranche:');
  
  for (const tranche of tranches) {
    if (remaining <= 0) break;
    
    const trancheSize = tranche.to - tranche.from;
    const taxableInTranche = Math.min(remaining, trancheSize);
    const taxForTranche = taxableInTranche * tranche.rate;
    
    totalTax += taxForTranche;
    remaining -= taxableInTranche;
    
    console.log(`   ${tranche.from.toLocaleString()}-${tranche.to.toLocaleString()}: ${taxableInTranche.toLocaleString()}€ × ${(tranche.rate * 100)}% = ${Math.round(taxForTranche).toLocaleString()}€`);
  }
  
  console.log(`   Total calculé manuellement: ${Math.round(totalTax).toLocaleString()}€`);
}