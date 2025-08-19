import { FamilyGraph, PersonId } from './types';

export interface HeritierLegal {
  personId: PersonId;
  nom: string;
  prenom: string;
  lien: string;
  quotePart: number;
  typeQuotePart: 'pleine_propriete' | 'usufruit' | 'nue_propriete';
  ordre: number;
  representation?: boolean;
}

export interface SuccessionLegaleResult {
  heritiers: HeritierLegal[];
  optionConjoint?: {
    quartPP: boolean;
    usufruitTotal: boolean;
    enfantsCommuns: boolean;
  };
  masseBrutePart: number;
  explicationsTexte: string[];
}

/**
 * Calcule la succession légale selon le droit français
 * "À défaut de dispositions prises par l'utilisateur (legs et/ou donation)"
 */
export function calculateSuccessionLegale(
  graph: FamilyGraph,
  hasTestament: boolean = false
): SuccessionLegaleResult {
  if (hasTestament) {
    return {
      heritiers: [],
      masseBrutePart: 0,
      explicationsTexte: ["Des dispositions testamentaires ou libéralités existent. La succession légale ne s'applique pas."]
    };
  }

  const result: SuccessionLegaleResult = {
    heritiers: [],
    masseBrutePart: 1,
    explicationsTexte: []
  };

  // Identifier les membres de la famille vivants
  const personnesVivantes = graph.persons.filter(p => !p.estDecede && p.id !== graph.decedentId);
  
  // Cas 1 : Utilisateur marié/pacsé
  if (graph.hasSurvivingSpouse && graph.survivingSpouseId) {
    return calculateSuccessionAvecConjoint(graph, personnesVivantes, result);
  }
  
  // Cas 2 : Utilisateur non marié
  return calculateSuccessionSansConjoint(graph, personnesVivantes, result);
}

function calculateSuccessionAvecConjoint(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult
): SuccessionLegaleResult {
  const conjoint = personnesVivantes.find(p => p.id === graph.survivingSpouseId);
  if (!conjoint) return result;

  const enfantsVivants = getEnfantsVivants(graph, personnesVivantes);
  const petitsEnfants = getPetitsEnfantsAvecRepresentation(graph, personnesVivantes);
  
  if (enfantsVivants.length > 0 || petitsEnfants.length > 0) {
    // A des enfants (ou petits-enfants par représentation)
    const enfantsCommuns = areAllChildrenCommon(graph, enfantsVivants);
    
    if (enfantsCommuns) {
      // Enfants communs → conjoint choisit 1/4 PP ou 100% usufruit
      result.optionConjoint = {
        quartPP: true,
        usufruitTotal: true,
        enfantsCommuns: true
      };
      
      // Par défaut : 1/4 pleine propriété (l'utilisateur pourra choisir)
      result.heritiers.push({
        personId: conjoint.id,
        nom: conjoint.nom,
        prenom: conjoint.prenom || '',
        lien: 'conjoint',
        quotePart: 0.25,
        typeQuotePart: 'pleine_propriete',
        ordre: 0
      });
      
      // Enfants se partagent 3/4
      const partParEnfant = 0.75 / (enfantsVivants.length + petitsEnfants.length);
      enfantsVivants.forEach(enfant => {
        result.heritiers.push({
          personId: enfant.id,
          nom: enfant.nom,
          prenom: enfant.prenom || '',
          lien: 'enfant',
          quotePart: partParEnfant,
          typeQuotePart: 'pleine_propriete',
          ordre: 1
        });
      });
      
      petitsEnfants.forEach(petitEnfant => {
        result.heritiers.push({
          personId: petitEnfant.id,
          nom: petitEnfant.nom,
          prenom: petitEnfant.prenom || '',
          lien: 'petit_enfant',
          quotePart: partParEnfant,
          typeQuotePart: 'pleine_propriete',
          ordre: 1,
          representation: true
        });
      });
      
      result.explicationsTexte.push(
        `Le conjoint peut choisir entre 1/4 en pleine propriété ou la totalité en usufruit (enfants communs).`,
        `Les ${enfantsVivants.length + petitsEnfants.length} enfant(s) se partagent le solde à parts égales.`
      );
    } else {
      // Enfants non communs → conjoint reçoit 1/4 PP obligatoire
      result.heritiers.push({
        personId: conjoint.id,
        nom: conjoint.nom,
        prenom: conjoint.prenom || '',
        lien: 'conjoint',
        quotePart: 0.25,
        typeQuotePart: 'pleine_propriete',
        ordre: 0
      });
      
      const partParEnfant = 0.75 / (enfantsVivants.length + petitsEnfants.length);
      enfantsVivants.forEach(enfant => {
        result.heritiers.push({
          personId: enfant.id,
          nom: enfant.nom,
          prenom: enfant.prenom || '',
          lien: 'enfant',
          quotePart: partParEnfant,
          typeQuotePart: 'pleine_propriete',
          ordre: 1
        });
      });
      
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/4 en pleine propriété (enfants non communs).`,
        `Les enfants se partagent 3/4 à parts égales.`
      );
    }
  } else {
    // Pas d'enfants
    const parentsVivants = getParentsVivants(graph, personnesVivantes);
    
    if (parentsVivants.length === 2) {
      // Deux parents vivants → conjoint 1/2, chaque parent 1/4
      result.heritiers.push({
        personId: conjoint.id,
        nom: conjoint.nom,
        prenom: conjoint.prenom || '',
        lien: 'conjoint',
        quotePart: 0.5,
        typeQuotePart: 'pleine_propriete',
        ordre: 0
      });
      
      parentsVivants.forEach(parent => {
        result.heritiers.push({
          personId: parent.id,
          nom: parent.nom,
          prenom: parent.prenom || '',
          lien: 'parent',
          quotePart: 0.25,
          typeQuotePart: 'pleine_propriete',
          ordre: 2
        });
      });
      
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/2, chaque parent reçoit 1/4.`
      );
    } else if (parentsVivants.length === 1) {
      // Un parent vivant → conjoint 3/4, parent 1/4
      result.heritiers.push({
        personId: conjoint.id,
        nom: conjoint.nom,
        prenom: conjoint.prenom || '',
        lien: 'conjoint',
        quotePart: 0.75,
        typeQuotePart: 'pleine_propriete',
        ordre: 0
      });
      
      result.heritiers.push({
        personId: parentsVivants[0].id,
        nom: parentsVivants[0].nom,
        prenom: parentsVivants[0].prenom || '',
        lien: 'parent',
        quotePart: 0.25,
        typeQuotePart: 'pleine_propriete',
        ordre: 2
      });
      
      result.explicationsTexte.push(
        `Le conjoint reçoit 3/4, le parent survivant reçoit 1/4.`
      );
    } else {
      // Aucun parent → conjoint reçoit 100%
      result.heritiers.push({
        personId: conjoint.id,
        nom: conjoint.nom,
        prenom: conjoint.prenom || '',
        lien: 'conjoint',
        quotePart: 1.0,
        typeQuotePart: 'pleine_propriete',
        ordre: 0
      });
      
      result.explicationsTexte.push(
        `Le conjoint hérite de la totalité (aucun descendant ni parent survivant).`
      );
    }
  }
  
  return result;
}

