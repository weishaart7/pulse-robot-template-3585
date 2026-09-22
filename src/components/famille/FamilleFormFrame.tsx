import React from 'react';

interface FamilleFormFrameProps {
  title: React.ReactNode;
  // Zone à droite du titre (ex. sous-titre, statut).
  aside?: React.ReactNode;
  children: React.ReactNode;
}

// Cadre commun aux pages et formulaires du module Famille, sur le modèle de
// ActifFormFrame (module Actifs) : une carte blanche très arrondie, cerclée
// d'un filet, avec le halo de la landing page. Le scope `.famille-form`
// (index.css) porte les variables de couleur.
export const FamilleFormFrame: React.FC<FamilleFormFrameProps> = ({ title, aside, children }) => (
  <div
    className="famille-form rounded-[22px] bg-white p-5 sm:p-8"
    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 0 0 5px #f7f7f7' }}
  >
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h2 className="ff-display text-[28px] sm:text-[34px]">{title}</h2>
      {aside}
    </div>
    {children}
  </div>
);
