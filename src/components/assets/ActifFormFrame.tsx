import React from 'react';

interface ActifFormFrameProps {
  title: React.ReactNode;
  // Zone à droite du titre (ex. libellé d'étape du wizard).
  aside?: React.ReactNode;
  children: React.ReactNode;
}

// Cadre commun au wizard de création et au formulaire de modification d'un
// actif, sur le modèle de la carte du hero de la landing page : une carte
// blanche très arrondie, cerclée d'un filet (sans le fond "mesh" du hero).
// Le scope `.actifs-form` (index.css) porte les variables de couleur.
export const ActifFormFrame: React.FC<ActifFormFrameProps> = ({ title, aside, children }) => (
  <div
    className="actifs-form rounded-[22px] bg-white p-5 sm:p-8"
    style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.06), 0 0 0 5px #f7f7f7' }}
  >
    <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
      <h2 className="af-display text-[28px] sm:text-[34px]">{title}</h2>
      {aside}
    </div>
    {children}
  </div>
);
