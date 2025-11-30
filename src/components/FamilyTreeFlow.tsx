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
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface FamilyTreeFlowProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
  onEditMember?: (member: FamilyLink) => void;
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
  originalData?: FamilyLink;
  isClickable?: boolean;
}

const getRelationColor = (relation: string, isMain = false, isSpouse = false) => {
  if (isMain) return '#1e293b';
  if (isSpouse) return '#ef4444'; // Red for spouse
  
  // Ligne directe (réservataires) - Green shades
  if (['Enfant', 'Petit-enfant', 'Arrière petit-enfant'].includes(relation)) {
    return '#22c55e';
  }
  
  // Parents ascendants - Blue shades
  if (['Parent', 'Grand-parent', 'Arrière grand-parent'].includes(relation)) {
    return '#2563eb';
  }
  
  // Collatéraux - Orange/Purple shades
  const colors: Record<string, string> = {
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
  const isClickable = data.isClickable && !data.isMain && !data.isSpouse;
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg shadow-lg border-2 min-w-[140px] text-center transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''
      }`}
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
        <X className="w-3 h-3 mx-auto mt-1 opacity-80" />
      )}
      {!data.isMain && !data.isSpouse && (
        <div className="text-xs opacity-70 mt-1">
          {data.relation}
        </div>
      )}
      {data.isMain && (
        <div className="text-xs opacity-70 mt-1">
          Vous
        </div>
      )}
      {data.isSpouse && (
        <div className="text-xs opacity-70 mt-1">
          Conjoint(e)
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  family: FamilyNode,
};

export function FamilyTreeFlow({ familyProfile, maritalStatus, familyMembers, onEditMember }: FamilyTreeFlowProps) {
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
          generation = 0;
          break;
        case 'Oncle/Tante':
          generation = -1; // Same generation as parents
          break;
        case 'Enfant':
          generation = 1;
          break;
        case 'Petit-enfant':
          generation = 2;
          break;
        case 'Arrière petit-enfant':
          generation = 3;
          break;
        case 'Neveu/Nièce':
          generation = 2; // Same generation as grandchildren
          break;
        case 'Petit neveu/nièce':
          generation = 3;
          break;
        case 'Cousin/Cousine':
          generation = 0; // Same generation as siblings
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
        generation,
        originalData: member,
        isClickable: true
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
    const baseY = 200; // Center Y position for generation 0
    const levelHeight = 150; // Distance between generations
    const nodeWidth = 200; // Spacing between nodes horizontally

    generations.forEach(generation => {
      const membersInGeneration = generationGroups[generation];
      const totalWidth = membersInGeneration.length * nodeWidth;
      const startX = 400 - totalWidth / 2 + nodeWidth / 2;

      membersInGeneration.forEach((member, index) => {
        const x = startX + index * nodeWidth;
        const y = baseY - generation * levelHeight;

        nodes.push({
          id: member.id,
          type: 'family',
          position: { x, y },
          data: member as any,
        });

        // Create edges for family relationships with more visible styling
        const edgeStyle = { 
          stroke: '#3b82f6', 
          strokeWidth: 3,
          strokeDasharray: 'none'
        };
        
        const spouseEdgeStyle = { 
          stroke: '#ef4444', 
          strokeWidth: 4,
          strokeDasharray: 'none'
        };

        // Connect children to both parents
        if (member.relation === 'Enfant') {
          edges.push({
            id: `edge-main-${member.id}`,
            source: 'main',
            target: member.id,
            type: 'smoothstep',
            style: edgeStyle,
            animated: false,
            markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
          });
          
          // Also connect to spouse if exists
          const spouse = members.find(m => m.id === 'spouse');
          if (spouse) {
            edges.push({
              id: `edge-spouse-${member.id}`,
              source: 'spouse',
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect grandchildren to their parents (children)
        else if (member.relation === 'Petit-enfant') {
          const children = members.filter(m => m.relation === 'Enfant');
          if (children.length > 0) {
            // Connect to first child found
            edges.push({
              id: `edge-${children[0].id}-${member.id}`,
              source: children[0].id,
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect nephews/nieces to their parents (siblings)
        else if (member.relation === 'Neveu/Nièce') {
          const siblings = members.filter(m => m.relation === 'Frère/Sœur');
          if (siblings.length > 0) {
            edges.push({
              id: `edge-${siblings[0].id}-${member.id}`,
              source: siblings[0].id,
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect parents to main user
        else if (member.relation === 'Parent') {
          edges.push({
            id: `edge-${member.id}-main`,
            source: member.id,
            target: 'main',
            type: 'smoothstep',
            style: edgeStyle,
            animated: false,
            markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
          });
        }
        
        // Connect siblings to the same parents
        else if (member.relation === 'Frère/Sœur') {
          const parents = members.filter(m => m.relation === 'Parent');
          if (parents.length > 0) {
            edges.push({
              id: `edge-${parents[0].id}-${member.id}`,
              source: parents[0].id,
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect grandparents to parents
        else if (member.relation === 'Grand-parent') {
          const parents = members.filter(m => m.relation === 'Parent');
          if (parents.length > 0) {
            edges.push({
              id: `edge-${member.id}-${parents[0].id}`,
              source: member.id,
              target: parents[0].id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect uncles/aunts to grandparents
        else if (member.relation === 'Oncle/Tante') {
          const grandparents = members.filter(m => m.relation === 'Grand-parent');
          if (grandparents.length > 0) {
            edges.push({
              id: `edge-${grandparents[0].id}-${member.id}`,
              source: grandparents[0].id,
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
        
        // Connect cousins to uncles/aunts
        else if (member.relation === 'Cousin/Cousine') {
          const uncles = members.filter(m => m.relation === 'Oncle/Tante');
          if (uncles.length > 0) {
            edges.push({
              id: `edge-${uncles[0].id}-${member.id}`,
              source: uncles[0].id,
              target: member.id,
              type: 'smoothstep',
              style: edgeStyle,
              animated: false,
              markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
            });
          }
        }
      });
    });

    // Connect spouse to main user with a special red line
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

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const nodeData = node.data as unknown as FamilyMember;
    if (nodeData.isClickable && nodeData.originalData && onEditMember) {
      onEditMember(nodeData.originalData);
    }
  }, [onEditMember]);

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
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        style={{ backgroundColor: '#f8fafc' }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background color="#e2e8f0" size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}