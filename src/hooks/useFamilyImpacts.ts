import { useMemo } from 'react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';

export interface FamilyMemberImpact {
  id: string;
  nom: string;
  prenom: string;
  lienFamilial: string;
  abattementFiscal: number;
  estReservataire: boolean;
  partReserve?: number;
  couleurFiscale: 'direct' | 'indirect' | 'conjoint' | 'autre';
}

export interface FamilyImpacts {
  nombreEnfants: number;
  nombrePetitsEnfants: number;
  reserveHereditaire: number;
  quotiteDisponible: number;
  totalAbattementsDisponibles: number;
  membersImpacts: FamilyMemberImpact[];
  alerts: string[];
  completenessScore: number;
}

// Barème des abattements fiscaux 2024 (France)
const ABATTEMENTS = {
  enfant: 100000,
  petitEnfant: 31865,
  arrierePetitEnfant: 5310,
  conjoint: 80724,
  frere_soeur: 15932,
  neveu_niece: 7967,
  autre: 1594,
  handicap_supplement: 159325,
};

export function useFamilyImpacts(
  familyLinks: FamilyLink[] = [],
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null
): FamilyImpacts {
  return useMemo(() => {
    const impacts: FamilyImpacts = {
      nombreEnfants: 0,
      nombrePetitsEnfants: 0,
      reserveHereditaire: 0,
      quotiteDisponible: 0,
      totalAbattementsDisponibles: 0,
      membersImpacts: [],
      alerts: [],
      completenessScore: 0,
    };

    // Compter les enfants et petits-enfants
    const enfants = familyLinks.filter(l => l.lien_familial === 'Enfant');
    const petitsEnfants = familyLinks.filter(l => l.lien_familial === 'Petit-enfant');
    
    impacts.nombreEnfants = enfants.length;
    impacts.nombrePetitsEnfants = petitsEnfants.length;

    // Calculer la réserve héréditaire
    if (impacts.nombreEnfants === 1) {
      impacts.reserveHereditaire = 0.5;
    } else if (impacts.nombreEnfants === 2) {
      impacts.reserveHereditaire = 0.66;
    } else if (impacts.nombreEnfants >= 3) {
      impacts.reserveHereditaire = 0.75;
    } else if (maritalStatus?.statut_couple && ['Marié(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple)) {
      // Conjoint seul : quotité disponible = 1/4 en PP ou usufruit total
      impacts.reserveHereditaire = 0.25;
    }

    impacts.quotiteDisponible = 1 - impacts.reserveHereditaire;

    // Calculer les impacts par membre
    const membersMap = new Map<string, FamilyMemberImpact>();

    // Ajouter le conjoint si présent
    if (maritalStatus?.statut_couple && ['Marié(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple)) {
      const conjointNom = `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim();
      if (conjointNom) {
        membersMap.set('conjoint', {
          id: 'conjoint',
          nom: maritalStatus.nom_conjoint || '',
          prenom: maritalStatus.prenom_conjoint || '',
          lienFamilial: 'Conjoint',
          abattementFiscal: ABATTEMENTS.conjoint,
          estReservataire: impacts.nombreEnfants === 0,
          couleurFiscale: 'conjoint',
        });
      }
    }

    // Traiter chaque membre de la famille
    familyLinks.forEach(member => {
      let abattement = ABATTEMENTS.autre;
      let couleurFiscale: 'direct' | 'indirect' | 'conjoint' | 'autre' = 'autre';
      let estReservataire = false;

      switch (member.lien_familial) {
        case 'Enfant':
          abattement = ABATTEMENTS.enfant;
          couleurFiscale = 'direct';
          estReservataire = true;
          break;
        case 'Petit-enfant':
          abattement = ABATTEMENTS.petitEnfant;
          couleurFiscale = 'direct';
          break;
        case 'Arrière petit-enfant':
          abattement = ABATTEMENTS.arrierePetitEnfant;
          couleurFiscale = 'direct';
          break;
        case 'Frère/Sœur':
          abattement = ABATTEMENTS.frere_soeur;
          couleurFiscale = 'indirect';
          break;
        case 'Neveu/Nièce':
        case 'Petit neveu/nièce':
          abattement = ABATTEMENTS.neveu_niece;
          couleurFiscale = 'indirect';
          break;
        case 'Parent':
        case 'Grand-parent':
          abattement = ABATTEMENTS.enfant; // Ligne directe ascendante
          couleurFiscale = 'direct';
          break;
        default:
          abattement = ABATTEMENTS.autre;
          couleurFiscale = 'autre';
      }

      // Supplément handicap
      if (member.handicap) {
        abattement += ABATTEMENTS.handicap_supplement;
      }

      membersMap.set(member.id!, {
        id: member.id!,
        nom: member.nom,
        prenom: member.prenom || '',
        lienFamilial: member.lien_familial,
        abattementFiscal: abattement,
        estReservataire,
        partReserve: estReservataire ? impacts.reserveHereditaire / impacts.nombreEnfants : undefined,
        couleurFiscale,
      });
    });

    impacts.membersImpacts = Array.from(membersMap.values());
    impacts.totalAbattementsDisponibles = impacts.membersImpacts.reduce(
      (sum, m) => sum + m.abattementFiscal,
      0
    );

    // Générer des alertes
    if (impacts.nombreEnfants === 0 && !maritalStatus?.statut_couple) {
      impacts.alerts.push('⚠️ Sans héritier réservataire, vous avez une liberté totale de disposition');
    }

    if (impacts.nombreEnfants >= 3) {
      impacts.alerts.push('📊 Avec 3 enfants ou plus, votre quotité disponible est limitée à 25%');
    }

    const enfantsDecedes = enfants.filter(e => e.est_decede);
    if (enfantsDecedes.length > 0) {
      impacts.alerts.push(`👥 ${enfantsDecedes.length} enfant(s) décédé(s) : leurs descendants hériteront par représentation`);
    }

    // Calculer le score de complétude
    let score = 0;
    if (familyProfile?.nom && familyProfile?.prenom) score += 15;
    if (familyProfile?.date_naissance) score += 10;
    if (maritalStatus?.statut_couple) score += 20;
    if (impacts.nombreEnfants > 0) score += 25;
    if (familyLinks.some(l => l.date_naissance)) score += 15;
    if (familyLinks.length >= 3) score += 15;

    impacts.completenessScore = Math.min(100, score);

    return impacts;
  }, [familyLinks, familyProfile, maritalStatus]);
}
