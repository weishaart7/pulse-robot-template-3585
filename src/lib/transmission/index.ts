import {
  FamilyGraph,
  PatrimonySnapshot,
  Liberalite,
  TransmissionParams,
  TransmissionResult,
  ConjointOption,
  PersonId
} from './types';
import { calculateSuccessionLegale } from './successionLegale';
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
  
  // 1. Dévolution civile (succession légale, source unique de vérité)
  // hasTestament = false : la dévolution légale détermine toujours les réservataires,
  // un testament ne fait que redistribuer la quotité disponible (ne supprime pas la réserve).
  const successionLegaleResult = calculateSuccessionLegale(family, false, conjointOption);
  const heirsShares = successionLegaleResult.heritiers;
  
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
  const personIdsDejaImputes = new Set<PersonId>();
  const heirs = heirsShares.map(heir => {
    // Part civile ajustée selon les réductions et rapports
    let partFinale = heir.quotePart * rapportResult.massePartageable;

    // Un même héritier peut désormais porter plusieurs parts (ex: conjoint 1/4 PP + usufruit 3/4).
    // Rapport et libéralités ne doivent être imputés qu'une seule fois par personne, pas par ligne.
    const dejaImpute = personIdsDejaImputes.has(heir.personId);
    personIdsDejaImputes.add(heir.personId);

    if (!dejaImpute) {
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
    }

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
      nom: `${heir.prenom} ${heir.nom}`.trim(),
      lien: heir.lien,
      partCivile: heir.quotePart * masseCalcul,
      partFinale: Math.max(0, partFinale),
      baseFiscale,
      droitsSuccession,
      droits990I: prelevement990I.droits990I,
      typeQuotePart: heir.typeQuotePart,
      representation: heir.representation
    };
  });
  
  // Totaux
  const totalDroitsSuccession = heirs.reduce((sum, h) => sum + h.droitsSuccession, 0);
  const total990I = heirs.reduce((sum, h) => sum + (h.droits990I || 0), 0);
  
  // Frais de notaire sur l'actif brut
  const notaryFeesResult = computeNotaryFees(patrimony.biensExistants, params);
  
  // Transmission nette = Patrimoine Net - Droits de succession - Montant AV - Frais de notaire
  const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
  const transmissionNette = patrimoineNet - totalDroitsSuccession - 
                           (patrimony.assuranceVieTotal || 0) - notaryFeesResult.frais;
  
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
    },
    explicationsTexte: successionLegaleResult.explicationsTexte,
    optionConjoint: successionLegaleResult.optionConjoint
  };
}

// Export des fonctions utilitaires
export * from './types';
export * from './successionLegale';
export * from './reserve';
export * from './fiscal';