import { PatrimonySnapshot, Liberalite, ConjointOption } from './types';

export interface ReserveResult {
  masseCalcul: number;
  reserveGlobale: number;
  quotiteDisponible: number;
  reserveEnfants: number;
  reserveConjoint: number;
}

export interface ImputationResult {
  donations: { liberaliteId: string; imputeSurReserve: number; imputeSurQD: number }[];
  legs: { liberaliteId: string; imputeSurQD: number }[];
  qdRestante: number;
  reserveAtteinte: boolean;
}

export interface ReductionResult {
  reductions: { liberaliteId: string; montantReduit: number; ratioReduction: number }[];
  totalReduit: number;
}

/**
 * Calcule la masse de calcul pour la réserve
 */
export function computeMasseCalcul(
  patrimony: PatrimonySnapshot, 
  liberalites: Liberalite[]
): number {
  // Biens existants au décès - dettes
  let masseCalcul = patrimony.biensExistants - patrimony.passifs;
  
  // + toutes donations pour leur valeur au décès
  const donations = liberalites.filter(lib => lib.type === "donation");
  donations.forEach(donation => {
    masseCalcul += donation.valeur;
  });
  
  // Les legs ne rentrent pas dans la masse de calcul pour la réserve
  // mais sont pris en compte dans les biens existants s'ils concernent des biens existants
  
  return masseCalcul;
}

/**
 * Calcule la réserve et quotité disponible
 */
export function computeReserveAndQD(
  masseCalcul: number,
  nbEnfants: number,
  hasConjoint: boolean,
  conjointOption?: ConjointOption
): ReserveResult {
  let reserveEnfants = 0;
  let reserveConjoint = 0;
  let quotiteDisponible = masseCalcul;
  
  // Réserve des enfants
  if (nbEnfants > 0) {
    if (nbEnfants === 1) {
      reserveEnfants = masseCalcul * 0.5; // 1/2
    } else if (nbEnfants === 2) {
      reserveEnfants = masseCalcul * (2/3); // 2/3
    } else {
      reserveEnfants = masseCalcul * 0.75; // 3/4
    }
  }
  
  // Réserve du conjoint (sans enfants)
  if (hasConjoint && nbEnfants === 0) {
    reserveConjoint = masseCalcul * 0.25; // 1/4 en PP
  }
  
  // Quotité disponible
  if (hasConjoint && nbEnfants > 0 && conjointOption) {
    // QD spéciale entre époux
    switch (conjointOption) {
      case "quartPP":
        // QD ordinaire
        quotiteDisponible = masseCalcul - reserveEnfants;
        break;
      case "quartPP_plus_3quartsUS":
        // Réserve enfants = 3/4 en NP
        quotiteDisponible = masseCalcul * 0.25; // 1/4 PP seulement
        break;
      case "usufruitTotal":
        // Réserve enfants = totalité en NP
        quotiteDisponible = 0; // Pas de QD en PP
        break;
    }
  } else {
    quotiteDisponible = masseCalcul - reserveEnfants - reserveConjoint;
  }
  
  const reserveGlobale = reserveEnfants + reserveConjoint;
  
  return {
    masseCalcul,
    reserveGlobale,
    quotiteDisponible,
    reserveEnfants,
    reserveConjoint
  };
}

/**
 * Impute les libéralités sur la réserve et la quotité disponible
 */
export function imputeLiberalites(
  liberalites: Liberalite[],
  reserveResult: ReserveResult,
  childrenIds: string[]
): ImputationResult {
  const donations = liberalites.filter(lib => lib.type === "donation");
  const legs = liberalites.filter(lib => lib.type === "legs");
  
  const donationResults: { liberaliteId: string; imputeSurReserve: number; imputeSurQD: number }[] = [];
  const legResults: { liberaliteId: string; imputeSurQD: number }[] = [];
  
  let qdRestante = reserveResult.quotiteDisponible;
  let reserveEnfantsRestante = reserveResult.reserveEnfants;
  
  // 1. Imputer d'abord les donations
  for (const donation of donations) {
    let imputeSurReserve = 0;
    let imputeSurQD = 0;
    
    // Si donation à un réservataire (enfant)
    if (childrenIds.includes(donation.beneficiaireId as string)) {
      // S'impute d'abord sur sa part de réserve
      const reservePersonnelle = reserveResult.reserveEnfants / childrenIds.length;
      imputeSurReserve = Math.min(donation.valeur, reservePersonnelle);
      
      const excedent = donation.valeur - imputeSurReserve;
      if (excedent > 0) {
        // Excédent sur QD
        imputeSurQD = Math.min(excedent, qdRestante);
        qdRestante -= imputeSurQD;
      }
      
      reserveEnfantsRestante -= imputeSurReserve;
    } else {
      // Donation à un non-réservataire : s'impute sur QD
      imputeSurQD = Math.min(donation.valeur, qdRestante);
      qdRestante -= imputeSurQD;
    }
    
    donationResults.push({
      liberaliteId: donation.id,
      imputeSurReserve,
      imputeSurQD
    });
  }
  
  // 2. Imputer ensuite les legs (sur QD uniquement)
  for (const legItem of legs) {
    const imputeSurQD = Math.min(legItem.valeur, qdRestante);
    qdRestante -= imputeSurQD;
    
    legResults.push({
      liberaliteId: legItem.id,
      imputeSurQD
    });
  }
  
  // Vérifier si la réserve est atteinte
  const totalImputeSurQD = donationResults.reduce((sum, d) => sum + d.imputeSurQD, 0) +
                          legResults.reduce((sum, l) => sum + l.imputeSurQD, 0);
  const reserveAtteinte = totalImputeSurQD > reserveResult.quotiteDisponible;
  
  return {
    donations: donationResults,
    legs: legResults,
    qdRestante,
    reserveAtteinte
  };
}

