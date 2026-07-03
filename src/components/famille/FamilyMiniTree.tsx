import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { buildFamilyGraph, FamilyGraphNode } from '@/lib/family/buildFamilyGraph';

interface FamilyMiniTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyLinks: FamilyLink[];
  onClick: () => void;
}

export const getInitials = (prenom?: string, nom?: string) => {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
};

const initialsFromFullName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.charAt(0) || '';
  const b = parts[1]?.charAt(0) || '';
  return (a + b).toUpperCase() || '?';
};

const MAX_NODES_PER_ROW = 5;
const WIDTH = 280;
const ROW_HEIGHT = 54;
const TOP_PADDING = 24;

export function FamilyMiniTree({ familyProfile, maritalStatus, familyLinks, onClick }: FamilyMiniTreeProps) {
  const graph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks);

  // Groupe les nœuds par génération (ascendants négatifs, descendants positifs),
  // même logique que l'arbre complet (buildFamilyGraph) — une ligne horizontale par génération.
  const rowsByGeneration = new Map<number, FamilyGraphNode[]>();
  graph.nodes.forEach(node => {
    if (!rowsByGeneration.has(node.generation)) rowsByGeneration.set(node.generation, []);
    rowsByGeneration.get(node.generation)!.push(node);
  });

  const generations = Array.from(rowsByGeneration.keys()).sort((a, b) => a - b);
  const height = TOP_PADDING * 2 + Math.max(generations.length - 1, 0) * ROW_HEIGHT;
  const trunkX = WIDTH / 2;

  const rowY = (generationIndex: number) => TOP_PADDING + generationIndex * ROW_HEIGHT;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-full flex items-center justify-center rounded-lg hover:bg-black/[0.02] transition-colors"
      aria-label="Ouvrir l'arbre familial complet"
    >
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" height={height} style={{ maxWidth: 320 }}>
        {generations.length > 1 && (
          <line x1={trunkX} y1={rowY(0)} x2={trunkX} y2={rowY(generations.length - 1)} stroke="#e2e0da" strokeWidth={1} />
        )}

        {generations.map((generation, rowIndex) => {
          const rowNodes = rowsByGeneration.get(generation)!;
          const hasOverflow = rowNodes.length > MAX_NODES_PER_ROW;
          const visibleNodes = hasOverflow ? rowNodes.slice(0, MAX_NODES_PER_ROW - 1) : rowNodes;
          const overflowCount = rowNodes.length - visibleNodes.length;
          const slotCount = visibleNodes.length + (overflowCount > 0 ? 1 : 0);
          const spacing = WIDTH / (slotCount + 1);
          const y = rowY(rowIndex);

          return (
            <g key={generation}>
              {visibleNodes.map((node, i) => {
                const x = spacing * (i + 1);
                const isAccent = node.isMain || node.isSpouse;
                const radius = isAccent ? 16 : 12;
                const fill = node.isMain ? '#dde8f7' : node.isSpouse ? '#f4e4fb' : '#eeece6';
                const stroke = node.isMain ? '#c7d8ef' : node.isSpouse ? '#e9d3f5' : '#dcdad3';
                const textColor = node.isMain ? '#17335c' : node.isSpouse ? '#5c3170' : '#8a8a86';

                return (
                  <g key={node.id}>
                    {generation !== 0 && (
                      <line x1={x} y1={y} x2={trunkX} y2={y} stroke="#e2e0da" strokeWidth={1} />
                    )}
                    <circle cx={x} cy={y} r={radius} fill={fill} stroke={stroke} strokeWidth={1} />
                    <text
                      x={x}
                      y={y + (isAccent ? 4 : 3)}
                      textAnchor="middle"
                      fontSize={isAccent ? 10 : 9}
                      fill={textColor}
                      fontFamily="Inter, sans-serif"
                      fontWeight={isAccent ? 500 : 400}
                    >
                      {initialsFromFullName(node.name)}
                    </text>
                  </g>
                );
              })}

              {overflowCount > 0 && (
                <g>
                  <line
                    x1={spacing * slotCount}
                    y1={y}
                    x2={trunkX}
                    y2={y}
                    stroke="#e2e0da"
                    strokeWidth={1}
                  />
                  <circle cx={spacing * slotCount} cy={y} r={12} fill="#eeece6" stroke="#dcdad3" strokeWidth={1} />
                  <text
                    x={spacing * slotCount}
                    y={y + 3}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#8a8a86"
                    fontFamily="Inter, sans-serif"
                  >
                    +{overflowCount}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </button>
  );
}
