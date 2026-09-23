import type { ComponentType } from 'react';

interface SectionHeaderProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
}

// En-tête de section partagé (badge icône + titre uppercase) — même format
// que FicheClientForm, réutilisé dans les formulaires famille/régime
// matrimonial pour une apparence cohérente. Libellé en surtitre mono
// (.ds-eyebrow, cf. docs/design-system.md).
export function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
      </span>
      <h3 className="ds-eyebrow text-foreground">
        {title}
      </h3>
    </div>
  );
}
