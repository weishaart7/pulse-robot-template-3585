import React, { useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { Card, CardContent } from '@/components/ui/card';
import { User, Heart, Users } from 'lucide-react';

interface FamilyTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
}

const FamilyNode = ({ data }: { data: any }) => {
  const { name, type, age, relation } = data;
  
  const getIcon = () => {
    if (type === 'main') return <User className="w-4 h-4" />;
    if (type === 'spouse') return <Heart className="w-4 h-4" />;
    return <Users className="w-4 h-4" />;
  };

  const getBgColor = () => {
    if (type === 'main') return 'bg-primary/10 border-primary';
    if (type === 'spouse') return 'bg-pink-100 border-pink-300';
    if (relation === 'Enfant') return 'bg-blue-100 border-blue-300';
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <Card className={`min-w-[160px] ${getBgColor()}`}>
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center mb-2">
          {getIcon()}
        </div>
        <div className="font-medium text-sm">{name}</div>
        {age && <div className="text-xs text-muted-foreground">{age} ans</div>}
        {relation && type !== 'main' && type !== 'spouse' && (
          <div className="text-xs text-muted-foreground mt-1">{relation}</div>
        )}
      </CardContent>
    </Card>
  );
};

const nodeTypes = {
  family: FamilyNode,
};

export function FamilyTree({ familyProfile, maritalStatus, familyMembers }: FamilyTreeProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Nœud principal (la personne connectée)
    if (familyProfile) {
      const age = familyProfile.date_naissance 
        ? new Date().getFullYear() - new Date(familyProfile.date_naissance).getFullYear()
        : null;
      
      nodes.push({
        id: 'main',
        type: 'family',
        position: { x: 250, y: 200 },
        data: {
          name: `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous',
          type: 'main',
          age: age,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    }

    // Conjoint si marié, en concubinage ou pacsé
    if (maritalStatus && ['Marié(e)', 'Concubin(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple || '')) {
      const spouseAge = maritalStatus.date_naissance_conjoint
        ? new Date().getFullYear() - new Date(maritalStatus.date_naissance_conjoint).getFullYear()
        : null;

      nodes.push({
        id: 'spouse',
        type: 'family',
        position: { x: 50, y: 200 },
        data: {
          name: `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)',
          type: 'spouse',
          age: spouseAge,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Lien entre les conjoints
      edges.push({
        id: 'main-spouse',
        source: 'spouse',
        target: 'main',
        type: 'smoothstep',
        style: { stroke: '#f472b6', strokeWidth: 2 },
        label: maritalStatus.statut_couple,
        labelStyle: { fontSize: 12, fill: '#f472b6' },
      });
    }

    // Membres de la famille
    familyMembers.forEach((member, index) => {
      const age = member.date_naissance
        ? new Date().getFullYear() - new Date(member.date_naissance).getFullYear()
        : null;

      // Position des enfants en bas, autres membres à droite
      const isChild = member.lien_familial === 'Enfant';
      const position = isChild 
        ? { x: 150 + (index * 120), y: 350 }
        : { x: 450, y: 100 + (index * 80) };

      nodes.push({
        id: `member-${member.id}`,
        type: 'family',
        position,
        data: {
          name: `${member.prenom || ''} ${member.nom}`.trim(),
          type: 'member',
          age: age,
          relation: member.lien_familial,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      // Connexions vers le nœud principal
      const sourceNode = isChild ? 'main' : 'main';
      edges.push({
        id: `${sourceNode}-member-${member.id}`,
        source: sourceNode,
        target: `member-${member.id}`,
        type: 'smoothstep',
        style: { 
          stroke: isChild ? '#60a5fa' : '#6b7280', 
          strokeWidth: isChild ? 2 : 1 
        },
        label: isChild ? '' : member.lien_familial,
        labelStyle: { fontSize: 10, fill: '#6b7280' },
      });
    });

    return { nodes, edges };
  }, [familyProfile, maritalStatus, familyMembers]);

  if (nodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="text-lg">👥</div>
        <p>Ajoutez des membres de famille pour voir l'arbre familial</p>
      </div>
    );
  }

  return (
    <div className="h-96 w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        style={{ backgroundColor: '#fafafa' }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          style={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb'
          }}
        />
      </ReactFlow>
    </div>
  );
}