import { format } from 'date-fns';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';

export interface FamilyGraphNode {
  id: string;
  name: string;
  birthDate: string | null;
  isDeceased: boolean;
  relation: string;
  generation: number;
  isMain?: boolean;
  isSpouse?: boolean;
  originalData?: FamilyLink;
}

export interface FamilyGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface FamilyGraph {
  nodes: FamilyGraphNode[];
  edges: FamilyGraphEdge[];
}

// Génération relative à l'utilisateur principal (0), négative = ascendants, positive = descendants.
const GENERATION_BY_RELATION: Record<string, number> = {
  'Grand-parent': -2,
  'Arrière grand-parent': -3,
  'Parent': -1,
  'Beau-parent': -1,
  'Oncle/Tante': -1, // même génération que les parents
  'Frère/Sœur': 0,
  'Beau-frère/Belle-sœur': 0,
  'Cousin/Cousine': 0, // même génération que la fratrie
  'Enfant': 1,
  'Neveu/Nièce': 2, // même génération que les petits-enfants
  'Petit-enfant': 2,
  'Petit neveu/nièce': 3,
  'Arrière petit-enfant': 3,
};

/**
 * Construit le graphe générationnel de la famille (nœuds + relations parent-enfant)
 * à partir de family_links, indépendamment de toute librairie de rendu.
 * Consommé par FamilyTreeCards (arbre en cartes intégré à la page Famille).
 */