/**
 * Applique les réductions si la réserve est atteinte
 */
export function applyReductions(
  liberalites: Liberalite[],
  imputationResult: ImputationResult,
  reserveResult: ReserveResult
): ReductionResult {
  const reductions: { liberaliteId: string; montantReduit: number; ratioReduction: number }[] = [];
  let totalReduit = 0;
  
  if (!imputationResult.reserveAtteinte) {
    return { reductions, totalReduit };
  }
  
  // Calculer le montant total qui dépasse la QD
  const totalLiberalitesSurQD = imputationResult.donations.reduce((sum, d) => sum + d.imputeSurQD, 0) +
                               imputationResult.legs.reduce((sum, l) => sum + l.imputeSurQD, 0);
  
  const depassement = totalLiberalitesSurQD - reserveResult.quotiteDisponible;
  
  if (depassement <= 0) {
    return { reductions, totalReduit };
  }
  
  // 1. Réduire d'abord les legs (ordre inverse chronologique)
  const legsToReduce = liberalites
    .filter(lib => lib.type === "legs")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let depassementRestant = depassement;
  
  for (const legLib of legsToReduce) {
    if (depassementRestant <= 0) break;
    
    const legResult = imputationResult.legs.find(l => l.liberaliteId === legLib.id);
    if (!legResult || legResult.imputeSurQD === 0) continue;
    
    const reduction = Math.min(legResult.imputeSurQD, depassementRestant);
    const ratio = reduction / legLib.valeur;
    
    reductions.push({
      liberaliteId: legLib.id,
      montantReduit: reduction,
      ratioReduction: ratio
    });
    
    totalReduit += reduction;
    depassementRestant -= reduction;
  }
  
  // 2. Si nécessaire, réduire les donations (plus récente vers plus ancienne)
  if (depassementRestant > 0) {
    const donations = liberalites
      .filter(lib => lib.type === "donation")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const donationLib of donations) {
      if (depassementRestant <= 0) break;
      
      const donationResult = imputationResult.donations.find(d => d.liberaliteId === donationLib.id);
      if (!donationResult || donationResult.imputeSurQD === 0) continue;
      
      const reduction = Math.min(donationResult.imputeSurQD, depassementRestant);
      const ratio = reduction / donationLib.valeur;
      
      reductions.push({
        liberaliteId: donationLib.id,
        montantReduit: reduction,
        ratioReduction: ratio
      });
      
      totalReduit += reduction;
      depassementRestant -= reduction;
    }
  }
  
  return { reductions, totalReduit };
}

/**
 * Calcule la masse partageable après rapport
 */
export function computeRapport(
  patrimony: PatrimonySnapshot,
  liberalites: Liberalite[],
  reductions: ReductionResult
): { massePartageable: number; rapports: { personId: string; montantRapport: number }[] } {
  // Biens existants - libéralités à cause de mort maintenues + rapports + indemnités de réduction
  let massePartageable = patrimony.biensExistants - patrimony.passifs;
  
  const rapports: { personId: string; montantRapport: number }[] = [];
  
  // Soustraire les legs maintenus (après réduction)
  const legs = liberalites.filter(lib => lib.type === "legs");
  for (const legLib of legs) {
    const reduction = reductions.reductions.find(r => r.liberaliteId === legLib.id);
    const montantMaintenu = legLib.valeur - (reduction?.montantReduit || 0);
    massePartageable -= montantMaintenu;
  }
  
  // Ajouter les rapports de donations rapportables
  const donations = liberalites.filter(lib => 
    lib.type === "donation" && (lib.rapportable === undefined || lib.rapportable === true)
  );
  
  for (const donation of donations) {
    const reduction = reductions.reductions.find(r => r.liberaliteId === donation.id);
    const montantRapport = donation.valeur - (reduction?.montantReduit || 0);
    
    if (montantRapport > 0) {
      massePartageable += montantRapport;
      rapports.push({
        personId: donation.beneficiaireId as string,
        montantRapport
      });
    }
  }
  
  // Ajouter les indemnités de réduction
  massePartageable += reductions.totalReduit;
  
  return { massePartageable, rapports };
}