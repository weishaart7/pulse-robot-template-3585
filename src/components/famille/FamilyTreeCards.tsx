import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { buildFamilyGraph, FamilyGraphNode } from '@/lib/family/buildFamilyGraph';
import { initialsFromFullName } from '@/lib/family/initials';

interface FamilyTreeCardsProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyLinks: FamilyLink[];
  onSelectMain: () => void;
  onSelectSpouse: () => void;
  onSelectMember: (member: FamilyLink) => void;
}

const CARD_BG = '#F8F8F8';
const CARD_BG_MAIN = '#F9FDEE';
const AVATAR_BG = '#ece9df';
const AVATAR_BG_MAIN = '#C2F84E';
const TEXT_COLOR = '#1F3A4B';
const ROLE_COLOR = '#a4a299';
const ROLE_COLOR_MAIN = '#5b6320';
const GENERATION_LABEL_COLOR = '#b3b1a7';
const GENERATION_LABEL_COLOR_MAIN = '#5b6320';
const CONNECTOR_COLOR = '#cbc8bc';
const MONO_FONT = "'JetBrains Mono', monospace";

const GENERATION_NAMES: Record<number, string> = {
  '-3': 'Arrière grands-parents',
  '-2': 'Grands-parents',
  '-1': 'Parents',
  0: 'Votre foyer',
  1: 'Enfants',
  2: 'Petits-enfants',
  3: 'Arrière petits-enfants',
} as unknown as Record<number, string>;

function generationLabel(generation: number, columnIndex: number) {
  const name = GENERATION_NAMES[generation] ?? `Génération ${generation}`;
  return `${String(columnIndex + 1).padStart(2, '0')} · ${name}`;
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
      className="flex items-center gap-3 rounded-[4px] px-3 h-[54px] w-[210px] shrink-0 text-left transition-shadow shadow-[0_1px_2px_rgba(30,29,25,0.05)] hover:shadow-[0_3px_10px_rgba(30,29,25,0.1)]"
      style={{ backgroundColor: isMe ? CARD_BG_MAIN : CARD_BG }}
    >
      <div
        className="h-8 w-8 rounded-[3px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: isMe ? AVATAR_BG_MAIN : AVATAR_BG }}
      >
        <span className="text-[11.5px] font-semibold" style={{ color: TEXT_COLOR }}>
          {initialsFromFullName(node.name)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: TEXT_COLOR }}>
          {node.name}
        </p>
        <p
          className="text-[9.5px] uppercase tracking-[0.08em] truncate mt-0.5"
          style={{ color: isMe ? ROLE_COLOR_MAIN : ROLE_COLOR, fontFamily: MONO_FONT }}
        >
          {secondaryLabel}
        </p>
      </div>
    </button>
  );
}

export function FamilyTreeCards({ familyProfile, maritalStatus, familyLinks, onSelectMain, onSelectSpouse, onSelectMember }: FamilyTreeCardsProps) {
  const graph = useMemo(
    () => buildFamilyGraph(familyProfile, maritalStatus, familyLinks),
    [familyProfile, maritalStatus, familyLinks]
  );

  const columnsByGeneration = new Map<number, FamilyGraphNode[]>();
  graph.nodes.forEach(node => {
    if (!columnsByGeneration.has(node.generation)) columnsByGeneration.set(node.generation, []);
    columnsByGeneration.get(node.generation)!.push(node);
  });
  const generations = Array.from(columnsByGeneration.keys()).sort((a, b) => a - b);

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
        if (!source || !target || source.generation === target.generation) return null;

        const sourceEl = cardEls.current.get(edge.source);
        const targetEl = cardEls.current.get(edge.target);
        if (!sourceEl || !targetEl) return null;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const x1 = sourceRect.right - containerRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const x2 = targetRect.left - containerRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;
        const midX = (x1 + x2) / 2;

        return { id: edge.id, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` };
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
    <div ref={containerRef} className="relative flex items-start gap-10 overflow-x-auto py-1">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {connectors.map(connector => (
          <path key={connector.id} d={connector.d} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={1.5} />
        ))}
      </svg>

      {generations.map((generation, columnIndex) => (
        <div key={generation} className="relative flex flex-col gap-5 shrink-0" style={{ width: 250 }}>
          <div
            className="text-[9.5px] uppercase tracking-[0.1em]"
            style={{
              color: generation === 0 ? GENERATION_LABEL_COLOR_MAIN : GENERATION_LABEL_COLOR,
              fontFamily: MONO_FONT,
            }}
          >
            {generationLabel(generation, columnIndex)}
          </div>
          {columnsByGeneration.get(generation)!.map(node => (
            <MemberCard key={node.id} node={node} onClick={() => handleSelect(node)} cardRef={getCardRef(node.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
