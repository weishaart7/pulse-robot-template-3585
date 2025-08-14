import { Money, MatrimonialLiquidationResult } from './types';

export function computeMatrimonialLiquidation(opts: {
  regime: 'communauté'|'séparation'|'participation'|'autre';
  actifCommun: Money; 
  passifCommun: Money;
  avantagesMatrimoniaux?: Array<{ type: 'attribution_integrale'|'preciput'|'parts_inegales'|'autre'; valeur: Money }>;
}): MatrimonialLiquidationResult {
  const notes: string[] = [];
  let demiBoniPourSuccession = 0;

  if (opts.regime === 'communauté') {
    const boniCommun = opts.actifCommun - opts.passifCommun;
    demiBoniPourSuccession = boniCommun / 2;
    notes.push(`Régime de communauté : demi-boni de ${demiBoniPourSuccession}€ intégré à la succession`);
  } else {
    notes.push(`Régime ${opts.regime} : pas d'impact sur la masse successorale`);
  }

  // Traitement des avantages matrimoniaux (exclus de la succession)
  if (opts.avantagesMatrimoniaux?.length) {
    const totalAvantages = opts.avantagesMatrimoniaux.reduce((sum, av) => sum + av.valeur, 0);
    notes.push(`Avantages matrimoniaux exclus : ${totalAvantages}€`);
  }

  return {
    demiBoniPourSuccession: Math.round(demiBoniPourSuccession),
    notes
  };
}