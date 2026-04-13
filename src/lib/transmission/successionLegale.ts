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
 */
export function calculateSuccessionLegale(
  graph: FamilyGraph,
  hasTestament: boolean = false,
  optionConjoint?: string
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

  const personnesVivantes = graph.persons.filter(p => !p.estDecede && p.id !== graph.decedentId);

  // BRANCHE A — Le défunt était marié
  if (graph.hasSurvivingSpouse && graph.survivingSpouseId) {
    return calculateBrancheA(graph, personnesVivantes, result, optionConjoint);
  }

  // BRANCHE B — Le défunt n'était pas marié
  return calculateBrancheB(graph, personnesVivantes, result);
}

// ─── BRANCHE A — Défunt marié ───────────────────────────────────────

function calculateBrancheA(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult,
  optionConjoint?: string
): SuccessionLegaleResult {
  const conjoint = personnesVivantes.find(p => p.id === graph.survivingSpouseId);
  if (!conjoint) return result;

  // A1. Y a-t-il des enfants (vivants ou représentés) ?
  const souchesEnfants = buildSouchesEnfants(graph);

  if (souchesEnfants.length > 0) {
    // Il y a des enfants vivants ou représentés
    const tousCommuns = souchesEnfants.every(s =>
      graph.childrenCommonWithSpouse.includes(s.rootChildId)
    );

    let conjointPart: number;
    let conjointTypeQuotePart: 'pleine_propriete' | 'usufruit' | 'nue_propriete' = 'pleine_propriete';
    let enfantsTypeQuotePart: 'pleine_propriete' | 'usufruit' | 'nue_propriete' = 'pleine_propriete';

    // Déterminer si DDV existe (on vérifie dans le graph si le mariage a une DDV)
    const hasDDV = !!(graph as any).hasDDV;

    if (tousCommuns) {
      result.optionConjoint = {
        quartPP: true,
        usufruitTotal: true,
        enfantsCommuns: true
      };

      if (optionConjoint === 'usufruit_total') {
        conjointPart = 1.0;
        conjointTypeQuotePart = 'usufruit';
        enfantsTypeQuotePart = 'nue_propriete';
        result.explicationsTexte.push(
          `Le conjoint reçoit 100% en usufruit. Les enfants reçoivent la nue-propriété.`
        );
      } else if (optionConjoint === 'quart_pp_3quarts_us' && hasDDV) {
        conjointPart = 1.0; // conjoint reçoit sur la totalité (1/4 PP + 3/4 US)
        conjointTypeQuotePart = 'pleine_propriete'; // simplifié
        enfantsTypeQuotePart = 'nue_propriete';
        result.explicationsTexte.push(
          `Le conjoint reçoit 1/4 en pleine propriété et 3/4 en usufruit (donation au dernier vivant).`
        );
      } else if (optionConjoint === 'qd_pp' && hasDDV) {
        const nbEnfants = souchesEnfants.length;
        conjointPart = nbEnfants === 1 ? 0.5 : nbEnfants === 2 ? 1/3 : 0.25;
        result.explicationsTexte.push(
          `Le conjoint reçoit la quotité disponible (${Math.round(conjointPart * 100)}%) en pleine propriété (donation au dernier vivant).`
        );
      } else {
        // Par défaut ou quart_pp
        conjointPart = 0.25;
        result.explicationsTexte.push(
          `Le conjoint reçoit 1/4 en pleine propriété. Les enfants se partagent les 3/4 restants.`
        );
      }
    } else {
      // Au moins un enfant non commun → 1/4 PP obligatoire
      conjointPart = 0.25;
      result.explicationsTexte.push(
        `Le conjoint reçoit 1/4 en pleine propriété (au moins un enfant non commun).`
      );
    }

    result.heritiers.push({
      personId: conjoint.id,
      nom: conjoint.nom,
      prenom: conjoint.prenom || '',
      lien: 'conjoint',
      quotePart: conjointPart,
      typeQuotePart: conjointTypeQuotePart,
      ordre: 0
    });

    // Enfants se partagent le solde par souche
    const solde = 1 - conjointPart;
    if (solde > 0) {
      distributeToSouchesWithType(result, souchesEnfants, solde, enfantsTypeQuotePart);
    } else {
      // Usufruit total: enfants reçoivent 100% en nue-propriété
      distributeToSouchesWithType(result, souchesEnfants, 1.0, enfantsTypeQuotePart);
    }

    if (solde > 0) {
      result.explicationsTexte.push(
        `Les enfants se partagent ${Math.round(solde * 100)}% à parts égales par souche.`
      );
    }
  } else {
    // A2. Pas d'enfant → vérifier les parents
    const parentsVivants = getParentsVivants(graph, personnesVivantes);

    if (parentsVivants.length === 2) {
      // Père ET mère vivants → Conjoint 1/2, chaque parent 1/4
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.5, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      parentsVivants.forEach(parent => {
        result.heritiers.push({
          personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
          lien: 'parent', quotePart: 0.25, typeQuotePart: 'pleine_propriete', ordre: 2
        });
      });
      result.explicationsTexte.push(`Le conjoint reçoit 1/2, chaque parent reçoit 1/4.`);
    } else if (parentsVivants.length === 1) {
      // Un seul parent → Conjoint 3/4, parent 1/4
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 0.75, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      result.heritiers.push({
        personId: parentsVivants[0].id, nom: parentsVivants[0].nom, prenom: parentsVivants[0].prenom || '',
        lien: 'parent', quotePart: 0.25, typeQuotePart: 'pleine_propriete', ordre: 2
      });
      result.explicationsTexte.push(`Le conjoint reçoit 3/4, le parent survivant reçoit 1/4.`);
    } else {
      // Aucun parent → Conjoint 100%
      result.heritiers.push({
        personId: conjoint.id, nom: conjoint.nom, prenom: conjoint.prenom || '',
        lien: 'conjoint', quotePart: 1.0, typeQuotePart: 'pleine_propriete', ordre: 0
      });
      result.explicationsTexte.push(`Le conjoint hérite de la totalité (aucun descendant ni parent survivant).`);
    }
  }

  return result;
}