export function buildFamilyGraph(
  familyProfile: FamilyProfile | null,
  maritalStatus: MaritalStatus | null,
  familyMembers: FamilyLink[]
): FamilyGraph {
  const nodes: FamilyGraphNode[] = [];
  let nodeId = 1;

  nodes.push({
    id: 'main',
    name: familyProfile ? `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous' : 'Vous',
    birthDate: familyProfile?.date_naissance ? format(new Date(familyProfile.date_naissance), 'dd/MM/yyyy') : null,
    isDeceased: false,
    relation: 'Principal',
    isMain: true,
    generation: 0,
  });

  if (maritalStatus && ['Marié(e)', 'Concubinage', 'Pacsé(e)'].includes(maritalStatus.statut_couple || '')) {
    nodes.push({
      id: 'spouse',
      name: `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)',
      birthDate: maritalStatus.date_naissance_conjoint ? format(new Date(maritalStatus.date_naissance_conjoint), 'dd/MM/yyyy') : null,
      isDeceased: false,
      relation: 'Conjoint(e)',
      isSpouse: true,
      generation: 0,
    });
  }

  familyMembers.forEach(member => {
    const generation = GENERATION_BY_RELATION[member.lien_familial] ?? 0;
    nodes.push({
      id: member.id || `member-${nodeId++}`,
      name: `${member.prenom || ''} ${member.nom}`.trim(),
      birthDate: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
      isDeceased: member.est_decede || false,
      relation: member.lien_familial,
      generation,
      originalData: member,
    });
  });

  const edges: FamilyGraphEdge[] = [];

  // Résout le nœud "ancêtre" d'un membre pour un type de relation donné, en se basant sur
  // le lien réellement saisi (member.originalData.enfant_de), plutôt que sur le premier nœud
  // trouvé de ce type. enfant_de peut être soit l'id exact du membre lié (ex: un Enfant précis
  // pour un Petit-enfant), soit 'user'/'spouse' (ex: un Parent "de mon côté" vs "du côté conjoint").
  // Fallback sur le premier nœud du type attendu si enfant_de est absent (données saisies avant
  // l'ajout de ce champ) ou ne correspond à rien, pour ne pas faire disparaître l'arête.
  const resolveAncestorId = (member: FamilyGraphNode, targetRelation: string): string | null => {
    const enfantDe = member.originalData?.enfant_de;
    if (enfantDe) {
      const directMatch = nodes.find(n => n.relation === targetRelation && n.id === enfantDe);
      if (directMatch) return directMatch.id;
      if (enfantDe === 'user' || enfantDe === 'spouse') {
        const sameSide = nodes.find(n => n.relation === targetRelation && n.originalData?.enfant_de === enfantDe);
        if (sameSide) return sameSide.id;
      }
    }
    const fallback = nodes.find(n => n.relation === targetRelation);
    return fallback ? fallback.id : null;
  };

  nodes.forEach(member => {
    if (member.relation === 'Enfant') {
      const enfantDe = member.originalData?.enfant_de;
      const hasSpouse = !!nodes.find(m => m.id === 'spouse');
      const sources = enfantDe === 'user'
        ? ['main']
        : enfantDe === 'spouse' && hasSpouse
          ? ['spouse']
          : enfantDe === 'both_parents' || !enfantDe
            ? hasSpouse ? ['main', 'spouse'] : ['main']
            : ['main'];
      sources.forEach(source => {
        edges.push({ id: `edge-${source}-${member.id}`, source, target: member.id });
      });
    } else if (member.relation === 'Petit-enfant') {
      const parentId = resolveAncestorId(member, 'Enfant');
      if (parentId) {
        edges.push({ id: `edge-${parentId}-${member.id}`, source: parentId, target: member.id });
      }
    } else if (member.relation === 'Arrière petit-enfant') {
      const parentId = resolveAncestorId(member, 'Petit-enfant');
      if (parentId) {
        edges.push({ id: `edge-${parentId}-${member.id}`, source: parentId, target: member.id });
      }
    } else if (member.relation === 'Petit neveu/nièce') {
      const parentId = resolveAncestorId(member, 'Neveu/Nièce');
      if (parentId) {
        edges.push({ id: `edge-${parentId}-${member.id}`, source: parentId, target: member.id });
      }
    } else if (member.relation === 'Neveu/Nièce') {
      const siblingId = resolveAncestorId(member, 'Frère/Sœur');
      if (siblingId) {
        edges.push({ id: `edge-${siblingId}-${member.id}`, source: siblingId, target: member.id });
      }
    } else if (member.relation === 'Parent') {
      const target = member.originalData?.enfant_de === 'spouse' && nodes.find(m => m.id === 'spouse') ? 'spouse' : 'main';
      edges.push({ id: `edge-${member.id}-${target}`, source: member.id, target });
    } else if (member.relation === 'Frère/Sœur') {
      const parentId = resolveAncestorId(member, 'Parent');
      if (parentId) {
        edges.push({ id: `edge-${parentId}-${member.id}`, source: parentId, target: member.id });
      }
    } else if (member.relation === 'Grand-parent') {
      const parentId = resolveAncestorId(member, 'Parent');
      if (parentId) {
        edges.push({ id: `edge-${member.id}-${parentId}`, source: member.id, target: parentId });
      }
    } else if (member.relation === 'Arrière grand-parent') {
      const grandparentId = resolveAncestorId(member, 'Grand-parent');
      if (grandparentId) {
        edges.push({ id: `edge-${member.id}-${grandparentId}`, source: member.id, target: grandparentId });
      }
    } else if (member.relation === 'Oncle/Tante') {
      const grandparentId = resolveAncestorId(member, 'Grand-parent');
      if (grandparentId) {
        edges.push({ id: `edge-${grandparentId}-${member.id}`, source: grandparentId, target: member.id });
      }
    } else if (member.relation === 'Cousin/Cousine') {
      const uncleId = resolveAncestorId(member, 'Oncle/Tante');
      if (uncleId) {
        edges.push({ id: `edge-${uncleId}-${member.id}`, source: uncleId, target: member.id });
      }
    }
  });

  if (nodes.find(m => m.id === 'spouse')) {
    edges.push({ id: 'edge-main-spouse', source: 'main', target: 'spouse' });
  }

  return { nodes, edges };
}
