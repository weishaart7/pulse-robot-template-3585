// Types for the matrimonial regime itself (clauses retirées pour la V1,
// cf. docs/regimes-matrimoniaux-clauses-v1-retire.md pour la reconstruction).

export type RegimeType =
  | 'communaute_reduite'
  | 'communaute_meubles'
  | 'communaute_universelle'
  | 'separation_biens'
  | 'participation_acquets'
  | 'separation_societe_acquets';

export interface DonationDernierVivant {
  enFaveurUtilisateur: boolean;
  enFaveurConjoint: boolean;
  dateUtilisateur?: string;
  dateConjoint?: string;
}

// Helper pour mapper le type de régime vers la forme simplifiée
export function getSimplifiedRegime(regimeType: RegimeType | string): 'communauté' | 'séparation' | 'participation' | 'autre' {
  if (regimeType.includes('communaute')) return 'communauté';
  if (regimeType.includes('separation')) return 'séparation';
  if (regimeType.includes('participation')) return 'participation';
  return 'autre';
}

// Régime matrimonial (libellé humain, cf. RelationInfoForm.tsx::formSchema)
// → RegimeType simplifié.
export function toRegimeType(regimeMatrimonial: string | undefined): RegimeType {
  switch (regimeMatrimonial) {
    case 'Communauté réduite aux acquêts':
      return 'communaute_reduite';
    case "Communauté de meubles et d'acquêts":
      return 'communaute_meubles';
    case 'Communauté universelle':
      return 'communaute_universelle';
    case 'Séparation de biens':
      return 'separation_biens';
    case "Séparation de biens avec société d'acquêts":
      return 'separation_societe_acquets';
    case 'Participation aux acquêts':
      return 'participation_acquets';
    default:
      return 'communaute_reduite';
  }
}