// ─── BRANCHE B — Défunt non marié ───────────────────────────────────

function calculateBrancheB(
  graph: FamilyGraph,
  personnesVivantes: any[],
  result: SuccessionLegaleResult
): SuccessionLegaleResult {
  // B1. Y a-t-il des enfants vivants ou représentables ?
  const souchesEnfants = buildSouchesEnfants(graph);

  if (souchesEnfants.length > 0) {
    distributeToSouches(result, souchesEnfants, 1.0);
    result.explicationsTexte.push(`Les enfants héritent de la totalité à parts égales par souche.`);
    return result;
  }

  // B2. Filet de sécurité — petits-enfants/arrière-petits-enfants directs
  // (Normalement traité par la représentation en B1, sert de sécurité)
  const descendantsDirects = findAllLivingDescendants(graph, graph.decedentId);
  if (descendantsDirects.length > 0) {
    const part = 1.0 / descendantsDirects.length;
    descendantsDirects.forEach(d => {
      result.heritiers.push({
        personId: d.id, nom: d.nom, prenom: d.prenom || '',
        lien: 'petit_enfant', quotePart: part,
        typeQuotePart: 'pleine_propriete', ordre: 1, representation: true
      });
    });
    result.explicationsTexte.push(`Les descendants héritent à parts égales.`);
    return result;
  }

  // B3. Y a-t-il un ou deux parents vivants ?
  const parentsVivants = getParentsVivants(graph, personnesVivantes);
  const souchesFratrie = buildSouchesFratrie(graph, personnesVivantes);

  if (parentsVivants.length > 0) {
    if (souchesFratrie.length > 0) {
      // Parents + fratrie
      const partParent = 0.25;
      parentsVivants.forEach(parent => {
        result.heritiers.push({
          personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
          lien: 'parent', quotePart: partParent,
          typeQuotePart: 'pleine_propriete', ordre: 2
        });
      });
      const resteFratrie = 1.0 - (partParent * parentsVivants.length);
      distributeToSouchesFratrie(result, souchesFratrie, resteFratrie);
      result.explicationsTexte.push(
        `Chaque parent reçoit 1/4, les frères/sœurs se partagent le reste (${Math.round(resteFratrie * 100)}%).`
      );
    } else {
      // Parents seuls, sans fratrie
      if (parentsVivants.length === 2) {
        parentsVivants.forEach(parent => {
          result.heritiers.push({
            personId: parent.id, nom: parent.nom, prenom: parent.prenom || '',
            lien: 'parent', quotePart: 0.5,
            typeQuotePart: 'pleine_propriete', ordre: 2
          });
        });
        result.explicationsTexte.push(`Chaque parent reçoit 1/2.`);
      } else {
        // Un seul parent sans fratrie → parent 1/4, reste 3/4 passe à la fente (B5)
        result.heritiers.push({
          personId: parentsVivants[0].id, nom: parentsVivants[0].nom, prenom: parentsVivants[0].prenom || '',
          lien: 'parent', quotePart: 0.25,
          typeQuotePart: 'pleine_propriete', ordre: 2
        });
        // 3/4 restants vont à la fente pour l'autre branche
        applyFenteSuccessorale(graph, result, personnesVivantes, 0.75);
        result.explicationsTexte.push(
          `Le parent survivant reçoit 1/4, les 3/4 restants sont attribués via la fente successorale.`
        );
      }
    }
    return result;
  }

  // B4. Aucun parent. Y a-t-il des frères et sœurs (ou neveux/nièces) ?
  if (souchesFratrie.length > 0) {
    distributeToSouchesFratrie(result, souchesFratrie, 1.0);
    result.explicationsTexte.push(`Les frères/sœurs héritent de la totalité à parts égales.`);
    return result;
  }

  // B5. La fente successorale
  applyFenteSuccessorale(graph, result, personnesVivantes, 1.0);

  return result;
}

