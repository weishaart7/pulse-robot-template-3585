import React from 'react';

interface FamilleFormFrameProps {
  title: React.ReactNode;
  // Zone à droite du titre (ex. sous-titre, statut).
  aside?: React.ReactNode;
  children: React.ReactNode;
}

// Cadre commun aux formulaires du module Famille :
// grande carte eggshell coins 24 px cerclée d'un filet, titre Inter 300 (docs/design-system.md).
export const FamilleFormFrame: React.FC<FamilleFormFrameProps> = ({ title, aside, children }) => (
  <div
    className="rounded-3xl border border-border bg-card p-5 sm:p-8"
  >
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h2 className="ds-display text-[28px] sm:text-[34px]">{title}</h2>
      {aside}
    </div>
    {children}
  </div>
);
