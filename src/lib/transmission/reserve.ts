import { PatrimonySnapshot, Liberalite, CLAUSE_DISPENSE_RAPPORT, CLAUSE_RAPPORT_FORFAITAIRE } from './types';

/**
 * Une donation dispensée de rapport (art. 860 al. 3, §9.4) est reclassée
 * "hors part successorale" : la clause ne fait pas que retirer le rapport
 * d'une donation par ailleurs en avancement de part, elle change aussi son
 * imputation (art. 843 — présomption inversée par stipulation expresse).
 */
function isDispenseeDeRapport(liberalite: Liberalite): boolean {
  return !!liberalite.clauses?.includes(CLAUSE_DISPENSE_RAPPORT);
}

/**
 * Montant forfaitaire de rapport (art. 860 al. 4, §9.8), si la clause est
 * active ET qu'un montant strictement positif a été renseigné — sinon
 * `undefined`, pour retomber sur le comportement normal (défense en
 * profondeur : DonationForm.tsx bloque déjà la sauvegarde d'une clause sans
 * montant, mais une ligne créée avant ce correctif ne doit pas planter ni
 * produire un résultat silencieusement faux).
 */
function getMontantRapportForfaitaire(liberalite: Liberalite): number | undefined {
  if (!liberalite.clauses?.includes(CLAUSE_RAPPORT_FORFAITAIRE)) return undefined;
  const montant = liberalite.montantRapportForfaitaire;
  return typeof montant === 'number' && montant > 0 ? montant : undefined;
}

export interface ReserveResult {
  masseCalcul: number;
  reserveGlobale: number;
  quotiteDisponible: number;
  reserveEnfants: number;
  reserveConjoint: number;
}

export interface ImputationResult {
  donations: { liberaliteId: string; imputeSurReserve: number; imputeSurQD: number; besoinSurQD: number }[];
  legs: { liberaliteId: string; imputeSurQD: number; besoinSurQD: number }[];
  qdRestante: number;
  reserveAtteinte: boolean;
  besoinTotalSurQD: number;
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
  // Biens existants au décès - dettes, écrêté à 0 si le passif excède l'actif
  // (art. 922 : le solde n'est jamais négatif pour la masse de calcul)
  let masseCalcul = Math.max(0, patrimony.biensExistants - patrimony.passifs);
  
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
  hasConjoint: boolean
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
  
