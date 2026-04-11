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

// ─── Représentation récursive ───────────────────────────────────────

interface Souche {
  rootId: PersonId;
  heritiers: Array<{ person: any; part: number; lien: string }>;
}

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
      const subReps = collectRepresentantsRecursive(graph, child!.id);
      if (subReps.length > 0) {
        subReps.forEach(r => {
          results.push({ person: r.person, part: partPerChild * r.part });
        });
      }
    }
  }

  return results;
}

function buildSouchesEnfants(graph: FamilyGraph): Souche[] {
  const allDirectChildren = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'child')
    .map(link => link.to);

  const souches: Souche[] = [];

  for (const childId of allDirectChildren) {
    const child = graph.persons.find(p => p.id === childId);
    if (!child) continue;

    if (!child.estDecede) {
      souches.push({
        rootId: childId,
        heritiers: [{ person: child, part: 1.0, lien: 'enfant' }]
      });
    } else {
      const reps = collectRepresentantsRecursive(graph, childId);
      if (reps.length > 0) {
        souches.push({
          rootId: childId,
          heritiers: reps.map(r => ({ person: r.person, part: r.part, lien: 'petit_enfant' }))
        });
      }
    }
  }

  return souches;
}

function buildSouchesFratrie(graph: FamilyGraph): Souche[] {
  const siblingIds = graph.links
    .filter(link => link.from === graph.decedentId && link.relation === 'sibling')
    .map(link => link.to);

  // Also find by lienFamilial
  const siblingsByLien = graph.persons.filter(p => {
    if (p.id === graph.decedentId) return false;
    const lien = p.lienFamilial?.toLowerCase() || '';
    return lien === 'frère' || lien === 'sœur' || lien === 'frère/sœur' || lien === 'frere_soeur';
  });

  const allIds = new Set([...siblingIds, ...siblingsByLien.map(s => s.id)]);
  const souches: Souche[] = [];

  for (const sibId of allIds) {
    const sibling = graph.persons.find(p => p.id === sibId);
    if (!sibling) continue;

    if (!sibling.estDecede) {
      souches.push({
        rootId: sibId,
        heritiers: [{ person: sibling, part: 1.0, lien: 'frere_soeur' }]
      });
    } else {
      const reps = collectRepresentantsRecursive(graph, sibId);
      if (reps.length > 0) {
        souches.push({
          rootId: sibId,
          heritiers: reps.map(r => ({ person: r.person, part: r.part, lien: 'neveu_niece' }))
        });
      }
    }
  }

  return souches;
}

