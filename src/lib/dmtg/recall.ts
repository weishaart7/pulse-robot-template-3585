import { Beneficiary, Donation, DmtgParams, Lien, RecallAndAllowancesResult } from './types';

export function computeRecallAndAllowances(input: {
  beneficiary: Beneficiary;
  donations15y: Donation[]; // triées ASC par date
  params: DmtgParams;
}): RecallAndAllowancesResult {
  const { beneficiary, donations15y, params } = input;

  // Déterminer l'abattement de base selon le lien
  let abattementBase = 0;
  if (import.meta.env.DEV) console.log(`Calcul abattement pour ${beneficiary.id} avec lien: ${beneficiary.lien}`);
  
  switch (beneficiary.lien) {
    case 'conjoint':
    case 'pacs':
      abattementBase = Infinity; // Exonération totale
      break;
    case 'enfant':
    case 'ascendant':
      abattementBase = params.abattements.enfant_ascendant;
      break;
    case 'frere_soeur':
      abattementBase = params.abattements.frere_soeur;
      break;
    case 'neveu_niece':
      abattementBase = params.abattements.neveu_niece;
      break;
    default:
      abattementBase = params.abattements.tiers;
  }
  
  if (import.meta.env.DEV) console.log(`Abattement de base: ${abattementBase}€`);

  // Abattement handicap (cumulable sauf avec tiers)
  if (beneficiary.isHandicapped && beneficiary.lien !== 'autre') {
    abattementBase += params.abattements.handicap;
  }

  // Gestion de la représentation fiscale (partage de l'abattement)
  if (beneficiary.representedOf && beneficiary.representationGroup) {
    // Pour la représentation, on partage l'abattement de l'enfant prédécédé
    // même en souche unique (règle spéciale française)
    abattementBase = params.abattements.enfant_ascendant; // Toujours 100k pour représentation
  }

  // Calculer l'abattement consommé par les donations dans les 15 ans
  let abattementConsomme = 0;
  let consumedBracketsAmount = 0;

  // Traiter les donations par ordre chronologique
  for (const donation of donations15y) {
    const valeurDon = donation.valeurDon;
    
    // Donations 790G (familiales) : abattement séparé, ne consomme pas l'abattement général
    if (donation.type === 'familiale_790G') {
      const abattement790G = params.abattements.don_790G;
      const imposable790G = Math.max(0, valeurDon - abattement790G);
      consumedBracketsAmount += imposable790G;
      continue;
    }

    // Appliquer l'abattement général disponible
    const abattementDisponible = Math.max(0, abattementBase - abattementConsomme);
    const abattementUtilise = Math.min(valeurDon, abattementDisponible);
    const imposableDonation = valeurDon - abattementUtilise;

    abattementConsomme += abattementUtilise;
    consumedBracketsAmount += imposableDonation;
  }

  const allowanceGeneralResidual = Math.max(0, abattementBase - abattementConsomme);

  return {
    allowanceGeneralResidual: abattementBase === Infinity ? Infinity : Math.round(allowanceGeneralResidual),
    consumedBracketsAmount: Math.round(consumedBracketsAmount),
    details: {
      abattementBase,
      abattementConsomme: Math.round(abattementConsomme),
      donationsTraitees: donations15y.length
    }
  };
}

export function filterDonations15Years(donations: Donation[], deathDate: string, beneficiaryId: string): Donation[] {
  const deathDateTime = new Date(deathDate);
  const limit15Years = new Date(deathDateTime);
  limit15Years.setFullYear(limit15Years.getFullYear() - 15);

  return donations
    .filter(donation => 
      donation.doneeId === beneficiaryId && 
      new Date(donation.date) > limit15Years
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}