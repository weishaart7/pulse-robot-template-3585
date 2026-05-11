// Mapping des actifs Patrimoine éligibles à un transfert vers la section Sociétés
// et conversion de leur nature en type de société.

export const SOCIETE_ELIGIBLE_NATURES: string[] = [
  // Actifs professionnels
  'Droits sociaux',
  'Autres droits sociaux',
  'Entreprise individuelle',
  'Parts de holding',
  'Compte courant d\'associé',
  'Autres biens professionnels',
  // Parts de SCI
  'Parts de SCI',
];

export const isSocieteEligibleNature = (nature?: string): boolean =>
  !!nature && SOCIETE_ELIGIBLE_NATURES.includes(nature);

/**
 * Convertit la nature d'un actif en `type_societe` utilisé par la table `societes`.
 * Reprend les codes utilisés dans SocieteForm.tsx.
 */
export const natureToTypeSociete = (nature: string): string => {
  switch (nature) {
    case 'Parts de SCI':
      return 'societe-civile';
    case 'Entreprise individuelle':
      return 'entreprise-individuelle';
    case 'Parts de holding':
      return 'sas';
    case 'Droits sociaux':
    case 'Autres droits sociaux':
    case 'Compte courant d\'associé':
    case 'Autres biens professionnels':
    default:
      return 'sas';
  }
};
