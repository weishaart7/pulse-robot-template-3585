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
      // Exonération totale (art. 796-0 ter CGI) : déclaratif (cf.
      // exoneration_succession sur family_links, aucune des 3 conditions
      // légales vérifiée par l'app) — même mécanique que conjoint/pacs
      // ci-dessus.
      abattementBase = beneficiary.exonerationSuccession ? Infinity : params.abattements.frere_soeur;
      break;
    case 'neveu_niece':
      abattementBase = params.abattements.neveu_niece;
      break;
    default:
      abattementBase = params.abattements.tiers;
  }
  
  if (import.meta.env.DEV) console.log(`Abattement de base: ${abattementBase}€`);

  // Adoption simple (art. 786 CGI) : abattement réduit à celui des tiers
  // (1 594€) sauf exception légale déclarée explicitement par le conseiller
  // (enfant du conjoint adopté simple, ou soins et secours ininterrompus
  // d'au moins 5 ans durant la minorité). Ne s'applique qu'à l'enfant
  // lui-même (lien === 'enfant'), pas à un représentant venant à sa place.
  if (beneficiary.lien === 'enfant' && beneficiary.isAdoptionSimple && !beneficiary.adoptionSimpleAbattementPlein) {
    abattementBase = params.abattements.tiers;
  }

  // Gestion de la représentation fiscale (partage de l'abattement, art. 779
  // CGI) : le représentant reprend l'abattement de la personne représentée
  // (enfant prédécédé/renonçant → 100 000€, frère/sœur prédécédé pour un
  // neveu/nièce → 15 932€), divisé à parts égales entre tous les
  // représentants de la même souche. Doit s'appliquer avant l'abattement
  // handicap ci-dessous pour que celui-ci reste cumulable (il était
  // auparavant écrasé par cette étape).
  if (beneficiary.representedOf) {
    const abattementRepresente = beneficiary.lien === 'neveu_niece'
      ? params.abattements.frere_soeur
      : params.abattements.enfant_ascendant;
    const nbRepresentants = beneficiary.numberOfRepresentants && beneficiary.numberOfRepresentants > 0
      ? beneficiary.numberOfRepresentants
      : 1;
    abattementBase = abattementRepresente / nbRepresentants;
  }

  // Abattement handicap (cumulable sauf avec tiers)
  if (beneficiary.isHandicapped && beneficiary.lien !== 'autre') {
    abattementBase += params.abattements.handicap;
  }

  // Calculer l'abattement consommé par les donations dans les 15 ans
  let abattementConsomme = 0;
  let consumedBracketsAmount = 0;

  // Exonération 790 G déjà consommée : plafond unique de 31 865€ par couple
  // donateur/donataire sur la fenêtre de 15 ans (donations15y déjà filtrées
  // sur ce donataire et cette fenêtre), consommé dans l'ordre chronologique.
  let exo790GConsommee = 0;

  // Traiter les donations par ordre chronologique
  for (const donation of donations15y) {
    const valeurDon = donation.valeurDon;
    
    // Donations 790G (familiales) : exonération dédiée de 31 865€, cumulable
    // avec l'abattement général mais pas superposable — seule la fraction du
    // don qui EXCÈDE cette exonération est un don ordinaire, qui consomme
    // l'abattement général exactement comme n'importe quelle autre donation
    // (art. 790 G + art. 779 CGI : l'exonération ne dispense pas l'excédent
    // du régime de droit commun).
    let valeurSoumiseAbattementGeneral = valeurDon;
    if (donation.type === 'familiale_790G') {
      const exo790GDisponible = Math.max(0, params.abattements.don_790G - exo790GConsommee);
      const exo790GUtilisee = Math.min(valeurDon, exo790GDisponible);
      exo790GConsommee += exo790GUtilisee;
      valeurSoumiseAbattementGeneral = valeurDon - exo790GUtilisee;
    }

    // Appliquer l'abattement général disponible
    const abattementDisponible = Math.max(0, abattementBase - abattementConsomme);
    const abattementUtilise = Math.min(valeurSoumiseAbattementGeneral, abattementDisponible);
    const imposableDonation = valeurSoumiseAbattementGeneral - abattementUtilise;

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