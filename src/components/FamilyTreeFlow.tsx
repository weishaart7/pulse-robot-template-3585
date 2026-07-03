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
import { X } from 'lucide-react';
import { buildFamilyGraph, FamilyGraphNode } from '@/lib/family/buildFamilyGraph';

interface FamilyTreeFlowProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
  onEditMember?: (member: FamilyLink) => void;
}

interface FamilyMember extends FamilyGraphNode {
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
    const graph = buildFamilyGraph(familyProfile, maritalStatus, familyMembers);
    const members: FamilyMember[] = graph.nodes.map(node => ({
      ...node,
      isClickable: !node.isMain && !node.isSpouse,
    }));

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

      });
    });

    // Style edges from the shared graph (mêmes relations que le calcul historique)
    const edgeStyle = {
      stroke: '#3b82f6',
      strokeWidth: 3,
      strokeDasharray: 'none'
    };

    graph.edges.forEach(graphEdge => {
      if (graphEdge.id === 'edge-main-spouse') {
        edges.push({
          id: graphEdge.id,
          source: graphEdge.source,
          target: graphEdge.target,
          type: 'straight',
          style: { stroke: '#ef4444', strokeWidth: 3 },
        });
      } else {
        edges.push({
          id: graphEdge.id,
          source: graphEdge.source,
          target: graphEdge.target,
          type: 'smoothstep',
          style: edgeStyle,
          animated: false,
          markerEnd: { type: 'arrowclosed', color: '#3b82f6' }
        });
      }
    });

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