  // Quotité disponible (art. 913-914 C. civ.) : fixée uniquement par le nombre
  // d'enfants, jamais par l'option d'exercice choisie par le conjoint survivant
  // au titre de l'art. 757 C. civ. (quart_pp / usufruit_total / etc.). Cette
  // option ne détermine que la répartition civile réelle des biens
  // (successionLegale.ts), pas le montant de la QD elle-même — la confondre
  // avec la QD conduisait par exemple à afficher 0 € de quotité disponible dès
  // que le conjoint choisissait l'usufruit total, alors que la QD reste 1/3
  // (masse - réserve enfants) pour 2 enfants.
  quotiteDisponible = masseCalcul - reserveEnfants - reserveConjoint;
  
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
 * Impute les libéralités sur la réserve et la quotité disponible selon l'ordre légal
 */
export function imputeLiberalites(
  liberalites: Liberalite[],
  reserveResult: ReserveResult,
  childrenIds: string[]
): ImputationResult {
  // Trier les donations par date (plus anciennes d'abord pour l'imputation)
  const donations = liberalites
    .filter(lib => lib.type === "donation")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const legs = liberalites.filter(lib => lib.type === "legs");
  
  const donationResults: { liberaliteId: string; imputeSurReserve: number; imputeSurQD: number; besoinSurQD: number }[] = [];
  const legResults: { liberaliteId: string; imputeSurQD: number; besoinSurQD: number }[] = [];

  let qdRestante = reserveResult.quotiteDisponible;
  let reserveEnfantsRestante = reserveResult.reserveEnfants;

  // 1. Imputer d'abord les donations (ordre chronologique)
  for (const donation of donations) {
    let imputeSurReserve = 0;
    let imputeSurQD = 0;
    let besoinSurQD = 0;

    // Donation-partage transgénérationnelle (art. 1078-8, référentiel §8.6.2) :
    // le bénéficiaire est un petit-enfant (jamais dans childrenIds), mais la
    // donation s'impute sur la réserve du PARENT désigné par
    // generationIntermediaireId, à la place de la QD (art. 847, traitement
    // d'une donation ordinaire à un petit-enfant).
    const imputeSurReserveDuParent =
      donation.typeImputation === "partage" &&
      !!donation.generationIntermediaireId &&
      childrenIds.includes(donation.generationIntermediaireId as string);

    // Si donation à un héritier réservataire (enfant, ou petit-enfant via
    // donation-partage transgénérationnelle ci-dessus) et pas explicitement
    // hors part (ni reclassée hors part par une dispense de rapport, §9.4) :
    // 'avance_part' et 'partage' suivent le même chemin d'imputation sur la
    // réserve (seule 'partage' diffère ensuite sur le rapport, cf. computeRapport).
    if ((childrenIds.includes(donation.beneficiaireId as string) || imputeSurReserveDuParent) &&
        donation.typeImputation !== "hors_part" &&
        !isDispenseeDeRapport(donation)) {
      // Donation en avancement de part : s'impute d'abord sur la part de réserve du bénéficiaire.
      // Rapport forfaitaire (art. 860 al. 4, §9.8) : c'est le FORFAIT, pas la valeur pleine,
      // qui suit ce chemin normal (réserve puis excédent sur QD) — l'écart entre la valeur
      // réelle et le forfait est un avantage hors part successorale distinct, imputé
      // directement sur la QD, jamais sur la réserve personnelle du bénéficiaire.
      const forfait = getMontantRapportForfaitaire(donation);
      const valeurImputable = forfait ?? donation.valeur;
      const reservePersonnelle = reserveResult.reserveEnfants / childrenIds.length;
      imputeSurReserve = Math.min(valeurImputable, reservePersonnelle);
      reserveEnfantsRestante -= imputeSurReserve;

      const excedentForfait = valeurImputable - imputeSurReserve;
      let besoinSurQDprincipal = 0;
      let imputeSurQDprincipal = 0;
      if (excedentForfait > 0) {
        // L'excédent s'impute sur la quotité disponible. besoinSurQDprincipal garde
        // l'excédent réel, non plafonné par le reliquat de QD déjà entamé par
        // les libéralités précédentes : sert à détecter le dépassement réel
        // (reserveAtteinte) et à répartir la réduction proportionnellement.
        besoinSurQDprincipal = excedentForfait;
        imputeSurQDprincipal = Math.min(excedentForfait, qdRestante);
        qdRestante -= imputeSurQDprincipal;
      }

      const avantageHorsPart = forfait !== undefined ? Math.max(0, donation.valeur - forfait) : 0;
      let imputeSurQDavantage = 0;
      if (avantageHorsPart > 0) {
        imputeSurQDavantage = Math.min(avantageHorsPart, qdRestante);
        qdRestante -= imputeSurQDavantage;
      }

      besoinSurQD = besoinSurQDprincipal + avantageHorsPart;
      imputeSurQD = imputeSurQDprincipal + imputeSurQDavantage;
    } else {
      // Donation hors part successorale ou à un non-réservataire : s'impute sur QD
      besoinSurQD = donation.valeur;
      imputeSurQD = Math.min(donation.valeur, qdRestante);
      qdRestante -= imputeSurQD;
    }

    donationResults.push({
      liberaliteId: donation.id,
      imputeSurReserve,
      imputeSurQD,
      besoinSurQD
    });
  }

  // 2. Imputer ensuite les legs concurremment avec donations entre époux (s'il y en a)
  // Un legs 'hors_part' (ou à un non-réservataire) s'impute directement sur QD.
  // Un legs 'avance_part' à un enfant réservataire suit le même chemin que la
  // donation en avance de part : réserve personnelle d'abord, excédent sur QD.
  for (const legItem of legs) {
    let imputeSurQD = 0;
    let besoinSurQD = 0;

    if (childrenIds.includes(legItem.beneficiaireId as string) &&
        legItem.typeImputation === "avance_part") {
      const reservePersonnelle = reserveResult.reserveEnfants / childrenIds.length;
      const imputeSurReserve = Math.min(legItem.valeur, reservePersonnelle);
      reserveEnfantsRestante -= imputeSurReserve;

      const excedent = legItem.valeur - imputeSurReserve;
      if (excedent > 0) {
        besoinSurQD = excedent;
        imputeSurQD = Math.min(excedent, qdRestante);
        qdRestante -= imputeSurQD;
      }
    } else {
      besoinSurQD = legItem.valeur;
      imputeSurQD = Math.min(legItem.valeur, qdRestante);
      qdRestante -= imputeSurQD;
    }

    legResults.push({
      liberaliteId: legItem.id,
      imputeSurQD,
      besoinSurQD
    });
  }

  // Vérifier si la réserve est atteinte : comparer le besoin brut total (non
  // plafonné par l'ordre de traitement) à la QD, et non la somme des
  // imputeSurQD capés — qui ne peut structurellement jamais dépasser qdRestante.
  const besoinTotalSurQD = donationResults.reduce((sum, d) => sum + d.besoinSurQD, 0) +
                          legResults.reduce((sum, l) => sum + l.besoinSurQD, 0);
  const reserveAtteinte = besoinTotalSurQD > reserveResult.quotiteDisponible;

  return {
    donations: donationResults,
    legs: legResults,
    qdRestante,
    reserveAtteinte,
    besoinTotalSurQD
  };
}

/**
 * Applique les réductions si la réserve est atteinte (ordre inverse des imputations)
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
  
  // Calculer le montant total qui dépasse la QD, à partir du besoin brut non
  // plafonné (besoinTotalSurQD) — les imputeSurQD capés ne peuvent, par
  // construction, jamais dépasser la QD et sous-estiment le dépassement réel.
  const depassement = imputationResult.besoinTotalSurQD - reserveResult.quotiteDisponible;
  
  if (depassement <= 0) {
    return { reductions, totalReduit };
  }
  
  // Ordre de réduction : legs en premier, puis donations (plus récente → plus ancienne)
  
  // 1. Réduire d'abord les legs concurremment (y compris donations entre époux si elles s'imputent avec)
  const legsToReduce = liberalites
    .filter(lib => lib.type === "legs")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let depassementRestant = depassement;
  
  // Réduction proportionnelle des legs
  if (legsToReduce.length > 0) {
    // Base de répartition : besoinSurQD (brut, non plafonné par l'ordre de
    // traitement) — sinon un legs traité après saturation de la QD par un
    // autre legs concurrent se verrait attribuer 0 dans la répartition,
    // alors qu'en droit les legs concurrents de même rang sont réduits au
    // marc le franc (art. 926 C. civ.), indépendamment de l'ordre de calcul.
    const totalLegsValue = legsToReduce.reduce((sum, leg) => {
      const legResult = imputationResult.legs.find(l => l.liberaliteId === leg.id);
      return sum + (legResult?.besoinSurQD || 0);
    }, 0);

    if (totalLegsValue > 0) {
      for (const legLib of legsToReduce) {
        if (depassementRestant <= 0) break;

        const legResult = imputationResult.legs.find(l => l.liberaliteId === legLib.id);
        if (!legResult || legResult.besoinSurQD === 0) continue;

        // Réduction proportionnelle
        const proportionalReduction = Math.min(
          legResult.besoinSurQD,
          (legResult.besoinSurQD / totalLegsValue) * depassement
        );
        
        const reduction = Math.min(proportionalReduction, depassementRestant);
        const ratio = reduction / legLib.valeur;
        
        reductions.push({
          liberaliteId: legLib.id,
          montantReduit: reduction,
          ratioReduction: ratio
        });
        
        totalReduit += reduction;
        depassementRestant -= reduction;
      }
    }
  }
  
  // 2. Si nécessaire, réduire les donations (plus récente vers plus ancienne)
  if (depassementRestant > 0) {
    const donationsToReduce = liberalites
      .filter(lib => lib.type === "donation")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const donationLib of donationsToReduce) {
      if (depassementRestant <= 0) break;
      
      const donationResult = imputationResult.donations.find(d => d.liberaliteId === donationLib.id);
      if (!donationResult || donationResult.besoinSurQD === 0) continue;

      const reduction = Math.min(donationResult.besoinSurQD, depassementRestant);
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
  reductions: ReductionResult,
  childrenIds: string[]
): { massePartageable: number; rapports: { personId: string; montantRapport: number }[] } {
  // Biens existants - libéralités à cause de mort maintenues + rapports + indemnités de réduction
  let massePartageable = patrimony.biensExistants - patrimony.passifs;

  const rapports: { personId: string; montantRapport: number }[] = [];

  // Un legs 'hors_part' (ou à un non-réservataire) est prélevé sur le pot
  // avant division, puis réattribué en totalité à son légataire (index.ts::
  // liberalitesMaintenues) — il vient en plus de sa part normale.
  // Un legs 'avance_part' ('sur part successorale') à un enfant réservataire
  // n'a en revanche jamais quitté la succession : il reste dans le pot à
  // diviser, et vient simplement en déduction de la part théorique de
  // l'héritier (comme une donation rapportable), pour que la distinction
  // avec 'hors_part' ait un effet réel sur le partage final.
  const legs = liberalites.filter(lib => lib.type === "legs");
  for (const legLib of legs) {
    const reduction = reductions.reductions.find(r => r.liberaliteId === legLib.id);
    const montantMaintenu = legLib.valeur - (reduction?.montantReduit || 0);

    const estSurPartReservataire = legLib.typeImputation === "avance_part" &&
      childrenIds.includes(legLib.beneficiaireId as string);

    if (estSurPartReservataire) {
      if (montantMaintenu > 0) {
        rapports.push({
          personId: legLib.beneficiaireId as string,
          montantRapport: montantMaintenu
        });
      }
    } else {
      massePartageable -= montantMaintenu;
    }
  }
  
  // Ajouter les rapports de donations rapportables à un enfant réservataire :
  // alignée sur imputeLiberalites (même présomption art. 843 — un type non
  // renseigné est traité comme avancement de part, donc rapportable, plutôt
  // que silencieusement exclu). 'hors_part' est par nature exclue du rapport ;
  // 'partage' reste exclue car sa valeur est figée au jour de l'acte et n'est
  // jamais réévaluée au partage. Une donation dispensée de rapport (§9.4) est
  // exclue au même titre qu'une donation 'hors_part' explicite. Le conjoint
  // n'est jamais tenu au rapport (art. 857), d'où le même filtre childrenIds
  // que celui déjà appliqué à la boucle des legs ci-dessus.
  const donations = liberalites.filter(lib =>
    lib.type === "donation" && lib.typeImputation !== "hors_part" &&
    lib.typeImputation !== "partage" &&
    !isDispenseeDeRapport(lib) &&
    childrenIds.includes(lib.beneficiaireId as string)
  );
  
  for (const donation of donations) {
    const reduction = reductions.reductions.find(r => r.liberaliteId === donation.id);
    const reductionTotal = reduction?.montantReduit || 0;
    const forfait = getMontantRapportForfaitaire(donation);

    let montantRapport: number;
    if (forfait !== undefined) {
      // Rapport forfaitaire (art. 860 al. 4, §9.8) : c'est le forfait qui est
      // rapporté, pas la valeur pleine — l'écart (avantage hors part) n'est
      // jamais rapporté, au même titre qu'une donation 'hors_part' ordinaire.
      // Une éventuelle réduction est imputée en priorité sur cet avantage
      // (composante la moins protégée, déjà hors part), et seulement
      // au-delà sur le forfait rapportable lui-même.
      const avantageHorsPart = Math.max(0, donation.valeur - forfait);
      const reductionSurAvantage = Math.min(reductionTotal, avantageHorsPart);
      const reductionSurForfait = reductionTotal - reductionSurAvantage;
      montantRapport = forfait - reductionSurForfait;
    } else {
      montantRapport = donation.valeur - reductionTotal;
    }

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