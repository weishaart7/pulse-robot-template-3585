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

/**
 * Deux colonnes indépendantes (utilisateur / conjoint) pour un onglet du
 * module Retraite. Sans conjoint identifié dans Famille (marié, pacsé ou
 * concubin — cf. checkIsInCouple), affiche une seule colonne, strictement
 * identique à l'écran utilisateur seul d'avant cette fonctionnalité.
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{nomUtilisateur}</h3>
        {render('utilisateur')}
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{nomConjoint}</h3>
        {render('conjoint')}
      </div>
    </div>
  );
};