function souchesToShares(souches: Souche[], totalShare: number, ordre: number, degre: number): DevolutionShares {
  const shares: DevolutionShares = {};
  const partPerSouche = totalShare / souches.length;

  for (const souche of souches) {
    for (const h of souche.heritiers) {
      shares[h.person.id] = {
        personId: h.person.id,
        nom: `${h.person.prenom || ''} ${h.person.nom}`.trim(),
        lien: h.lien,
        part: partPerSouche * h.part,
        ordre,
        degre
      };
    }
  }

  return shares;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getParentsVivants(graph: FamilyGraph): any[] {
  return graph.persons.filter(p => {
    if (p.estDecede || p.id === graph.decedentId) return false;
    const lien = p.lienFamilial?.toLowerCase() || '';
    return lien === 'parent' || lien === 'père' || lien === 'mère';
  });
}

function findAllLivingDescendants(graph: FamilyGraph, ancestorId: PersonId): any[] {
  const results: any[] = [];
  const childLinks = graph.links.filter(l => l.from === ancestorId && l.relation === 'child');
  for (const link of childLinks) {
    const child = graph.persons.find(p => p.id === link.to);
    if (!child) continue;
    if (!child.estDecede) results.push(child);
    else results.push(...findAllLivingDescendants(graph, child.id));
  }
  return results;
}

function collectFenteHeritiers(graph: FamilyGraph, branche: 'paternelle' | 'maternelle'): any[] {
  const personnesVivantes = graph.persons.filter(p => !p.estDecede && p.id !== graph.decedentId);
  const brancheLabels = branche === 'paternelle'
    ? ['paternelle', 'paternel', 'père']
    : ['maternelle', 'maternel', 'mère'];

  const isBranche = (p: any) => {
    const b = (p.brancheFamiliale || p.lienFamilial || '').toLowerCase();
    return brancheLabels.some(label => b.includes(label));
  };

  // Rang 1: Grands-parents
  const gp = personnesVivantes.filter(p => {
    const l = (p.lienFamilial || '').toLowerCase();
    return (l.includes('grand-parent') || l.includes('grand_parent') || l === 'grand-père' || l === 'grand-mère') && isBranche(p);
  });
  if (gp.length > 0) return gp;

  // Rang 2: Arrière-grands-parents
  const agp = personnesVivantes.filter(p => {
    const l = (p.lienFamilial || '').toLowerCase();
    return (l.includes('arriere-grand') || l.includes('arrière-grand')) && isBranche(p);
  });
  if (agp.length > 0) return agp;

  // Rang 3: Oncles/tantes
  const ot = personnesVivantes.filter(p => {
    const l = (p.lienFamilial || '').toLowerCase();
    return (l === 'oncle' || l === 'tante') && isBranche(p);
  });
  if (ot.length > 0) return ot;

  // Rang 4: Cousins germains
  const co = personnesVivantes.filter(p => {
    const l = (p.lienFamilial || '').toLowerCase();
    return (l === 'cousin' || l === 'cousine') && isBranche(p);
  });
  if (co.length > 0) return co;

  return [];
}

// ─── Calcul principal ───────────────────────────────────────────────

export function computeHeirsShares(graph: FamilyGraph): DevolutionShares {
  const shares: DevolutionShares = {};

  // ═══ BRANCHE A — Défunt marié ═══
  if (graph.hasSurvivingSpouse && graph.survivingSpouseId) {
    const conjoint = graph.persons.find(p => p.id === graph.survivingSpouseId && !p.estDecede);
    if (!conjoint) return shares;

    const souchesEnfants = buildSouchesEnfants(graph);

    if (souchesEnfants.length > 0) {
      // A1. Enfants vivants ou représentés
      const tousCommuns = souchesEnfants.every(s =>
        graph.childrenCommonWithSpouse.includes(s.rootId)
      );

      // Conjoint : 1/4 PP (option usufruit gérée en aval)
      const conjointPart = 0.25;
      shares[conjoint.id] = {
        personId: conjoint.id,
        nom: `${conjoint.prenom || ''} ${conjoint.nom}`.trim(),
        lien: 'conjoint',
        part: conjointPart,
        ordre: 0,
        degre: 0
      };

      const solde = 1 - conjointPart;
      Object.assign(shares, souchesToShares(souchesEnfants, solde, 1, 1));
    } else {
      // A2. Pas d'enfant
      const parents = getParentsVivants(graph);

      if (parents.length === 2) {
        shares[conjoint.id] = { personId: conjoint.id, nom: `${conjoint.prenom || ''} ${conjoint.nom}`.trim(), lien: 'conjoint', part: 0.5, ordre: 0, degre: 0 };
        parents.forEach(p => {
          shares[p.id] = { personId: p.id, nom: `${p.prenom || ''} ${p.nom}`.trim(), lien: 'parent', part: 0.25, ordre: 2, degre: 1 };
        });
      } else if (parents.length === 1) {
        shares[conjoint.id] = { personId: conjoint.id, nom: `${conjoint.prenom || ''} ${conjoint.nom}`.trim(), lien: 'conjoint', part: 0.75, ordre: 0, degre: 0 };
        shares[parents[0].id] = { personId: parents[0].id, nom: `${parents[0].prenom || ''} ${parents[0].nom}`.trim(), lien: 'parent', part: 0.25, ordre: 2, degre: 1 };
      } else {
        shares[conjoint.id] = { personId: conjoint.id, nom: `${conjoint.prenom || ''} ${conjoint.nom}`.trim(), lien: 'conjoint', part: 1.0, ordre: 0, degre: 0 };
      }
    }

    return shares;
  }

  // ═══ BRANCHE B — Défunt non marié ═══

  // B1. Enfants vivants ou représentables
  const souchesEnfants = buildSouchesEnfants(graph);
  if (souchesEnfants.length > 0) {
    return souchesToShares(souchesEnfants, 1.0, 1, 1);
  }

  // B2. Filet de sécurité — descendants directs
  const descendants = findAllLivingDescendants(graph, graph.decedentId);
  if (descendants.length > 0) {
    const part = 1.0 / descendants.length;
    descendants.forEach(d => {
      shares[d.id] = { personId: d.id, nom: `${d.prenom || ''} ${d.nom}`.trim(), lien: 'petit_enfant', part, ordre: 1, degre: 2 };
    });
    return shares;
  }

  // B3. Parents vivants ?
  const parents = getParentsVivants(graph);
  const souchesFratrie = buildSouchesFratrie(graph);

  if (parents.length > 0) {
    if (souchesFratrie.length > 0) {
      // Parents + fratrie
      parents.forEach(p => {
        shares[p.id] = { personId: p.id, nom: `${p.prenom || ''} ${p.nom}`.trim(), lien: 'parent', part: 0.25, ordre: 2, degre: 1 };
      });
      const resteFratrie = 1.0 - (0.25 * parents.length);
      Object.assign(shares, souchesToShares(souchesFratrie, resteFratrie, 2, 2));
    } else {
      // Parents seuls
      if (parents.length === 2) {
        parents.forEach(p => {
          shares[p.id] = { personId: p.id, nom: `${p.prenom || ''} ${p.nom}`.trim(), lien: 'parent', part: 0.5, ordre: 2, degre: 1 };
        });
      } else {
        // Un seul parent → 1/4, reste 3/4 à la fente
        shares[parents[0].id] = { personId: parents[0].id, nom: `${parents[0].prenom || ''} ${parents[0].nom}`.trim(), lien: 'parent', part: 0.25, ordre: 2, degre: 1 };
        applyFenteToShares(graph, shares, 0.75);
      }
    }
    return shares;
  }

  // B4. Frères/sœurs seuls
  if (souchesFratrie.length > 0) {
    return souchesToShares(souchesFratrie, 1.0, 2, 2);
  }

  // B5. Fente successorale
  applyFenteToShares(graph, shares, 1.0);
  return shares;
}

function applyFenteToShares(graph: FamilyGraph, shares: DevolutionShares, totalShare: number): void {
  const branchePat = collectFenteHeritiers(graph, 'paternelle');
  const brancheMat = collectFenteHeritiers(graph, 'maternelle');

  const hasPat = branchePat.length > 0;
  const hasMat = brancheMat.length > 0;

  if (!hasPat && !hasMat) return; // État hérite

  const distribute = (heritiers: any[], share: number) => {
    const part = share / heritiers.length;
    heritiers.forEach(h => {
      const lien = (h.lienFamilial || '').toLowerCase();
      shares[h.id] = {
        personId: h.id,
        nom: `${h.prenom || ''} ${h.nom}`.trim(),
        lien: lien.includes('grand') ? 'grand_parent' : lien === 'oncle' || lien === 'tante' ? 'oncle_tante' : lien === 'cousin' || lien === 'cousine' ? 'cousin' : 'autre',
        part,
        ordre: lien.includes('grand') ? 3 : 4,
        degre: 4
      };
    });
  };

  if (hasPat && hasMat) {
    distribute(branchePat, totalShare / 2);
    distribute(brancheMat, totalShare / 2);
  } else if (hasPat) {
    distribute(branchePat, totalShare);
  } else {
    distribute(brancheMat, totalShare);
  }
}