// ─── Représentation récursive des descendants ───────────────────────

interface Souche {
  rootChildId: PersonId;
  heritiers: Array<{ person: any; part: number; representation: boolean }>;
}

/**
 * Construit les souches d'enfants avec représentation récursive.
 * Chaque enfant direct du défunt forme une souche. Si l'enfant est vivant,
 * il hérite de sa souche entière. S'il est décédé, ses descendants le
 * représentent récursivement.
 */
function buildSouchesEnfants(graph: FamilyGraph): Souche[] {
  const allDirectChildren = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'child')
    .map(link => link.to);

  const souches: Souche[] = [];

  for (const childId of allDirectChildren) {
    const child = graph.persons.find(p => p.id === childId);
    if (!child) continue;

    if (!child.estDecede) {
      // Enfant vivant → il prend toute sa souche
      souches.push({
        rootChildId: childId,
        heritiers: [{ person: child, part: 1.0, representation: false }]
      });
    } else {
      // Enfant décédé → représentation récursive par ses descendants
      const representants = collectRepresentantsRecursive(graph, childId);
      if (representants.length > 0) {
        souches.push({
          rootChildId: childId,
          heritiers: representants.map(r => ({
            person: r.person,
            part: r.part,
            representation: true
          }))
        });
      }
      // Si aucun représentant, la souche disparaît (pas ajoutée)
    }
  }

  return souches;
}

/**
 * Collecte récursivement les représentants vivants d'une personne décédée.
 * Chaque niveau de descendants se partage la part à égalité.
 */
function collectRepresentantsRecursive(
  graph: FamilyGraph,
  deceasedId: PersonId
): Array<{ person: any; part: number }> {
  const directChildren = graph.links
    .filter(link => link.from === deceasedId && link.relation === 'child')
    .map(link => graph.persons.find(p => p.id === link.to))
    .filter(Boolean);

  if (directChildren.length === 0) return [];

  const results: Array<{ person: any; part: number }> = [];
  const partPerChild = 1.0 / directChildren.length;

  for (const child of directChildren) {
    if (!child!.estDecede) {
      results.push({ person: child, part: partPerChild });
    } else {
      // Récursion : les descendants de cet enfant décédé le représentent
      const subRepresentants = collectRepresentantsRecursive(graph, child!.id);
      if (subRepresentants.length > 0) {
        subRepresentants.forEach(r => {
          results.push({ person: r.person, part: partPerChild * r.part });
        });
      }
      // Si pas de sous-représentants, cette branche meurt
    }
  }

  return results;
}

