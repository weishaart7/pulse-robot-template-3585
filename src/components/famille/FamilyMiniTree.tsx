import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';

interface FamilyMiniTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyLinks: FamilyLink[];
  hasPartner: boolean;
  onClick: () => void;
}

export const getInitials = (prenom?: string, nom?: string) => {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
};

const initials = getInitials;

export function FamilyMiniTree({ familyProfile, maritalStatus, familyLinks, hasPartner, onClick }: FamilyMiniTreeProps) {
  const grandsParents = familyLinks.filter(l => l.lien_familial === 'Grand-parent').slice(0, 4);
  const enfants = familyLinks.filter(l => l.lien_familial === 'Enfant').slice(0, 5);

  const clientInitials = initials(familyProfile?.prenom, familyProfile?.nom) || 'V';
  const partnerInitials = hasPartner ? initials(maritalStatus?.prenom_conjoint, maritalStatus?.nom_conjoint) : '';

  const width = 280;
  const gpY = 26;
  const coupleY = 90;
  const childY = 154;

  const gpSpacing = grandsParents.length > 0 ? width / (grandsParents.length + 1) : 0;
  const childSpacing = enfants.length > 0 ? width / (enfants.length + 1) : 0;

  const coupleXClient = hasPartner ? width / 2 - 30 : width / 2;
  const coupleXPartner = width / 2 + 30;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-full flex items-center justify-center rounded-lg hover:bg-black/[0.02] transition-colors"
      aria-label="Ouvrir l'arbre familial complet"
    >
      <svg viewBox={`0 0 ${width} 180`} width="100%" height="180" style={{ maxWidth: 320 }}>
        {grandsParents.map((gp, i) => {
          const x = gpSpacing * (i + 1);
          return (
            <g key={gp.id || i}>
              <line x1={x} y1={gpY + 12} x2={width / 2} y2={coupleY - 14} stroke="#e2e0da" strokeWidth={1} />
              <circle cx={x} cy={gpY} r={12} fill="#eeece6" stroke="#dcdad3" strokeWidth={1} />
              <text x={x} y={gpY + 4} textAnchor="middle" fontSize="9" fill="#8a8a86" fontFamily="Inter, sans-serif">
                {initials(gp.prenom, gp.nom)}
              </text>
            </g>
          );
        })}

        <line x1={width / 2} y1={coupleY + 16} x2={width / 2} y2={childY - 16} stroke="#e2e0da" strokeWidth={1} />

        <circle cx={coupleXClient} cy={coupleY} r={16} fill="#dde8f7" stroke="#c7d8ef" strokeWidth={1} />
        <text x={coupleXClient} y={coupleY + 4} textAnchor="middle" fontSize="10" fill="#17335c" fontFamily="Inter, sans-serif" fontWeight={500}>
          {clientInitials}
        </text>

        {hasPartner && (
          <>
            <line x1={coupleXClient + 16} y1={coupleY} x2={coupleXPartner - 16} y2={coupleY} stroke="#e2e0da" strokeWidth={1} />
            <circle cx={coupleXPartner} cy={coupleY} r={16} fill="#f4e4fb" stroke="#e9d3f5" strokeWidth={1} />
            <text x={coupleXPartner} y={coupleY + 4} textAnchor="middle" fontSize="10" fill="#5c3170" fontFamily="Inter, sans-serif" fontWeight={500}>
              {partnerInitials}
            </text>
          </>
        )}

        {enfants.map((enfant, i) => {
          const x = childSpacing * (i + 1);
          return (
            <g key={enfant.id || i}>
              <line x1={width / 2} y1={childY - 14} x2={x} y2={childY - 12} stroke="#e2e0da" strokeWidth={1} />
              <circle cx={x} cy={childY} r={12} fill="#eeece6" stroke="#dcdad3" strokeWidth={1} />
              <text x={x} y={childY + 4} textAnchor="middle" fontSize="9" fill="#8a8a86" fontFamily="Inter, sans-serif">
                {initials(enfant.prenom, enfant.nom)}
              </text>
            </g>
          );
        })}
      </svg>
    </button>
  );
}