function calculateSuccessionSansConjoint(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult
): SuccessionLegaleResult {
  const enfantsVivants = getEnfantsVivants(graph, personnesVivantes);
  const petitsEnfants = getPetitsEnfantsAvecRepresentation(graph, personnesVivantes);
  
  if (enfantsVivants.length > 0 || petitsEnfants.length > 0) {
    // A des enfants → enfants se partagent tout à parts égales
    const totalEnfants = enfantsVivants.length + petitsEnfants.length;
    const partParEnfant = 1.0 / totalEnfants;
    
    enfantsVivants.forEach(enfant => {
      result.heritiers.push({
        personId: enfant.id,
        nom: enfant.nom,
        prenom: enfant.prenom || '',
        lien: 'enfant',
        quotePart: partParEnfant,
        typeQuotePart: 'pleine_propriete',
        ordre: 1
      });
    });
    
    petitsEnfants.forEach(petitEnfant => {
      result.heritiers.push({
        personId: petitEnfant.id,
        nom: petitEnfant.nom,
        prenom: petitEnfant.prenom || '',
        lien: 'petit_enfant',
        quotePart: partParEnfant,
        typeQuotePart: 'pleine_propriete',
        ordre: 1,
        representation: true
      });
    });
    
    result.explicationsTexte.push(
      `Les ${totalEnfants} enfant(s) héritent à parts égales de la totalité.`
    );
  } else {
    // Pas d'enfants → vérifier parents et frères/sœurs
    const parentsVivants = getParentsVivants(graph, personnesVivantes);
    const freresSoeurs = getFreresSoeursVivants(graph, personnesVivantes);
    const neveuxNieces = getNeveuxNiecesAvecRepresentation(graph, personnesVivantes);
    
    if (parentsVivants.length > 0 || freresSoeurs.length > 0 || neveuxNieces.length > 0) {
      // 2ème ordre : parents + frères/sœurs
      if (parentsVivants.length === 2 && (freresSoeurs.length > 0 || neveuxNieces.length > 0)) {
        // Deux parents + frères/sœurs → chaque parent 1/4, frères/sœurs 1/2
        parentsVivants.forEach(parent => {
          result.heritiers.push({
            personId: parent.id,
            nom: parent.nom,
            prenom: parent.prenom || '',
            lien: 'parent',
            quotePart: 0.25,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
        });
        
        const totalCollatéraux = freresSoeurs.length + neveuxNieces.length;
        const partParCollateral = 0.5 / totalCollatéraux;
        
        freresSoeurs.forEach(frere => {
          result.heritiers.push({
            personId: frere.id,
            nom: frere.nom,
            prenom: frere.prenom || '',
            lien: 'frere_soeur',
            quotePart: partParCollateral,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
        });
        
        neveuxNieces.forEach(neveu => {
          result.heritiers.push({
            personId: neveu.id,
            nom: neveu.nom,
            prenom: neveu.prenom || '',
            lien: 'neveu_niece',
            quotePart: partParCollateral,
            typeQuotePart: 'pleine_propriete',
            ordre: 2,
            representation: true
          });
        });
        
        result.explicationsTexte.push(
          `Chaque parent reçoit 1/4, les frères/sœurs se partagent 1/2.`
        );
      } else if (parentsVivants.length === 2 && freresSoeurs.length === 0 && neveuxNieces.length === 0) {
        // Deux parents seuls → chacun 1/2
        parentsVivants.forEach(parent => {
          result.heritiers.push({
            personId: parent.id,
            nom: parent.nom,
            prenom: parent.prenom || '',
            lien: 'parent',
            quotePart: 0.5,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
        });
        
        result.explicationsTexte.push(`Chaque parent reçoit 1/2.`);
      } else if (parentsVivants.length === 1) {
        // Un seul parent → 100% à lui si pas de frères/sœurs, sinon partage
        if (freresSoeurs.length === 0 && neveuxNieces.length === 0) {
          result.heritiers.push({
            personId: parentsVivants[0].id,
            nom: parentsVivants[0].nom,
            prenom: parentsVivants[0].prenom || '',
            lien: 'parent',
            quotePart: 1.0,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
          
          result.explicationsTexte.push(`Le parent survivant hérite de la totalité.`);
        } else {
          // Un parent + frères/sœurs → parent 1/4, frères/sœurs 3/4
          result.heritiers.push({
            personId: parentsVivants[0].id,
            nom: parentsVivants[0].nom,
            prenom: parentsVivants[0].prenom || '',
            lien: 'parent',
            quotePart: 0.25,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
          
          const totalCollatéraux = freresSoeurs.length + neveuxNieces.length;
          const partParCollateral = 0.75 / totalCollatéraux;
          
          freresSoeurs.forEach(frere => {
            result.heritiers.push({
              personId: frere.id,
              nom: frere.nom,
              prenom: frere.prenom || '',
              lien: 'frere_soeur',
              quotePart: partParCollateral,
              typeQuotePart: 'pleine_propriete',
              ordre: 2
            });
          });
          
          result.explicationsTexte.push(
            `Le parent reçoit 1/4, les frères/sœurs se partagent 3/4.`
          );
        }
      } else {
        // Frères/sœurs seuls héritent à parts égales
        const totalCollatéraux = freresSoeurs.length + neveuxNieces.length;
        const partParCollateral = 1.0 / totalCollatéraux;
        
        freresSoeurs.forEach(frere => {
          result.heritiers.push({
            personId: frere.id,
            nom: frere.nom,
            prenom: frere.prenom || '',
            lien: 'frere_soeur',
            quotePart: partParCollateral,
            typeQuotePart: 'pleine_propriete',
            ordre: 2
          });
        });
        
        neveuxNieces.forEach(neveu => {
          result.heritiers.push({
            personId: neveu.id,
            nom: neveu.nom,
            prenom: neveu.prenom || '',
            lien: 'neveu_niece',
            quotePart: partParCollateral,
            typeQuotePart: 'pleine_propriete',
            ordre: 2,
            representation: true
          });
        });
        
        result.explicationsTexte.push(
          `Les frères/sœurs héritent à parts égales de la totalité.`
        );
      }
    } else {
      // Appliquer fente successorale (grands-parents, oncles/tantes, cousins)
      const ascendantsOrdinaires = getAscendantsOrdinaires(graph, personnesVivantes);
      const onclesTantes = getOnclesTantes(graph, personnesVivantes);
      const cousins = getCousins(graph, personnesVivantes);
      
      if (ascendantsOrdinaires.length > 0) {
        // Grands-parents héritent avec fente
        applyFenteSuccessorale(result, ascendantsOrdinaires, 'grand_parent');
      } else if (onclesTantes.length > 0) {
        // Oncles/tantes héritent avec fente
        applyFenteSuccessorale(result, onclesTantes, 'oncle_tante');
      } else if (cousins.length > 0) {
        // Cousins héritent avec fente
        applyFenteSuccessorale(result, cousins, 'cousin');
      } else {
        // Aucun héritier → État français
        result.explicationsTexte.push(
          `Aucun héritier jusqu'au 6ème degré. L'État français hérite.`
        );
      }
    }
  }
  
  return result;
}

// Fonctions utilitaires
function getEnfantsVivants(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p => 
    graph.links.some(link => 
      link.from === graph.decedentId && 
      link.to === p.id && 
      link.relation === 'child'
    )
  );
}

function getPetitsEnfantsAvecRepresentation(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  // Récupérer les petits-enfants dont les parents sont prédécédés
  const enfantsDecedes = graph.persons.filter(p => 
    p.estDecede && 
    graph.links.some(link => 
      link.from === graph.decedentId && 
      link.to === p.id && 
      link.relation === 'child'
    )
  );
  
  const petitsEnfants: any[] = [];
  enfantsDecedes.forEach(enfantDecede => {
    const descendants = personnesVivantes.filter(p =>
      graph.links.some(link =>
        link.from === enfantDecede.id &&
        link.to === p.id &&
        link.relation === 'child'
      )
    );
    petitsEnfants.push(...descendants);
  });
  
  return petitsEnfants;
}

function areAllChildrenCommon(graph: FamilyGraph, enfants: any[]): boolean {
  if (!graph.hasSurvivingSpouse) return false;
  
  // Vérifier si tous les enfants sont communs avec le conjoint survivant
  return enfants.every(enfant =>
    graph.childrenCommonWithSpouse.includes(enfant.id)
  );
}

function getParentsVivants(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'parent'
  );
}

function getFreresSoeursVivants(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'frère' || p.lienFamilial === 'soeur'
  );
}

function getNeveuxNiecesAvecRepresentation(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'neveu' || p.lienFamilial === 'nièce'
  );
}

function getAscendantsOrdinaires(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'grand_parent' || p.lienFamilial === 'arriere_grand_parent'
  );
}

function getOnclesTantes(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'oncle' || p.lienFamilial === 'tante'
  );
}

function getCousins(graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p =>
    p.lienFamilial === 'cousin' || p.lienFamilial === 'cousine'
  );
}

function applyFenteSuccessorale(
  result: SuccessionLegaleResult, 
  heritiers: any[], 
  type: string
): void {
  // Simplification : répartition égale entre branches paternelle et maternelle
  // Dans une implémentation complète, il faudrait identifier la branche de chaque héritier
  
  const branchePaternelle = heritiers.filter((_, index) => index % 2 === 0);
  const brancheMaternelle = heritiers.filter((_, index) => index % 2 === 1);
  
  if (branchePaternelle.length === 0) {
    // Branche paternelle vide → branche maternelle prend tout
    brancheMaternelle.forEach(heritier => {
      result.heritiers.push({
        personId: heritier.id,
        nom: heritier.nom,
        prenom: heritier.prenom || '',
        lien: type,
        quotePart: 1.0 / brancheMaternelle.length,
        typeQuotePart: 'pleine_propriete',
        ordre: type === 'grand_parent' ? 3 : 4
      });
    });
  } else if (brancheMaternelle.length === 0) {
    // Branche maternelle vide → branche paternelle prend tout
    branchePaternelle.forEach(heritier => {
      result.heritiers.push({
        personId: heritier.id,
        nom: heritier.nom,
        prenom: heritier.prenom || '',
        lien: type,
        quotePart: 1.0 / branchePaternelle.length,
        typeQuotePart: 'pleine_propriete',
        ordre: type === 'grand_parent' ? 3 : 4
      });
    });
  } else {
    // Fente 50/50
    branchePaternelle.forEach(heritier => {
      result.heritiers.push({
        personId: heritier.id,
        nom: heritier.nom,
        prenom: heritier.prenom || '',
        lien: type,
        quotePart: 0.5 / branchePaternelle.length,
        typeQuotePart: 'pleine_propriete',
        ordre: type === 'grand_parent' ? 3 : 4
      });
    });
    
    brancheMaternelle.forEach(heritier => {
      result.heritiers.push({
        personId: heritier.id,
        nom: heritier.nom,
        prenom: heritier.prenom || '',
        lien: type,
        quotePart: 0.5 / brancheMaternelle.length,
        typeQuotePart: 'pleine_propriete',
        ordre: type === 'grand_parent' ? 3 : 4
      });
    });
  }
  
  result.explicationsTexte.push(
    `Fente successorale appliquée : répartition entre branche paternelle et maternelle.`
  );
}