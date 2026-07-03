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
// Repris tel quel du calcul historique de FamilyTreeFlow — ne pas modifier sans revalider l'arbre complet.
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
 * Consommé par FamilyTreeFlow (vue complète, en dialog) et FamilyTreeCards (arbre en cartes intégré à la page Famille).
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

  nodes.forEach(member => {
    if (member.relation === 'Enfant') {
      edges.push({ id: `edge-main-${member.id}`, source: 'main', target: member.id });
      if (nodes.find(m => m.id === 'spouse')) {
        edges.push({ id: `edge-spouse-${member.id}`, source: 'spouse', target: member.id });
      }
    } else if (member.relation === 'Petit-enfant') {
      const children = nodes.filter(m => m.relation === 'Enfant');
      if (children.length > 0) {
        edges.push({ id: `edge-${children[0].id}-${member.id}`, source: children[0].id, target: member.id });
      }
    } else if (member.relation === 'Neveu/Nièce') {
      const siblings = nodes.filter(m => m.relation === 'Frère/Sœur');
      if (siblings.length > 0) {
        edges.push({ id: `edge-${siblings[0].id}-${member.id}`, source: siblings[0].id, target: member.id });
      }
    } else if (member.relation === 'Parent') {
      edges.push({ id: `edge-${member.id}-main`, source: member.id, target: 'main' });
    } else if (member.relation === 'Frère/Sœur') {
      const parents = nodes.filter(m => m.relation === 'Parent');
      if (parents.length > 0) {
        edges.push({ id: `edge-${parents[0].id}-${member.id}`, source: parents[0].id, target: member.id });
      }
    } else if (member.relation === 'Grand-parent') {
      const parents = nodes.filter(m => m.relation === 'Parent');
      if (parents.length > 0) {
        edges.push({ id: `edge-${member.id}-${parents[0].id}`, source: member.id, target: parents[0].id });
      }
    } else if (member.relation === 'Oncle/Tante') {
      const grandparents = nodes.filter(m => m.relation === 'Grand-parent');
      if (grandparents.length > 0) {
        edges.push({ id: `edge-${grandparents[0].id}-${member.id}`, source: grandparents[0].id, target: member.id });
      }
    } else if (member.relation === 'Cousin/Cousine') {
      const uncles = nodes.filter(m => m.relation === 'Oncle/Tante');
      if (uncles.length > 0) {
        edges.push({ id: `edge-${uncles[0].id}-${member.id}`, source: uncles[0].id, target: member.id });
      }
    }
  });

  if (nodes.find(m => m.id === 'spouse')) {
    edges.push({ id: 'edge-main-spouse', source: 'main', target: 'spouse' });
  }

  return { nodes, edges };
}
