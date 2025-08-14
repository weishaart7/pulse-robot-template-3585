import { 
  FamilyGraph, 
  PatrimonySnapshot, 
  Liberalite, 
  TransmissionParams, 
  TransmissionResult,
  ConjointOption 
} from './types';
import { computeHeirsShares } from './devolution';
import { 
  computeMasseCalcul, 
  computeReserveAndQD, 
  imputeLiberalites, 
  applyReductions, 
  computeRapport 
} from './reserve';
import { computeInheritanceTax, compute990I, computeNotaryFees } from './fiscal';
import { computeInheritanceForBeneficiary } from '../dmtg/simpleFiscal';
import DMTG_PARAMS from '../dmtg/params-dmtg.json';

export interface TransmissionContext {
  family: FamilyGraph;
  patrimony: PatrimonySnapshot;
  liberalites: Liberalite[];
  params: TransmissionParams;
  conjointOption?: ConjointOption;
}

/**
 * Orchestrateur principal : calcule la transmission complète
 */
export function computeTransmission(ctx: TransmissionContext): TransmissionResult {
  const { family, patrimony, liberalites, params, conjointOption } = ctx;
  
  // 1. Dévolution civile brute (heirs + conjoint)
  const heirsShares = computeHeirsShares(family);
  
  // 2. Masse de calcul / réserve / QD
  const masseCalcul = computeMasseCalcul(patrimony, liberalites);
  const nbEnfants = family.childrenOfDecedent.filter(childId => 
    !family.persons.find(p => p.id === childId)?.estDecede
  ).length;
  
  const reserveResult = computeReserveAndQD(
    masseCalcul, 
    nbEnfants, 
    family.hasSurvivingSpouse,
    conjointOption
  );
  
  // 3. Imputation donations -> legs
  const imputationResult = imputeLiberalites(
    liberalites, 
    reserveResult, 
    family.childrenOfDecedent
  );
  
  // 4. Réduction si nécessaire
  const reductionResult = applyReductions(
    liberalites, 
    imputationResult, 
    reserveResult
  );
  
  // 5. Rapport pour partage (égalité entre héritiers)
  const rapportResult = computeRapport(patrimony, liberalites, reductionResult);
  
  // 6. Calcul des parts finales et fiscalité
  const heirs = Object.values(heirsShares).map(heir => {
    // Part civile ajustée selon les réductions et rapports
    let partFinale = heir.part * rapportResult.massePartageable;
    
    // Soustraire le rapport si applicable
    const rapport = rapportResult.rapports.find(r => r.personId === heir.personId);
    if (rapport) {
      partFinale -= rapport.montantRapport;
    }
    
    // Ajouter les libéralités maintenues
    const liberalitesMaintenues = liberalites
      .filter(lib => lib.beneficiaireId === heir.personId)
      .reduce((sum, lib) => {
        const reduction = reductionResult.reductions.find(r => r.liberaliteId === lib.id);
        return sum + (lib.valeur - (reduction?.montantReduit || 0));
      }, 0);
    
    partFinale += liberalitesMaintenues;
    
    // Base fiscale = part finale
    const baseFiscale = Math.max(0, partFinale);
    
    // Droits de succession - utilisation du moteur fiscal corrigé
    let droitsSuccession = 0;
    if (baseFiscale > 0 && heir.lien !== "conjoint") {
      // TODO: Calculer les tranches consommées par le rappel fiscal (donations des 15 dernières années)
      const consumedBracketsAmount = 0; // À implémenter selon les donations antérieures
      
      const fiscalResult = computeInheritanceForBeneficiary(
        baseFiscale,
        heir.lien as any,
        consumedBracketsAmount,
        DMTG_PARAMS
      );
      droitsSuccession = fiscalResult.tax;
    }
    
    // Droits 990 I (si assurance-vie)
    const capitauxAV = 0; // À implémenter selon les contrats d'assurance-vie
    const prelevement990I = compute990I(heir.personId, heir.lien, capitauxAV, params);
    
    return {
      personId: heir.personId,
      nom: heir.nom,
      lien: heir.lien,
      partCivile: heir.part * masseCalcul,
      partFinale: Math.max(0, partFinale),
      baseFiscale,
      droitsSuccession,
      droits990I: prelevement990I.droits990I
    };
  });
  
  // Totaux
  const totalDroitsSuccession = heirs.reduce((sum, h) => sum + h.droitsSuccession, 0);
  const total990I = heirs.reduce((sum, h) => sum + (h.droits990I || 0), 0);
  
  // Frais de notaire sur l'actif brut
  const notaryFeesResult = computeNotaryFees(patrimony.biensExistants, params);
  
  // Transmission nette = actif - passif - droits - frais
  const transmissionNette = patrimony.biensExistants - patrimony.passifs - 
                           totalDroitsSuccession - total990I - notaryFeesResult.frais;
  
  return {
    masseCalcul: reserveResult.masseCalcul,
    reserve: reserveResult.reserveGlobale,
    quotiteDisponible: reserveResult.quotiteDisponible,
    transmissionNette,
    heirs,
    totalDroitsSuccession,
    total990I,
    fraisNotaire: notaryFeesResult.frais,
    details: {
      reductions: reductionResult.reductions,
      rapports: rapportResult.rapports
    }
  };
}

// Export des fonctions utilitaires
export * from './types';
export * from './devolution';
export * from './reserve';
export * from './fiscal';