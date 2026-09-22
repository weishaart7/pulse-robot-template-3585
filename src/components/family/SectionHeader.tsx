import type { ComponentType } from 'react';

interface SectionHeaderProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
}

// En-tête de section partagé (badge icône + titre uppercase) — même format
// que FicheClientForm, réutilisé dans les formulaires famille/régime
// matrimonial pour une apparence cohérente. Encre alignée sur le langage
// visuel de la landing page (cf. .famille-form / .actifs-form).
export function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d1b1e]/10">
        <Icon className="h-4 w-4 text-[#0d1b1e]" strokeWidth={1.75} />
      </span>
      <h3
        className="text-[0.6875rem] uppercase tracking-[0.08em] text-[#0d1b1e]"
        style={{ fontFamily: "'Roboto Mono', ui-monospace, monospace" }}
      >
        {title}
      </h3>
    </div>
  );
}
