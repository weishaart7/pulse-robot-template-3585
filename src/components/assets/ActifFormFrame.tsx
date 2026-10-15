import React from 'react';
import { Wallet } from 'lucide-react';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';

interface ActifFormFrameProps {
  title: React.ReactNode;
  /** Onglet Patrimoine parent dans le fil d'Ariane (« Actifs » par défaut, « Passifs »). */
  section?: string;
  /** Dernier maillon du fil d'Ariane (« Ajouter un actif », « Modifier l'actif »…). */
  trail?: string;
  // Zone à droite du titre (ex. libellé d'étape du wizard).
  aside?: React.ReactNode;
  /** Actions de la barre d'en-tête (Annuler, Enregistrer…). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Cadre commun aux formulaires d'actif (wizard de création, modification) et de passif : panneau de
// travail comme les pages Famille — barre d'en-tête « Patrimoine / Actifs / … » portant
// les actions, titre 24 px, puis le contenu sous un filet.
export const ActifFormFrame: React.FC<ActifFormFrameProps> = ({ title, section = 'Actifs', trail, aside, actions, children }) => (
  <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
    <WorkspaceHeader
      icon={<Wallet strokeWidth={1.75} />}
      trail={['Patrimoine', section, trail ?? (typeof title === 'string' ? title : 'Actif')]}
      actions={actions}
    />
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-8 pt-6 pb-4">
      <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{title}</h1>
      {aside}
    </div>
    <div className="border-t border-border px-8 py-6">{children}</div>
  </div>
);
