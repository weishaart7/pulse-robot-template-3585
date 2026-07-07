// Règles fiscales complètes pour les droits de succession français

export interface FiscalContext {
  decedentId: string;
  deathDate: string;
  donations: Array<{
    id: string;
    date: string;
    donorId: string;
    doneeId: string;
    valeur: number;
    isRappelFiscal?: boolean;
  }>;
}

export interface TaxableBase {
  personId: string;
  lien: string;
  partBrute: number;
  exonerations: number;
  passifDeduit: number;
  baseTaxable: number;
  isHandicapped?: boolean;
}

export interface AbattementResult {
  abattementTotal: number;
  abattementUtilise: number;
  abattementResiduel: number;
  rappelFiscal: {
    donationsRappelees: Array<{
      donationId: string;
      valeur: number;
      dateToDeathYears: number;
    }>;
    totalRappele: number;
    abattementDejaUtilise: number;
  };
}

export interface ProgressiveTaxResult {
  baseTaxable: number;
  tranchesConsommees: number;
  tranches: Array<{
    de: number;
    a: number | null;
    taux: number;
    baseImposable: number;
    droits: number;
  }>;
  droitsTotal: number;
}

/**
 * Calcule les mutations non imposables
 */
export function computeExemptions(
  patrimony: any,
  beneficiaryId: string,
  lien: string
): number {
  let exemptions = 0;
  
  // Conjoint survivant - exonération totale
  if (lien === 'conjoint' || lien === 'pacs') {
    return patrimony.biensExistants; // Exonération totale
  }
  
  // Autres exonérations spécifiques
  // TODO: Implémenter les autres cas (monuments historiques, biens corses, etc.)
  
  return exemptions;
}

/**
 * Calcule l'abattement avec rappel fiscal sur 15 ans
 */
