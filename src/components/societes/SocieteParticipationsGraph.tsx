import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Societe } from '@/services/societeService';
import { SocieteParticipation } from '@/services/societeParticipationService';
import { buildSocieteParticipationGraph, SocieteParticipationGraphNode } from '@/lib/societes/buildSocieteParticipationGraph';

interface SocieteParticipationsGraphProps {
  societes: Societe[];
  participations: SocieteParticipation[];
  onSelectSociete: (societeId: string) => void;
  onDeleteSociete: (societeId: string) => void;
}

interface SocieteNodeData extends SocieteParticipationGraphNode {
  onDelete: (societeId: string) => void;
}

const SocieteNode = ({ data }: { data: SocieteNodeData }) => {
  return (
    <div
      className={`group relative px-4 py-3 rounded-[5px] border-2 min-w-[160px] text-center shadow-sm cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md bg-background ${
        data.depasse100 ? 'border-destructive' : 'border-primary/40'
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => { e.stopPropagation(); data.onDelete(data.id); }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      <div className="flex items-center justify-center gap-1.5">
        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-medium text-sm truncate">{data.denomination}</span>
        {data.depasse100 && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{data.typeSociete?.toUpperCase()}</div>
      {data.depasse100 && (
        <div className="text-xs text-destructive mt-1">
          {data.pourcentageEntrantDirect.toFixed(1)}% détenu au total
        </div>
      )}
    </div>
  );
};

const nodeTypes = { societe: SocieteNode };

export const SocieteParticipationsGraph = ({ societes, participations, onSelectSociete, onDeleteSociete }: SocieteParticipationsGraphProps) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const graph = buildSocieteParticipationGraph(societes, participations);

    const parProfondeur = graph.nodes.reduce((acc, node) => {
      if (!acc[node.depth]) acc[node.depth] = [];
      acc[node.depth].push(node);
      return acc;
    }, {} as Record<number, SocieteParticipationGraphNode[]>);

    const nodeWidth = 220;
    const levelHeight = 150;

    const nodes: Node[] = [];
    Object.entries(parProfondeur).forEach(([depthStr, nodesAtDepth]) => {
      const depth = Number(depthStr);
      const totalWidth = nodesAtDepth.length * nodeWidth;
      const startX = -totalWidth / 2 + nodeWidth / 2;

      nodesAtDepth.forEach((node, index) => {
        const nodeData: SocieteNodeData = { ...node, onDelete: onDeleteSociete };
        nodes.push({
          id: node.id,
          type: 'societe',
          position: { x: startX + index * nodeWidth, y: depth * levelHeight },
          data: nodeData as unknown as Record<string, unknown>,
        });
      });
    });

    const edges: Edge[] = graph.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: `${edge.pourcentage}%`,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      labelStyle: { fontSize: 12, fontWeight: 500 },
      markerEnd: { type: 'arrowclosed' as const, color: '#3b82f6' },
    }));

    return { nodes, edges };
  }, [societes, participations, onDeleteSociete]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // useNodesState/useEdgesState ne retiennent l'initializer qu'au montage : les
  // sociétés et participations arrivent de façon asynchrone (hooks séparés), donc
  // il faut resynchroniser explicitement quand les données chargent après coup.
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    onSelectSociete(node.id);
  }, [onSelectSociete]);

  if (societes.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground">Commencez par ajouter votre première société pour suivre vos participations.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-background rounded-[5px] border">
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
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
