import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { format } from 'date-fns';
import { Cross } from 'lucide-react';

interface FamilyTreeFlowProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
}

interface FamilyMember {
  id: string;
  name: string;
  birthDate: string | null;
  isDeceased: boolean;
  relation: string;
  isMain?: boolean;
  isSpouse?: boolean;
  generation: number;
}

const getRelationColor = (relation: string, isMain = false, isSpouse = false) => {
  if (isMain) return '#1e293b';
  if (isSpouse) return '#475569';
  
  const colors: Record<string, string> = {
    'Enfant': '#22c55e',
    'Petit-enfant': '#4ade80',
    'Arrière petit-enfant': '#86efac',
    'Parent': '#2563eb',
    'Grand-parent': '#3b82f6',
    'Arrière grand-parent': '#60a5fa',
    'Frère/Sœur': '#f97316',
    'Oncle/Tante': '#a855f7',
    'Neveu/Nièce': '#c084fc',
    'Cousin/Cousine': '#d8b4fe',
    'Beau-parent': '#6366f1',
    'Beau-frère/Belle-sœur': '#8b5cf6',
    'Autre': '#6b7280'
  };
  return colors[relation] || '#6b7280';
};

const FamilyNode = ({ data }: { data: FamilyMember }) => {
  const bgColor = getRelationColor(data.relation, data.isMain, data.isSpouse);
  
  return (
    <div 
      className="px-4 py-3 rounded-lg shadow-lg border-2 min-w-[120px] text-center"
      style={{ 
        backgroundColor: bgColor,
        borderColor: data.isMain || data.isSpouse ? '#ffffff' : bgColor,
        color: '#ffffff'
      }}
    >
      <div className="font-medium text-sm">
        {data.name}
      </div>
      {data.birthDate && (
        <div className="text-xs opacity-80 mt-1">
          {data.birthDate}
        </div>
      )}
      {data.isDeceased && (
        <Cross className="w-3 h-3 mx-auto mt-1 opacity-80" />
      )}
      {!data.isMain && !data.isSpouse && (
        <div className="text-xs opacity-70 mt-1">
          {data.relation}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  family: FamilyNode,
};

export function FamilyTreeFlow({ familyProfile, maritalStatus, familyMembers }: FamilyTreeFlowProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const members: FamilyMember[] = [];
    let nodeId = 1;

    // Main user
    const mainUser: FamilyMember = {
      id: 'main',
      name: familyProfile ? `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous' : 'Vous',
      birthDate: familyProfile?.date_naissance ? format(new Date(familyProfile.date_naissance), 'dd/MM/yyyy') : null,
      isDeceased: false,
      relation: 'Principal',
      isMain: true,
      generation: 0
    };
    members.push(mainUser);

    // Spouse
    if (maritalStatus && ['Marié(e)', 'Concubinage', 'Pacsé(e)'].includes(maritalStatus.statut_couple || '')) {
      const spouse: FamilyMember = {
        id: 'spouse',
        name: `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)',
        birthDate: maritalStatus.date_naissance_conjoint ? format(new Date(maritalStatus.date_naissance_conjoint), 'dd/MM/yyyy') : null,
        isDeceased: false,
        relation: 'Conjoint(e)',
        isSpouse: true,
        generation: 0
      };
      members.push(spouse);
    }

    // Add family members with generations
    familyMembers.forEach(member => {
      let generation = 0;
      switch (member.lien_familial) {
        case 'Grand-parent':
          generation = -2;
          break;
        case 'Arrière grand-parent':
          generation = -3;
          break;
        case 'Parent':
        case 'Beau-parent':
          generation = -1;
          break;
        case 'Frère/Sœur':
        case 'Beau-frère/Belle-sœur':
        case 'Oncle/Tante':
          generation = 0;
          break;
        case 'Enfant':
          generation = 1;
          break;
        case 'Petit-enfant':
        case 'Neveu/Nièce':
          generation = 2;
          break;
        case 'Arrière petit-enfant':
        case 'Petit neveu/nièce':
          generation = 3;
          break;
        case 'Cousin/Cousine':
          generation = 0;
          break;
        default:
          generation = 0;
      }

      members.push({
        id: member.id || `member-${nodeId++}`,
        name: `${member.prenom || ''} ${member.nom}`.trim(),
        birthDate: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        isDeceased: member.est_decede || false,
        relation: member.lien_familial,
        generation
      });
    });

    // Create nodes
    const generationGroups = members.reduce((acc, member) => {
      if (!acc[member.generation]) acc[member.generation] = [];
      acc[member.generation].push(member);
      return acc;
    }, {} as Record<number, FamilyMember[]>);

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const generations = Object.keys(generationGroups).map(Number).sort((a, b) => a - b);
    const baseY = 300; // Center Y position for generation 0

    generations.forEach(generation => {
      const membersInGeneration = generationGroups[generation];
      const startX = 400 - (membersInGeneration.length * 150) / 2;

      membersInGeneration.forEach((member, index) => {
        const x = startX + index * 150;
        const y = baseY - generation * 120;

        nodes.push({
          id: member.id,
          type: 'family',
          position: { x, y },
          data: member as any,
        });

        // Create edges for family relationships
        if (member.generation > 0) {
          // Children connect to main user
          if (member.relation === 'Enfant') {
            edges.push({
              id: `edge-${member.id}-main`,
              source: 'main',
              target: member.id,
              type: 'smoothstep',
              style: { stroke: '#64748b', strokeWidth: 2 },
            });
            
            // Also connect to spouse if exists
            if (members.find(m => m.id === 'spouse')) {
              edges.push({
                id: `edge-${member.id}-spouse`,
                source: 'spouse',
                target: member.id,
                type: 'smoothstep',
                style: { stroke: '#64748b', strokeWidth: 2 },
              });
            }
          }
          
          // Grandchildren connect to their parents
          if (member.relation === 'Petit-enfant') {
            const parents = members.filter(m => m.relation === 'Enfant');
            if (parents.length > 0) {
              edges.push({
                id: `edge-${member.id}-parent`,
                source: parents[0].id,
                target: member.id,
                type: 'smoothstep',
                style: { stroke: '#64748b', strokeWidth: 2 },
              });
            }
          }
        } else if (member.generation < 0) {
          // Parents connect to main user
          if (member.relation === 'Parent') {
            edges.push({
              id: `edge-parent-${member.id}`,
              source: member.id,
              target: 'main',
              type: 'smoothstep',
              style: { stroke: '#64748b', strokeWidth: 2 },
            });
          }
          
          // Grandparents connect to parents
          if (member.relation === 'Grand-parent') {
            const parents = members.filter(m => m.relation === 'Parent');
            if (parents.length > 0) {
              edges.push({
                id: `edge-grandparent-${member.id}`,
                source: member.id,
                target: parents[0].id,
                type: 'smoothstep',
                style: { stroke: '#64748b', strokeWidth: 2 },
              });
            }
          }
        }
      });
    });

    // Connect spouse to main user
    if (members.find(m => m.id === 'spouse')) {
      edges.push({
        id: 'edge-main-spouse',
        source: 'main',
        target: 'spouse',
        type: 'straight',
        style: { stroke: '#ef4444', strokeWidth: 3 },
      });
    }

    return { nodes, edges };
  }, [familyProfile, maritalStatus, familyMembers]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  if (!familyProfile && familyMembers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="text-lg">👥</div>
        <p>Ajoutez des membres de famille pour voir l'arbre familial</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-background rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        style={{ backgroundColor: '#f8fafc' }}
      >
        <Background color="#e2e8f0" size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}