export function computeAbattementWithRappel(
  beneficiaryId: string,
  lien: string,
  isHandicapped: boolean,
  fiscalContext: FiscalContext,
  representationContext?: {
    isRepresenting: boolean;
    representedPersonId: string;
    numberOfRepresentants: number;
  }
): AbattementResult {
  // Abattements de base selon le lien
  const abattementsBase = {
    'conjoint': Infinity, // Exonération totale
    'pacs': Infinity,
    'enfant': 100000,
    'parent': 100000,
    'frere_soeur': 15932,
    'neveu_niece': 7967,
    'petit_enfant': 1594,
    'cousin': 1594,
    'tiers': 1594,
    'autre': 1594
  };
  
  let abattementBase = abattementsBase[lien as keyof typeof abattementsBase] || 1594;
  
  // Gestion de la représentation fiscale pour les enfants
  if (representationContext?.isRepresenting && 
      (lien === 'enfant' || lien === 'petit_enfant')) {
    // L'abattement de l'enfant prédécédé se divise entre ses représentants
    abattementBase = 100000 / representationContext.numberOfRepresentants;
  }
  
  // Abattement handicap (cumulable sauf avec l'abattement de base de 1594€)
  let abattementHandicap = 0;
  if (isHandicapped) {
    abattementHandicap = 159325;
    // Si abattement de base était de 1594€, on ne le cumule pas
    if (abattementBase === 1594) {
      abattementBase = 0;
    }
  }
  
  const abattementTotal = abattementBase + abattementHandicap;
  
  // Rappel fiscal des donations des 15 dernières années
  const deathDate = new Date(fiscalContext.deathDate);
  const date15YearsAgo = new Date(deathDate);
  date15YearsAgo.setFullYear(deathDate.getFullYear() - 15);
  
  const donationsRappelees = fiscalContext.donations.filter(donation => 
    donation.donorId === fiscalContext.decedentId &&
    donation.doneeId === beneficiaryId &&
    new Date(donation.date) >= date15YearsAgo &&
    new Date(donation.date) <= deathDate
  );
  
  const totalRappele = donationsRappelees.reduce((sum, d) => sum + d.valeur, 0);
  const abattementDejaUtilise = Math.min(totalRappele, abattementTotal);
  const abattementResiduel = Math.max(0, abattementTotal - abattementDejaUtilise);
  
  // Gestion représentation pour le rappel fiscal
  if (representationContext?.isRepresenting) {
    // Vérifier aussi les donations faites au représenté
    const donationsToRepresented = fiscalContext.donations.filter(donation =>
      donation.donorId === fiscalContext.decedentId &&
      donation.doneeId === representationContext.representedPersonId &&
      new Date(donation.date) >= date15YearsAgo &&
      new Date(donation.date) <= deathDate
    );
    
    // Ces donations réduisent aussi l'abattement disponible pour les représentants
    const additionalConsumed = donationsToRepresented.reduce((sum, d) => sum + d.valeur, 0);
    const totalConsumed = abattementDejaUtilise + (additionalConsumed / representationContext.numberOfRepresentants);
    
    return {
      abattementTotal,
      abattementUtilise: Math.min(totalConsumed, abattementTotal),
      abattementResiduel: Math.max(0, abattementTotal - totalConsumed),
      rappelFiscal: {
        donationsRappelees: [...donationsRappelees, ...donationsToRepresented].map(d => ({
          donationId: d.id,
          valeur: d.valeur,
          dateToDeathYears: Math.round((deathDate.getTime() - new Date(d.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        })),
        totalRappele: totalRappele + additionalConsumed,
        abattementDejaUtilise: totalConsumed
      }
    };
  }
  
  return {
    abattementTotal,
    abattementUtilise: abattementDejaUtilise,
    abattementResiduel,
    rappelFiscal: {
      donationsRappelees: donationsRappelees.map(d => ({
        donationId: d.id,
        valeur: d.valeur,
        dateToDeathYears: Math.round((deathDate.getTime() - new Date(d.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      })),
      totalRappele,
      abattementDejaUtilise
    }
  };
}

/**
 * Calcule l'impôt progressif avec consommation des tranches
 */
export function computeProgressiveTaxWithBrackets(
  baseTaxableAfterAbattement: number,
  lien: string,
  rappelFiscal: AbattementResult['rappelFiscal'],
  isRepresentationWithPlurality: boolean = false
): ProgressiveTaxResult {
  // Barèmes selon le lien
  const baremeLigneDirecte = [
    { de: 0, a: 8072, taux: 0.05 },
    { de: 8072, a: 12109, taux: 0.10 },
    { de: 12109, a: 15932, taux: 0.15 },
    { de: 15932, a: 552324, taux: 0.20 },
    { de: 552324, a: 902838, taux: 0.30 },
    { de: 902838, a: 1805677, taux: 0.40 },
    { de: 1805677, a: null, taux: 0.45 }
  ];
  
  const baremeFreresSoeurs = [
    { de: 0, a: 24430, taux: 0.35 },
    { de: 24430, a: null, taux: 0.45 }
  ];
  
  const baremeCollateraux4eme = [
    { de: 0, a: null, taux: 0.55 }
  ];
  
  const baremeAutres = [
    { de: 0, a: null, taux: 0.60 }
  ];
  
  // Sélection du barème
  let bareme;
  if (lien === 'enfant' || lien === 'parent' || lien === 'petit_enfant') {
    bareme = baremeLigneDirecte;
  } else if (lien === 'frere_soeur') {
    bareme = baremeFreresSoeurs;
  } else if (lien === 'neveu_niece') {
    // Représentation avec pluralité -> barème frères/sœurs
    // Sinon -> barème collatéraux 4ème degré
    bareme = isRepresentationWithPlurality ? baremeFreresSoeurs : baremeCollateraux4eme;
  } else {
    bareme = baremeAutres;
  }
  
  // Calcul des tranches consommées par le rappel fiscal
  const tranchesConsommees = rappelFiscal.totalRappele;
  
  let droitsTotal = 0;
  let baseRestante = baseTaxableAfterAbattement;
  let consumedRemaining = tranchesConsommees;
  const tranchesDetails = [];
  
  for (const tranche of bareme) {
    const trancheWidth = tranche.a === null ? Infinity : (tranche.a - tranche.de);
    
    // Si cette tranche est entièrement consommée, on la passe
    if (consumedRemaining >= trancheWidth) {
      consumedRemaining -= trancheWidth;
      tranchesDetails.push({
        de: tranche.de,
        a: tranche.a,
        taux: tranche.taux,
        baseImposable: 0,
        droits: 0
      });
      continue;
    }
    
    // Tranche partiellement ou pas consommée
    const effectiveStart = tranche.de + consumedRemaining;
    const effectiveEnd = tranche.a === null ? Infinity : tranche.a;
    const effectiveWidth = effectiveEnd - effectiveStart;
    
    const baseImposableInTranche = Math.min(baseRestante, effectiveWidth);
    const droitsTranche = baseImposableInTranche * tranche.taux;
    
    droitsTotal += droitsTranche;
    baseRestante -= baseImposableInTranche;
    
    tranchesDetails.push({
      de: effectiveStart,
      a: tranche.a,
      taux: tranche.taux,
      baseImposable: baseImposableInTranche,
      droits: droitsTranche
    });
    
    // Plus de consommation après la première tranche touchée
    consumedRemaining = 0;
    
    if (baseRestante <= 0) break;
  }
  
  return {
    baseTaxable: baseTaxableAfterAbattement,
    tranchesConsommees,
    tranches: tranchesDetails,
    droitsTotal: Math.round(droitsTotal)
  };
}

/**
 * Calcule la valeur démembrée selon l'âge
 */
export function computeDemembrement(
  valeurPleineProprietee: number,
  ageUsufruitier: number,
  isTemporary: boolean = false,
  dureeAnnees?: number
): { usufruitValue: number; nueProprieteValue: number } {
  if (isTemporary && dureeAnnees) {
    // Usufruit temporaire : 23% par période de 10 ans
    const periodesde10ans = Math.ceil(dureeAnnees / 10);
    const usufruitPct = Math.min(0.23 * periodesde10ans, 1);
    
    return {
      usufruitValue: valeurPleineProprietee * usufruitPct,
      nueProprieteValue: valeurPleineProprietee * (1 - usufruitPct)
    };
  }
  
  // Usufruit viager selon l'âge (barème CGI 669)
  const baremeViager = [
    { minAge: 0, maxAge: 20, usufruitPct: 0.90 },
    { minAge: 21, maxAge: 30, usufruitPct: 0.80 },
    { minAge: 31, maxAge: 40, usufruitPct: 0.70 },
    { minAge: 41, maxAge: 50, usufruitPct: 0.60 },
    { minAge: 51, maxAge: 60, usufruitPct: 0.50 },
    { minAge: 61, maxAge: 70, usufruitPct: 0.40 },
    { minAge: 71, maxAge: 80, usufruitPct: 0.30 },
    { minAge: 81, maxAge: 90, usufruitPct: 0.20 },
    { minAge: 91, maxAge: 999, usufruitPct: 0.10 }
  ];
  
  const tranche = baremeViager.find(t => ageUsufruitier >= t.minAge && ageUsufruitier <= t.maxAge);
  const usufruitPct = tranche?.usufruitPct || 0.10;
  
  return {
    usufruitValue: valeurPleineProprietee * usufruitPct,
    nueProprieteValue: valeurPleineProprietee * (1 - usufruitPct)
  };
}

/**
 * Calcule les droits d'assurance-vie (990I)
 */
export function computeAssuranceVieTax(
  capitalDeces: number,
  primesAvant70: number,
  primesApres70: number,
  beneficiaryLien: string
): { droits990I: number; baseExoneree: number; baseTaxable: number } {
  // Exonération totale pour conjoint/PACS et certains frères/sœurs
  if (beneficiaryLien === 'conjoint' || beneficiaryLien === 'pacs') {
    return {
      droits990I: 0,
      baseExoneree: capitalDeces,
      baseTaxable: 0
    };
  }
  
  // Primes après 70 ans : taxation si > 30 500€
  let baseTaxableAges = 0;
  if (primesApres70 > 30500) {
    baseTaxableAges = primesApres70 - 30500;
  }
  
  // Prélèvement 990I sur le capital restant
  const capitalRestant = capitalDeces - baseTaxableAges;
  const abattement990I = 152500; // Par bénéficiaire
  
  let baseTaxable990I = 0;
  if (capitalRestant > abattement990I) {
    baseTaxable990I = capitalRestant - abattement990I;
  }
  
  // Barème 990I
  let droits990I = 0;
  if (baseTaxable990I > 0) {
    if (baseTaxable990I <= 700000) { // 852500 - 152500
      droits990I = baseTaxable990I * 0.20;
    } else {
      droits990I = 700000 * 0.20 + (baseTaxable990I - 700000) * 0.3125;
    }
  }
  
  return {
    droits990I: Math.round(droits990I),
    baseExoneree: capitalDeces - baseTaxableAges - baseTaxable990I,
    baseTaxable: baseTaxableAges + baseTaxable990I
  };
}

/**
 * Calcule les réductions de droits
 */
export function computeReductions(
  droitsCalcules: number,
  beneficiaryStatus: {
    isMutileGuerre?: boolean;
    isFromGuyane?: boolean;
  }
): { reductionMutile: number; reductionGuyane: number; droitsApresReduction: number } {
  let reductionMutile = 0;
  let reductionGuyane = 0;
  
  if (beneficiaryStatus.isMutileGuerre) {
    reductionMutile = Math.min(droitsCalcules * 0.5, 305);
  }
  
  if (beneficiaryStatus.isFromGuyane) {
    reductionGuyane = droitsCalcules * 0.5;
  }
  
  const totalReductions = reductionMutile + reductionGuyane;
  const droitsApresReduction = Math.max(0, droitsCalcules - totalReductions);
  
  return {
    reductionMutile: Math.round(reductionMutile),
    reductionGuyane: Math.round(reductionGuyane),
    droitsApresReduction: Math.round(droitsApresReduction)
  };
}