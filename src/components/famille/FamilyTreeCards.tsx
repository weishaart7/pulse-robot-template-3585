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

const LABEL_COLOR = '#8a8a86';
const TEXT_COLOR = '#1a1a1a';
const DIVIDER_COLOR = '#ececea';

function MemberCard({ node, onClick }: { node: FamilyGraphNode; onClick: () => void }) {
  const isAccent = node.isMain || node.isSpouse;
  const avatarBg = node.isMain ? '#dde8f7' : node.isSpouse ? '#f4e4fb' : '#eeece6';
  const avatarText = node.isMain ? '#17335c' : node.isSpouse ? '#5c3170' : '#8a8a86';
  const secondaryLabel = node.isMain ? 'Vous' : node.isSpouse ? 'Conjoint(e)' : node.relation;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-[10px] px-4 py-3 border hover:shadow-sm transition-shadow text-left w-[190px] shrink-0"
      style={{ borderColor: DIVIDER_COLOR }}
    >
      <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: avatarBg }}>
        <span className="text-xs font-medium" style={{ color: avatarText }}>{initialsFromFullName(node.name)}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: TEXT_COLOR }}>{node.name}</p>
        <p className="text-[12px] truncate" style={{ color: LABEL_COLOR }}>{secondaryLabel}</p>
      </div>
    </button>
  );
}

export function FamilyTreeCards({ familyProfile, maritalStatus, familyLinks, onSelectMain, onSelectSpouse, onSelectMember }: FamilyTreeCardsProps) {
  const graph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks);

  const rowsByGeneration = new Map<number, FamilyGraphNode[]>();
  graph.nodes.forEach(node => {
    if (!rowsByGeneration.has(node.generation)) rowsByGeneration.set(node.generation, []);
    rowsByGeneration.get(node.generation)!.push(node);
  });
  const generations = Array.from(rowsByGeneration.keys()).sort((a, b) => a - b);

  const handleSelect = (node: FamilyGraphNode) => {
    if (node.isMain) return onSelectMain();
    if (node.isSpouse) return onSelectSpouse();
    if (node.originalData) return onSelectMember(node.originalData);
  };

  return (
    <div className="space-y-6">
      {generations.map((generation, rowIndex) => (
        <div key={generation}>
          {rowIndex > 0 && (
            <div className="flex justify-center mb-6">
              <div className="w-px h-6" style={{ backgroundColor: DIVIDER_COLOR }} />
            </div>
          )}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {rowsByGeneration.get(generation)!.map(node => (
              <MemberCard key={node.id} node={node} onClick={() => handleSelect(node)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
