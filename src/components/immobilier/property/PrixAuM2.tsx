import React from 'react';

const euros = (n: number) => `${n.toLocaleString('fr-FR')} €/m²`;

/** Prix au m² sous le champ Surface : à l'achat et à la valeur estimée, quand ils sont calculables. */
export const PrixAuM2: React.FC<{ achat: number | null; estime: number | null }> = ({ achat, estime }) => {
  if (achat === null && estime === null) return null;
  return (
    <p className="text-[12px] tabular-nums text-muted-foreground">
      {estime !== null && <>Prix au m² : <span className="font-medium text-foreground">{euros(estime)}</span></>}
      {estime !== null && achat !== null && ' · '}
      {achat !== null && <>à l'achat {euros(achat)}</>}
    </p>
  );
};
