import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { buildFamilyGraph, FamilyGraphNode } from '@/lib/family/buildFamilyGraph';
import { initialsFromFullName } from '@/lib/family/initials';
import { cn } from '@/lib/utils';

interface FamilyTreeCardsProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyLinks: FamilyLink[];
  onSelectMain: () => void;
  onSelectSpouse: () => void;
  onSelectMember: (member: FamilyLink) => void;
  onAddMember: () => void;
}

const CONNECTOR_COLOR = '#E5E5E3';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const GENERATION_NAMES: Record<number, string> = {
  '-3': 'Arrière grands-parents',
  '-2': 'Grands-parents',
  '-1': 'Parents',
  0: 'Vous',
  1: 'Enfants',
  2: 'Petits-enfants',
  3: 'Arrière petits-enfants',
} as unknown as Record<number, string>;

function generationLabel(generation: number, rowIndex: number) {
  const name = GENERATION_NAMES[generation] ?? `Génération ${generation}`;
  return `${String(rowIndex + 1).padStart(2, '0')} · ${name}`;
}

// Place le client et son conjoint au centre de la génération 0, la fratrie répartie de part et d'autre.
function orderGenerationZero(members: FamilyGraphNode[]) {
  const main = members.find(m => m.isMain);
  const spouse = members.find(m => m.isSpouse);
  const others = members.filter(m => !m.isMain && !m.isSpouse);
  const half = Math.ceil(others.length / 2);
  const core = [main, spouse].filter((m): m is FamilyGraphNode => !!m);
  return [...others.slice(0, half), ...core, ...others.slice(half)];
}

function MemberCard({
  node,
  onClick,
  cardRef,
}: {
  node: FamilyGraphNode;
  onClick: () => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  const isMe = !!node.isMain;
  const secondaryLabel = node.isMain ? 'Vous' : node.isSpouse ? 'Conjoint(e)' : node.relation;

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 h-[54px] w-[210px] shrink-0 text-left transition-shadow duration-200 shadow-sm hover:shadow-md",
        isMe ? "bg-primary/5 border-primary/20" : "bg-card border-border",
        FOCUS_RING
      )}
    >
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
          isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        <span className="text-[11px] font-semibold">
          {initialsFromFullName(node.name)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold truncate text-foreground">
          {node.name}
        </p>
        <p className="text-[11px] uppercase tracking-wide truncate mt-0.5 text-muted-foreground">
          {secondaryLabel}
        </p>
      </div>
    </button>
  );
}

function AddMemberCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ajouter un membre de la famille"
      className={cn(
        "flex items-center justify-center gap-2 rounded-md px-3 h-[54px] w-[210px] shrink-0 border border-dashed border-border text-muted-foreground transition-colors duration-200 hover:bg-muted/50",
        FOCUS_RING
      )}
    >
      <Plus className="h-4 w-4" />
      <span className="text-[13px] font-medium">Ajouter</span>
    </button>
  );
}

export function FamilyTreeCards({ familyProfile, maritalStatus, familyLinks, onSelectMain, onSelectSpouse, onSelectMember, onAddMember }: FamilyTreeCardsProps) {
  const graph = useMemo(
    () => buildFamilyGraph(familyProfile, maritalStatus, familyLinks),
    [familyProfile, maritalStatus, familyLinks]
  );

  const rowsByGeneration = new Map<number, FamilyGraphNode[]>();
  graph.nodes.forEach(node => {
    if (!rowsByGeneration.has(node.generation)) rowsByGeneration.set(node.generation, []);
    rowsByGeneration.get(node.generation)!.push(node);
  });
  rowsByGeneration.forEach((members, generation) => {
    if (generation === 0) rowsByGeneration.set(generation, orderGenerationZero(members));
  });
  const generations = Array.from(rowsByGeneration.keys()).sort((a, b) => a - b);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const cardRefSetters = useRef(new Map<string, (el: HTMLButtonElement | null) => void>());
  const [connectors, setConnectors] = useState<{ id: string; d: string }[]>([]);

  const getCardRef = useCallback((id: string) => {
    if (!cardRefSetters.current.has(id)) {
      cardRefSetters.current.set(id, (el: HTMLButtonElement | null) => {
        if (el) cardEls.current.set(id, el);
        else cardEls.current.delete(id);
      });
    }
    return cardRefSetters.current.get(id)!;
  }, []);

  const measureConnectors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const next = graph.edges
      .map(edge => {
        const source = graph.nodes.find(n => n.id === edge.source);
        const target = graph.nodes.find(n => n.id === edge.target);
        if (!source || !target) return null;

        const sourceEl = cardEls.current.get(edge.source);
        const targetEl = cardEls.current.get(edge.target);
        if (!sourceEl || !targetEl) return null;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        if (source.generation === target.generation) {
          // Même génération (ex. client ↔ conjoint) : lien horizontal direct.
          const leftRect = sourceRect.left <= targetRect.left ? sourceRect : targetRect;
          const rightRect = sourceRect.left <= targetRect.left ? targetRect : sourceRect;
          const x1 = leftRect.right - containerRect.left;
          const x2 = rightRect.left - containerRect.left;
          const y = leftRect.top + leftRect.height / 2 - containerRect.top;
          return { id: edge.id, d: `M ${x1} ${y} H ${x2}` };
        }

        // Générations différentes : lien vertical, avec coude horizontal si les cartes ne sont pas alignées.
        const upperRect = source.generation < target.generation ? sourceRect : targetRect;
        const lowerRect = source.generation < target.generation ? targetRect : sourceRect;
        const x1 = upperRect.left + upperRect.width / 2 - containerRect.left;
        const y1 = upperRect.bottom - containerRect.top;
        const x2 = lowerRect.left + lowerRect.width / 2 - containerRect.left;
        const y2 = lowerRect.top - containerRect.top;
        const midY = (y1 + y2) / 2;

        return { id: edge.id, d: `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}` };
      })
      .filter((c): c is { id: string; d: string } => c !== null);

    setConnectors(next);
  }, [graph.edges, graph.nodes]);

  useLayoutEffect(() => {
    measureConnectors();
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => measureConnectors());
    resizeObserver.observe(container);
    window.addEventListener('resize', measureConnectors);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureConnectors);
    };
  }, [measureConnectors]);

  const handleSelect = (node: FamilyGraphNode) => {
    if (node.isMain) return onSelectMain();
    if (node.isSpouse) return onSelectSpouse();
    if (node.originalData) return onSelectMember(node.originalData);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6 py-1">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {connectors.map(connector => (
          <path key={connector.id} d={connector.d} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={1.5} />
        ))}
      </svg>

      {generations.map((generation, rowIndex) => (
        <div key={generation} className="relative flex items-center gap-4">
          <div
            className={cn(
              "w-24 shrink-0 text-right text-[11px] uppercase tracking-wide leading-tight",
              generation === 0 ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {generationLabel(generation, rowIndex)}
          </div>
          <div className="flex-1 flex flex-nowrap items-center gap-4 overflow-x-auto pb-1">
            {rowsByGeneration.get(generation)!.map(node => (
              <MemberCard key={node.id} node={node} onClick={() => handleSelect(node)} cardRef={getCardRef(node.id)} />
            ))}
            {generation === 0 && <AddMemberCard onClick={onAddMember} />}
          </div>
        </div>
      ))}
    </div>
  );
}