/**
 * Distribue une fraction de la succession aux souches d'enfants.
 */
function distributeToSouches(
  result: SuccessionLegaleResult,
  souches: Souche[],
  totalShare: number
): void {
  const partParSouche = totalShare / souches.length;

  for (const souche of souches) {
    for (const h of souche.heritiers) {
      result.heritiers.push({
        personId: h.person.id,
        nom: h.person.nom,
        prenom: h.person.prenom || '',
        lien: h.representation ? 'petit_enfant' : 'enfant',
        quotePart: partParSouche * h.part,
        typeQuotePart: 'pleine_propriete',
        ordre: 1,
        representation: h.representation
      });
    }
  }
}

// ─── Fratrie avec représentation ────────────────────────────────────

interface SoucheFratrie {
  rootSiblingId: PersonId;
  heritiers: Array<{ person: any; part: number; representation: boolean }>;
}

function buildSouchesFratrie(graph: FamilyGraph, personnesVivantes: any[]): SoucheFratrie[] {
  const allSiblings = graph.persons.filter(p => {
    if (p.id === graph.decedentId) return false;
    const lien = p.lienFamilial?.toLowerCase();
    return lien === 'frère' || lien === 'sœur' || lien === 'frère/sœur' || lien === 'frere_soeur';
  });

  // Also check links for siblings
  const siblingIdsFromLinks = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'sibling')
    .map(link => link.to);

  const allSiblingIds = new Set([
    ...allSiblings.map(s => s.id),
    ...siblingIdsFromLinks
  ]);

  const souches: SoucheFratrie[] = [];

  for (const sibId of allSiblingIds) {
    const sibling = graph.persons.find(p => p.id === sibId);
    if (!sibling) continue;

    if (!sibling.estDecede) {
      souches.push({
        rootSiblingId: sibId,
        heritiers: [{ person: sibling, part: 1.0, representation: false }]
      });
    } else {
      // Frère/sœur décédé → représenté par ses enfants (neveux/nièces)
      const representants = collectRepresentantsRecursive(graph, sibId);
      if (representants.length > 0) {
        souches.push({
          rootSiblingId: sibId,
          heritiers: representants.map(r => ({
            person: r.person, part: r.part, representation: true
          }))
        });
      }
    }
  }

  return souches;
}

function distributeToSouchesFratrie(
  result: SuccessionLegaleResult,
  souches: SoucheFratrie[],
  totalShare: number
): void {
  const partParSouche = totalShare / souches.length;

  for (const souche of souches) {
    for (const h of souche.heritiers) {
      result.heritiers.push({
        personId: h.person.id,
        nom: h.person.nom,
        prenom: h.person.prenom || '',
        lien: h.representation ? 'neveu_niece' : 'frere_soeur',
        quotePart: partParSouche * h.part,
        typeQuotePart: 'pleine_propriete',
        ordre: 2,
        representation: h.representation
      });
    }
  }
}

// ─── Fente successorale (B5) ────────────────────────────────────────

function applyFenteSuccessorale(
  graph: FamilyGraph,
  result: SuccessionLegaleResult,
  personnesVivantes: any[],
  totalShare: number
): void {
  // Identifier les héritiers par branche et par rang
  const branchePaternelle = collectFenteHeritiers(graph, personnesVivantes, 'paternelle');
  const brancheMaternelle = collectFenteHeritiers(graph, personnesVivantes, 'maternelle');

  const hasPat = branchePaternelle.length > 0;
  const hasMat = brancheMaternelle.length > 0;

  if (!hasPat && !hasMat) {
    result.explicationsTexte.push(`Aucun héritier jusqu'au 6ème degré. L'État français hérite.`);
    return;
  }

  if (hasPat && hasMat) {
    // Fente 50/50
    distributeFenteHeritiers(result, branchePaternelle, totalShare / 2);
    distributeFenteHeritiers(result, brancheMaternelle, totalShare / 2);
    result.explicationsTexte.push(`Fente successorale : 50% branche paternelle, 50% branche maternelle.`);
  } else if (hasPat) {
    // Vacance de branche maternelle → tout à la paternelle
    distributeFenteHeritiers(result, branchePaternelle, totalShare);
    result.explicationsTexte.push(`Vacance de branche maternelle : la branche paternelle hérite de tout.`);
  } else {
    // Vacance de branche paternelle → tout à la maternelle
    distributeFenteHeritiers(result, brancheMaternelle, totalShare);
    result.explicationsTexte.push(`Vacance de branche paternelle : la branche maternelle hérite de tout.`);
  }
}

