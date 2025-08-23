import { FamilyLink, MaritalStatus, FamilyProfile } from '@/services/familyService';
import { Asset } from '@/services/assetService';
import { FamilyGraph, Person, PatrimonySnapshot } from '@/lib/transmission/types';
import { FamilySituationSummary, PatrimoineSummary } from '@/types/transmission';

/**
 * Converts family data from the database to the transmission library format
 */
export function buildFamilyGraph(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyLinks: FamilyLink[]
): FamilyGraph {
  const persons: Person[] = [];
  const decedentId = 'user'; // The user is always the potential decedent
  
  // Add the user as the main person
  if (familyProfile) {
    persons.push({
      id: decedentId,
      nom: familyProfile.nom || 'Utilisateur',
      prenom: familyProfile.prenom || '',
      dateNaissance: familyProfile.date_naissance,
      estDecede: false,
      handicap: familyProfile.personne_handicapee || false,
      lienFamilial: 'decedent'
    });
  }

  // Add spouse if exists
  let hasSurvivingSpouse = false;
  let survivingSpouseId: string | undefined;
  
  if (maritalStatus && maritalStatus.statut_couple && 
      ['Marié(e)', 'Pacsé(e)', 'MARIE', 'PACS', 'PACSE'].includes(maritalStatus.statut_couple)) {
    const spouseId = 'spouse';
    persons.push({
      id: spouseId,
      nom: maritalStatus.nom_conjoint || 'Conjoint',
      prenom: maritalStatus.prenom_conjoint || '',
      dateNaissance: maritalStatus.date_naissance_conjoint,
      estDecede: false,
      lienFamilial: 'conjoint'
    });
    hasSurvivingSpouse = true;
    survivingSpouseId = spouseId;
  }

  // Add family links
  const childrenOfDecedent: string[] = [];
  const childrenCommonWithSpouse: string[] = [];
  
  familyLinks.forEach(link => {
    persons.push({
      id: link.id || `family-${Date.now()}`,
      nom: link.nom,
      prenom: link.prenom || '',
      dateNaissance: link.date_naissance,
      estDecede: link.est_decede || false,
      dateDeces: link.date_deces,
      handicap: link.handicap || false,
      lienFamilial: link.lien_familial
    });

    // Identify children
    if (link.lien_familial === 'Enfant' && !link.est_decede) {
      const childId = link.id || `family-${Date.now()}`;
      childrenOfDecedent.push(childId);
      
      // If spouse exists and no specific branch mentioned, assume common child
      if (hasSurvivingSpouse && !link.branche_familiale) {
        childrenCommonWithSpouse.push(childId);
      }
    }
  });

  return {
    persons,
    links: [], // TODO: Build relationship links if needed
    marriages: [], // TODO: Build marriage data if needed
    decedentId,
    hasSurvivingSpouse,
    survivingSpouseId,
    childrenOfDecedent,
    childrenCommonWithSpouse
  };
}

/**
 * Converts asset data to patrimony snapshot for transmission calculations
 */
export function buildPatrimonySnapshot(assets: Asset[]): PatrimonySnapshot {
  const totalAssets = assets.reduce((sum, asset) => {
    return sum + (asset.valeur_estimee || asset.valeur_acquisition || 0);
  }, 0);

  // TODO: Calculate passifs from asset charges
  const passifs = 0;

  return {
    date: new Date().toISOString().split('T')[0],
    biensExistants: totalAssets,
    passifs,
    assuranceVieTotal: 0 // TODO: Extract life insurance from assets
  };
}

/**
 * Creates a summary of the family situation for display
 */
export function createFamilySummary(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyLinks: FamilyLink[]
): FamilySituationSummary {
  return {
    decedent: {
      nom: familyProfile?.nom || 'Non renseigné',
      prenom: familyProfile?.prenom || 'Non renseigné',
      regimeMatrimonial: maritalStatus?.contrat_mariage
    },
    conjoint: maritalStatus && maritalStatus.statut_couple && 
      ['Marié(e)', 'Pacsé(e)', 'MARIE', 'PACS', 'PACSE'].includes(maritalStatus.statut_couple) ? {
      nom: maritalStatus.nom_conjoint || 'Non renseigné',
      prenom: maritalStatus.prenom_conjoint || 'Non renseigné',
      vivant: true
    } : undefined,
    enfants: familyLinks
      .filter(link => link.lien_familial === 'Enfant')
      .map(child => ({
        id: child.id || '',
        nom: child.nom,
        prenom: child.prenom || '',
        vivant: !child.est_decede,
        branche: child.branche_familiale === 'Précédent lit' ? 'precedente' : 'commune'
      })),
    autres: familyLinks
      .filter(link => link.lien_familial !== 'Enfant')
      .map(person => ({
        id: person.id || '',
        nom: person.nom,
        lien: person.lien_familial,
        vivant: !person.est_decede
      }))
  };
}

/**
 * Creates a summary of the patrimony for display
 */
export function createPatrimoinySummary(assets: Asset[]): PatrimoineSummary {
  const summary = {
    total: 0,
    immobilier: 0,
    financier: 0,
    professionnel: 0,
    autres: 0
  };

  assets.forEach(asset => {
    const value = asset.valeur_estimee || asset.valeur_acquisition || 0;
    summary.total += value;

    // Categorize based on asset nature
    const nature = asset.nature?.toLowerCase() || '';
    if (nature.includes('immobilier') || nature.includes('résidence') || nature.includes('terrain')) {
      summary.immobilier += value;
    } else if (nature.includes('compte') || nature.includes('placement') || nature.includes('action')) {
      summary.financier += value;
    } else if (nature.includes('fonds') || nature.includes('entreprise') || nature.includes('profession')) {
      summary.professionnel += value;
    } else {
      summary.autres += value;
    }
  });

  const passifs = 0; // TODO: Calculate from asset charges
  
  return {
    actifs: summary,
    passifs,
    actifNet: summary.total - passifs,
    assuranceVie: 0 // TODO: Extract from specific asset types
  };
}