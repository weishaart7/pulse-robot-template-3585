import React from 'react';
import { FamilyLink } from '@/services/familyService';

interface FamilyTreeTimelineProps {
  familyProfile: any;
  maritalStatus: any;
  familyMembers: FamilyLink[];
}

interface TimelineEvent {
  id: string;
  name: string;
  type: 'birth' | 'death';
  date: Date;
  relation: string;
  civilite?: string;
}

export const FamilyTreeTimeline: React.FC<FamilyTreeTimelineProps> = ({
  familyProfile,
  maritalStatus,
  familyMembers,
}) => {
  const events: TimelineEvent[] = [];

  // Add user birth
  if (familyProfile?.date_naissance) {
    events.push({
      id: 'user-birth',
      name: `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous',
      type: 'birth',
      date: new Date(familyProfile.date_naissance),
      relation: 'Vous',
      civilite: familyProfile.civility,
    });
  }

  // Add partner birth
  if (maritalStatus?.date_naissance_conjoint) {
    events.push({
      id: 'partner-birth',
      name: `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)',
      type: 'birth',
      date: new Date(maritalStatus.date_naissance_conjoint),
      relation: 'Conjoint(e)',
      civilite: maritalStatus.civilite_conjoint,
    });
  }

  // Add family members
  familyMembers.forEach((member) => {
    if (member.date_naissance) {
      events.push({
        id: `${member.id}-birth`,
        name: `${member.prenom || ''} ${member.nom || ''}`.trim(),
        type: 'birth',
        date: new Date(member.date_naissance),
        relation: member.lien_familial,
        civilite: member.civilite,
      });
    }
    if (member.date_deces && member.est_decede) {
      events.push({
        id: `${member.id}-death`,
        name: `${member.prenom || ''} ${member.nom || ''}`.trim(),
        type: 'death',
        date: new Date(member.date_deces),
        relation: member.lien_familial,
        civilite: member.civilite,
      });
    }
  });

  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getColor = (civilite?: string) => {
    if (!civilite) return 'hsl(var(--primary))';
    return civilite.toLowerCase() === 'mme' ? '#e0aaff' : '#023e8a';
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Aucune date à afficher
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="relative min-w-max px-8 py-16">
        {/* Timeline line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />

        {/* Events */}
        <div className="relative flex items-center justify-start gap-16">
          {events.map((event, index) => {
            const isTop = index % 2 === 0;
            const color = getColor(event.civilite);

            return (
              <div
                key={event.id}
                className="relative flex flex-col items-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s`, minWidth: '200px' }}
              >
                {/* Content */}
                <div className={`${isTop ? 'mb-12' : 'mt-12 order-2'}`}>
                  <div
                    className="rounded-lg border-2 bg-card p-4 shadow-md transition-all hover:shadow-lg hover:scale-105"
                    style={{ borderColor: color }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {event.type === 'birth' ? (
                        <span className="text-lg">🎂</span>
                      ) : (
                        <span className="text-lg">✝️</span>
                      )}
                      <span className="font-semibold text-foreground text-sm">
                        {event.type === 'birth' ? 'Naissance' : 'Décès'}
                      </span>
                    </div>
                    <div className="text-center text-base font-bold mb-1" style={{ color }}>
                      {event.name}
                    </div>
                    <div className="text-center text-xs text-muted-foreground mb-1">
                      {event.relation}
                    </div>
                    <div className="text-center text-sm font-medium text-foreground">
                      {formatDate(event.date)}
                    </div>
                  </div>
                </div>

                {/* Center dot */}
                <div
                  className={`w-4 h-4 rounded-full border-4 border-background z-10 ${isTop ? 'order-1' : 'order-1'}`}
                  style={{ backgroundColor: color }}
                />

                {/* Vertical connector */}
                <div
                  className={`absolute w-0.5 ${isTop ? 'top-1/2 h-8' : 'bottom-1/2 h-8'}`}
                  style={{ backgroundColor: color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