/**
 * Collecte les héritiers d'une branche (paternelle ou maternelle) par ordre de rang.
 * Rang 1 : Grands-parents
 * Rang 2 : Arrière-grands-parents
 * Rang 3 : Oncles et tantes
 * Rang 4 : Cousins germains
 * Le premier rang présent exclut les suivants.
 */
function collectFenteHeritiers(
  graph: FamilyGraph,
  personnesVivantes: any[],
  branche: 'paternelle' | 'maternelle'
): any[] {
  const brancheLabels = branche === 'paternelle'
    ? ['paternelle', 'paternel', 'père']
    : ['maternelle', 'maternel', 'mère'];

  const isBranche = (p: any) => {
    const b = p.brancheFamiliale?.toLowerCase() || p.lienFamilial?.toLowerCase() || '';
    return brancheLabels.some(label => b.includes(label));
  };

  // Rang 1 : Grands-parents
  const grandsParents = personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase() || '';
    return (lien.includes('grand-parent') || lien.includes('grand_parent') || lien === 'grand-père' || lien === 'grand-mère') && isBranche(p);
  });
  if (grandsParents.length > 0) return grandsParents;

  // Rang 2 : Arrière-grands-parents
  const arriereGP = personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase() || '';
    return (lien.includes('arriere-grand') || lien.includes('arrière-grand') || lien.includes('arriere_grand')) && isBranche(p);
  });
  if (arriereGP.length > 0) return arriereGP;

  // Rang 3 : Oncles et tantes
  const onclesTantes = personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase() || '';
    return (lien === 'oncle' || lien === 'tante') && isBranche(p);
  });
  if (onclesTantes.length > 0) return onclesTantes;

  // Rang 4 : Cousins germains
  const cousins = personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase() || '';
    return (lien === 'cousin' || lien === 'cousine' || lien === 'cousin_germain') && isBranche(p);
  });
  if (cousins.length > 0) return cousins;

  return [];
}

function distributeFenteHeritiers(
  result: SuccessionLegaleResult,
  heritiers: any[],
  totalShare: number
): void {
  const part = totalShare / heritiers.length;
  heritiers.forEach(h => {
    const lien = h.lienFamilial?.toLowerCase() || 'autre';
    result.heritiers.push({
      personId: h.id,
      nom: h.nom,
      prenom: h.prenom || '',
      lien: mapLienFamilial(lien),
      quotePart: part,
      typeQuotePart: 'pleine_propriete',
      ordre: lien.includes('grand') ? 3 : 4
    });
  });
}

// ─── Utilitaires ────────────────────────────────────────────────────

function getParentsVivants(_graph: FamilyGraph, personnesVivantes: any[]): any[] {
  return personnesVivantes.filter(p => {
    const lien = p.lienFamilial?.toLowerCase();
    return lien === 'parent' || lien === 'père' || lien === 'mère';
  });
}

function findAllLivingDescendants(graph: FamilyGraph, ancestorId: PersonId): any[] {
  const results: any[] = [];
  const childLinks = graph.links.filter(l => l.from === ancestorId && l.relation === 'child');

  for (const link of childLinks) {
    const child = graph.persons.find(p => p.id === link.to);
    if (!child) continue;
    if (!child.estDecede) {
      results.push(child);
    } else {
      results.push(...findAllLivingDescendants(graph, child.id));
    }
  }

  return results;
}

function mapLienFamilial(lien: string): string {
  if (lien.includes('grand-parent') || lien.includes('grand_parent') || lien === 'grand-père' || lien === 'grand-mère') return 'grand_parent';
  if (lien.includes('arriere-grand') || lien.includes('arrière-grand')) return 'arriere_grand_parent';
  if (lien === 'oncle' || lien === 'tante') return 'oncle_tante';
  if (lien === 'cousin' || lien === 'cousine') return 'cousin';
  return 'autre';
}
