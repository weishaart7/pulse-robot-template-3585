import React from 'react';
import { Personne } from '@/hooks/useRetraiteData';

interface ColonnesPersonnesProps {
  // Détection "il y a un conjoint" décidée par l'appelant (RetraiteSection.tsx,
  // via checkIsInCouple(maritalStatus.statut_couple)) — ce composant ne fait
  // que la mise en page, pas la règle métier.
  hasConjoint: boolean;
  nomUtilisateur: string;
  nomConjoint: string;
  // Render-prop plutôt que deux enfants distincts : le même composant
  // (Carriere / EpargneRetraite / Trimestres) est instancié deux fois avec
  // seulement `personne` qui change — évite de dupliquer le JSX appelant.
  render: (personne: Personne) => React.ReactNode;
}

// Repères carrés lagon (client) / citron (conjoint), comme la Composition du Foyer (Famille).
const EnTetePersonne = ({ nom, role, markClassName }: { nom: string; role: string; markClassName: string }) => (
  <div className="flex h-11 items-center gap-2 border-b border-border bg-secondary/40 px-8 text-[13px]">
    <span aria-hidden className={`h-2.5 w-2.5 rounded-[2px] ${markClassName}`} />
    <span className="font-medium text-foreground">{nom}</span>
    <span className="text-muted-foreground">· {role}</span>
  </div>
);

/**
 * Deux colonnes indépendantes (utilisateur / conjoint) pour un onglet du
 * module Retraite, séparées par un filet (panneau de travail). Sans conjoint
 * identifié dans Famille (marié, pacsé ou concubin — cf. checkIsInCouple),
 * affiche une seule colonne pleine largeur.
 *
 * Empilé en dessous de `xl` (1280px) plutôt que `lg` (1024px) : Carriere.tsx/
 * Trimestres.tsx utilisent déjà des grilles internes `md:grid-cols-2/3`
 * (768px) — passer en 2 colonnes de page dès `lg` ferait se battre ces
 * grilles internes dans une colonne trop étroite entre 1024 et 1280px.
 */
export const ColonnesPersonnes = ({
  hasConjoint,
  nomUtilisateur,
  nomConjoint,
  render,
}: ColonnesPersonnesProps) => {
  if (!hasConjoint) {
    return <>{render('utilisateur')}</>;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 xl:divide-x xl:divide-border">
      <div className="min-w-0">
        <EnTetePersonne nom={nomUtilisateur} role="Client" markClassName="bg-lagon" />
        {render('utilisateur')}
      </div>
      <div className="min-w-0 border-t border-border xl:border-t-0">
        <EnTetePersonne nom={nomConjoint} role="Conjoint" markClassName="bg-citron" />
        {render('conjoint')}
      </div>
    </div>
  );
};
