import { FamilyGraph, PersonId, HeirShare } from './types';

interface DevolutionShares {
  [personId: string]: {
    personId: PersonId;
    nom: string;
    lien: string;
    part: number;
    ordre: number;
    degre: number;
  };
}

/**
 * Calcule le degré de parenté entre deux personnes
 */
function calculateDegree(graph: FamilyGraph, from: PersonId, to: PersonId): number {
  if (from === to) return 0;
  
  const visited = new Set<PersonId>();
  const queue: { id: PersonId; distance: number }[] = [{ id: from, distance: 0 }];
  
  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    
    if (visited.has(id)) continue;
    visited.add(id);
    
    if (id === to) return distance;
    
    // Trouver tous les liens directs
    const directLinks = graph.links.filter(link => 
      link.from === id || link.to === id
    );
    
    for (const link of directLinks) {
      const nextId = link.from === id ? link.to : link.from;
      if (!visited.has(nextId)) {
        queue.push({ id: nextId, distance: distance + 1 });
      }
    }
  }
  
  return Infinity; // Pas de lien trouvé
}

/**
 * Détermine l'ordre successoral d'une personne par rapport au défunt
 * Selon l'article 734 et suivants du Code civil français
 */
function getSuccessionOrder(graph: FamilyGraph, personId: PersonId): number {
  const decedentId = graph.decedentId;
  
  // Conjoint survivant - traité séparément selon articles 756 et suivants
  if (personId === graph.survivingSpouseId) {
    return 0; // Ordre spécial pour le conjoint
  }
  
  // 1er ordre : descendants (art. 734 et 744)
  if (isDescendant(graph, personId, decedentId)) {
    return 1;
  }
  
  // 2e ordre : ascendants privilégiés (père/mère) + collatéraux privilégiés (frères/sœurs et leurs descendants)
  // Articles 736, 737, 738
  if (isParent(graph, personId, decedentId) || isSibling(graph, personId, decedentId) || 
      isDescendantOfSibling(graph, personId, decedentId)) {
    return 2;
  }
  
  // 3e ordre : ascendants ordinaires (grands-parents et plus) - Article 739
  if (isAscendant(graph, personId, decedentId) && !isParent(graph, personId, decedentId)) {
    return 3;
  }
  
  // 4e ordre : collatéraux ordinaires (oncles/tantes, cousins) jusqu'au 6ème degré - Article 741
  if (isCollateral(graph, personId, decedentId)) {
    const degree = calculateDegree(graph, personId, decedentId);
    if (degree <= 6) {
      return 4;
    }
  }
  
  return 5; // Hors succession - au-delà du 6e degré, l'État hérite
}

function isDescendant(graph: FamilyGraph, personId: PersonId, ancestorId: PersonId): boolean {
  const childrenLinks = graph.links.filter(link => 
    link.from === ancestorId && link.relation === "child"
  );
  
  for (const link of childrenLinks) {
    if (link.to === personId) return true;
    if (isDescendant(graph, personId, link.to)) return true;
  }
  
  return false;
}

function isParent(graph: FamilyGraph, personId: PersonId, childId: PersonId): boolean {
  return graph.links.some(link => 
    link.from === childId && link.to === personId && link.relation === "parent"
  );
}

function isSibling(graph: FamilyGraph, personId: PersonId, siblingId: PersonId): boolean {
  return graph.links.some(link => 
    link.from === siblingId && link.to === personId && link.relation === "sibling"
  );
}

function isDescendantOfSibling(graph: FamilyGraph, personId: PersonId, decedentId: PersonId): boolean {
  const siblings = graph.links
    .filter(link => link.from === decedentId && link.relation === "sibling")
    .map(link => link.to);
  
  return siblings.some(siblingId => isDescendant(graph, personId, siblingId));
}

function isAscendant(graph: FamilyGraph, personId: PersonId, descendantId: PersonId): boolean {
  return isDescendant(graph, descendantId, personId);
}

function isCollateral(graph: FamilyGraph, personId: PersonId, decedentId: PersonId): boolean {
  // Collatéral = même ascendant commun mais pas descendant direct
  const degree = calculateDegree(graph, personId, decedentId);
  return degree >= 3 && degree <= 6 && !isDescendant(graph, personId, decedentId) && 
         !isAscendant(graph, personId, decedentId);
}

