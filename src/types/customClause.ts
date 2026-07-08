export const CUSTOM_CLAUSE_TAGS = [
  'Bien professionnel',
  'Attribution préférentielle',
  'Indemnité/décote',
  'Condition suspensive',
  'Dérogation à la réserve héréditaire',
  'Affecte des parts de société ou titres professionnels',
  "Affecte un contrat d'assurance-vie",
  'Affecte un bien immobilier précis',
  "Exclusion d'un bien de la communauté",
  'Clause de reprise des apports en cas de divorce',
  'Condition liée à la présence d\'enfants (communs ou non communs)',
] as const;

export type CustomClauseTag = typeof CUSTOM_CLAUSE_TAGS[number];

export interface ClausePersonnalisee {
  id: string;
  texte: string;
  tags: CustomClauseTag[];
  biensVises: string[];
  beneficiaire?: string;
  parametres: string[];
}