function getLien(graph: FamilyGraph, personId: PersonId): string {
  const decedentId = graph.decedentId;
  
  if (personId === graph.survivingSpouseId) return "conjoint";
  if (isDescendant(graph, personId, decedentId)) return "enfant";
  if (isParent(graph, personId, decedentId)) return "parent";
  if (isSibling(graph, personId, decedentId)) return "frere_soeur";
  if (isDescendantOfSibling(graph, personId, decedentId)) return "neveu_niece";
  
  const degree = calculateDegree(graph, personId, decedentId);
  if (degree >= 5 && degree <= 6) return "cousin";
  if (isAscendant(graph, personId, decedentId)) return "parent"; // grands-parents
  
  return "autre";
}

/**
 * Applique la représentation pour les descendants et collatéraux privilégiés
 */
function applyRepresentation(graph: FamilyGraph, shares: DevolutionShares): DevolutionShares {
  const result = { ...shares };
  
  // 1. Représentation dans l'ordre des descendants (1er ordre)
  const descendants = Object.values(shares).filter(heir => heir.ordre === 1);
  
  // Identifier tous les enfants directs du défunt (vivants et décédés)
  const allDirectChildren = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === "child")
    .map(link => link.to);
  
  // Pour chaque enfant direct du défunt
  for (const childId of allDirectChildren) {
    const child = graph.persons.find(p => p.id === childId);
    const childShare = shares[childId];
    
    // Si l'enfant est prédécédé
    if (child?.estDecede) {
      // Trouver ses descendants qui héritent
      const childDescendants = descendants.filter(heir => 
        isDescendant(graph, heir.personId, childId)
      );
      
      if (childDescendants.length > 0) {
        // Calculer la part qu'aurait eue l'enfant prédécédé
        const childWouldHavePart = 1 / allDirectChildren.length;
        
        // Redistribuer par parts égales entre ses descendants (représentation par tête)
        const partPerDescendant = childWouldHavePart / childDescendants.length;
        
        childDescendants.forEach(desc => {
          if (!result[desc.personId]) {
            result[desc.personId] = { ...desc, part: 0 };
          }
          result[desc.personId].part += partPerDescendant;
        });
        
        // Supprimer l'enfant prédécédé s'il était dans les parts
        if (childShare) {
          delete result[childId];
        }
      }
    }
  }
  
  // 2. Représentation dans l'ordre des collatéraux privilégiés (2ème ordre - frères/sœurs)
  const collateralsPrivileges = Object.values(shares).filter(heir => 
    heir.ordre === 2 && (heir.lien === "frere_soeur" || heir.lien === "neveu_niece")
  );
  
  if (collateralsPrivileges.length > 0) {
    // Identifier tous les frères et sœurs du défunt (vivants et décédés)
    const allSiblings = graph.links
      .filter(link => link.from === graph.decedentId && link.relation === "sibling")
      .map(link => link.to);
    
    for (const siblingId of allSiblings) {
      const sibling = graph.persons.find(p => p.id === siblingId);
      const siblingShare = shares[siblingId];
      
      // Si le frère/sœur est prédécédé
      if (sibling?.estDecede) {
        // Trouver ses descendants qui héritent
        const siblingDescendants = collateralsPrivileges.filter(heir =>
          heir.lien === "neveu_niece" && isDescendant(graph, heir.personId, siblingId)
        );
        
        if (siblingDescendants.length > 0) {
          // La part du frère/sœur prédécédé est redistribuée à ses enfants
          const siblingWouldHavePart = siblingShare?.part || (1 / allSiblings.length);
          const partPerDescendant = siblingWouldHavePart / siblingDescendants.length;
          
          siblingDescendants.forEach(desc => {
            if (!result[desc.personId]) {
              result[desc.personId] = { ...desc, part: 0 };
            }
            result[desc.personId].part += partPerDescendant;
          });
          
          // Supprimer le frère/sœur prédécédé
          if (siblingShare) {
            delete result[siblingId];
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Applique la fente successorale (répartition entre branches paternelle et maternelle)
 */
function applyFente(graph: FamilyGraph, shares: DevolutionShares): DevolutionShares {
  const heirs = Object.values(shares);
  
  // La fente ne s'applique que dans certains cas :
  // 1. Ordre des ascendants ordinaires (3ème ordre)
  // 2. Ordre des collatéraux ordinaires (4ème ordre)  
  // 3. Concurrence entre ascendant privilégié d'une branche et ascendants ordinaires de l'autre
  
  const ordre3Heirs = heirs.filter(h => h.ordre === 3);
  const ordre4Heirs = heirs.filter(h => h.ordre === 4);
  
  if (ordre3Heirs.length > 0 || ordre4Heirs.length > 0) {
    // TODO: Implémenter la logique de fente
    // Cela nécessiterait d'identifier la branche paternelle vs maternelle de chaque héritier
    // Pour l'instant, on conserve la répartition actuelle
  }
  
  return shares;
}

/**
 * Calcule les parts civiles brutes selon les règles de dévolution
 */
export function computeHeirsShares(graph: FamilyGraph): DevolutionShares {
  const shares: DevolutionShares = {};
  
  // Identifier tous les héritiers potentiels (personnes vivantes)
  const potentialHeirs = graph.persons.filter(p => !p.estDecede && p.id !== graph.decedentId);
  
  // Calculer ordre et degré pour chaque héritier potentiel
  const heirsWithOrder = potentialHeirs.map(person => ({
    personId: person.id,
    nom: `${person.prenom} ${person.nom}`,
    lien: getLien(graph, person.id),
    ordre: getSuccessionOrder(graph, person.id),
    degre: calculateDegree(graph, person.id, graph.decedentId)
  }));
  
  // Étape 2 : Vérifier conjoint survivant selon articles 756-757-2
  if (graph.hasSurvivingSpouse && graph.survivingSpouseId) {
    const conjoint = heirsWithOrder.find(h => h.personId === graph.survivingSpouseId);
    if (conjoint) {
      const descendantsVivants = graph.childrenOfDecedent.filter(childId => 
        !graph.persons.find(p => p.id === childId)?.estDecede
      );
      
      let conjointPart = 0;
      
      if (descendantsVivants.length > 0) {
        // En présence de descendants
        const enfantsCommuns = graph.childrenCommonWithSpouse.filter(childId => 
          descendantsVivants.includes(childId)
        );
        
        if (enfantsCommuns.length === descendantsVivants.length) {
          // Tous enfants communs - option art. 757 : 1/4 PP OU usufruit total
          // Par défaut 1/4 PP (MAX(1/4 PP, usufruit total) dans l'implémentation complète)
          conjointPart = 0.25;
        } else {
          // Au moins un enfant non commun - 1/4 PP obligatoire (art. 757-1)
          conjointPart = 0.25;
        }
      } else {
        // Pas de descendants - vérifier ascendants privilégiés
        const ascendantsPrivileges = heirsWithOrder.filter(h => 
          h.ordre === 2 && h.lien === "parent"
        );
        
        if (ascendantsPrivileges.length === 2) {
          // Père et mère vivants - art. 757-2 : conjoint = 1/2
          conjointPart = 0.5;
        } else if (ascendantsPrivileges.length === 1) {
          // Un seul parent vivant - art. 757-2 : conjoint = 3/4
          conjointPart = 0.75;
        } else {
          // Ni descendants ni ascendants privilégiés - art. 757-3
          // Conjoint hérite de tout SAUF 1/2 des biens reçus des ascendants
          // → aux frères/sœurs ou leurs descendants
          conjointPart = 1.0; // Simplification - droit de retour à implémenter
        }
      }
      
      shares[conjoint.personId] = {
        personId: conjoint.personId,
        nom: conjoint.nom,
        lien: conjoint.lien,
        part: conjointPart,
        ordre: conjoint.ordre,
        degre: conjoint.degre
      };
    }
  }
  
  // Déterminer l'ordre le plus proche (excluant le conjoint)
  const ordersPresent = heirsWithOrder
    .filter(h => h.ordre > 0 && h.personId !== graph.survivingSpouseId)
    .map(h => h.ordre);
  const closestOrder = Math.min(...ordersPresent);
  
  if (closestOrder === Infinity) {
    // Pas d'héritiers - conjoint prend tout ou État
    return shares;
  }
  
  // Héritiers du plus proche ordre
  const closestOrderHeirs = heirsWithOrder.filter(h => h.ordre === closestOrder);
  
  // Calculer la part restante après conjoint
  const remainingShare = graph.hasSurvivingSpouse ? 
    (1 - (shares[graph.survivingSpouseId!]?.part || 0)) : 1;
  
  // Étape 3 : Déterminer ordre successoral
  if (closestOrder === 1) {
    // 1er ordre : descendants (art. 734, 744)
    // Principe : parts égales entre enfants vivants, représentation pour les prédécédés
    const allDirectChildren = graph.links
      .filter(link => link.from === graph.decedentId && link.relation === "child")
      .map(link => link.to);
    
    const livingDirectChildren = allDirectChildren.filter(childId => 
      !graph.persons.find(p => p.id === childId)?.estDecede
    );
    
    // Calcul des souches représentées (enfants vivants + souches d'enfants prédécédés avec descendants)
    const nbSouches = allDirectChildren.length; // Simplification
    const partPerSouche = remainingShare / nbSouches;
    
    livingDirectChildren.forEach(childId => {
      const child = heirsWithOrder.find(h => h.personId === childId);
      if (child) {
        shares[child.personId] = {
          personId: child.personId,
          nom: child.nom,
          lien: child.lien,
          part: partPerSouche,
          ordre: child.ordre,
          degre: child.degre
        };
      }
    });
  } else if (closestOrder === 2) {
    // 2e ordre : ascendants privilégiés + collatéraux privilégiés (art. 736-737-738)
    const parents = closestOrderHeirs.filter(h => h.lien === "parent");
    const siblings = closestOrderHeirs.filter(h => h.lien === "frere_soeur" || h.lien === "neveu_niece");
    
    // Règles de partage selon art. 736-738
    if (parents.length === 2 && siblings.length > 0) {
      // Père = 1/4, Mère = 1/4, Frères/sœurs = 1/2 (art. 736)
      parents.forEach(parent => {
        shares[parent.personId] = {
          ...parent,
          part: remainingShare * 0.25
        };
      });
      
      const partPerSibling = (remainingShare * 0.5) / siblings.length;
      siblings.forEach(sibling => {
        shares[sibling.personId] = {
          ...sibling,
          part: partPerSibling
        };
      });
    } else if (parents.length === 1 && siblings.length > 0) {
      // Un parent = 1/4, Frères/sœurs = 3/4 (art. 737)
      shares[parents[0].personId] = {
        ...parents[0],
        part: remainingShare * 0.25
      };
      
      const partPerSibling = (remainingShare * 0.75) / siblings.length;
      siblings.forEach(sibling => {
        shares[sibling.personId] = {
          ...sibling,
          part: partPerSibling
        };
      });
    } else if (parents.length === 2 && siblings.length === 0) {
      // Seulement père et mère = 1/2 chacun (art. 738)
      parents.forEach(parent => {
        shares[parent.personId] = {
          ...parent,
          part: remainingShare * 0.5
        };
      });
    } else if (parents.length === 1 && siblings.length === 0) {
      // Un seul parent sans frères/sœurs
      // Vérifie s'il y a des ascendants dans l'autre branche
      // Sinon le parent prend tout (art. 738)
      shares[parents[0].personId] = {
        ...parents[0],
        part: remainingShare
      };
    } else if (parents.length === 0 && siblings.length > 0) {
      // Seulement frères/sœurs (parents décédés)
      const partPerSibling = remainingShare / siblings.length;
      siblings.forEach(sibling => {
        shares[sibling.personId] = {
          ...sibling,
          part: partPerSibling
        };
      });
    }
  } else if (closestOrder === 3) {
    // 3e ordre : ascendants ordinaires (art. 739)
    // Application de la fente successorale
    const maternalAscendants = closestOrderHeirs.filter(h => 
      // TODO: identifier branche maternelle
      true // Simplification
    );
    const paternalAscendants = closestOrderHeirs.filter(h => 
      // TODO: identifier branche paternelle  
      true // Simplification
    );
    
    // Pour l'instant, répartition égale
    const partPerHeir = remainingShare / closestOrderHeirs.length;
    closestOrderHeirs.forEach(heir => {
      shares[heir.personId] = {
        ...heir,
        part: partPerHeir
      };
    });
  } else if (closestOrder === 4) {
    // 4e ordre : collatéraux ordinaires (art. 741)
    // Application de la fente + degré le plus proche
    const closestDegree = Math.min(...closestOrderHeirs.map(h => h.degre));
    const closestDegreeHeirs = closestOrderHeirs.filter(h => h.degre === closestDegree);
    
    const partPerHeir = remainingShare / closestDegreeHeirs.length;
    closestDegreeHeirs.forEach(heir => {
      shares[heir.personId] = {
        ...heir,
        part: partPerHeir
      };
    });
  } else {
    // Au-delà du 6e degré : État français hérite (art. 539)
    // Aucun héritier privé
  }
  
  // Appliquer la représentation puis la fente si nécessaire
  const sharesWithRepresentation = applyRepresentation(graph, shares);
  return applyFente(graph, sharesWithRepresentation);
}