// Lien entre un actif Patrimoine et une fiche du module Sociétés (assets.societe_id).
//
// Seules les natures qui représentent des titres de société (parts ou actions)
// peuvent être rattachées à une société : ce lien porte l'exonération Dutreil des
// titres (art. 787 B CGI, lib/transmission), le régime IR / IS des parts de SCI
// (assetFiscalRegime.ts) et la synchronisation de qualification société → actif
// (societeService.ts). Un compte courant d'associé (créance, pas un titre), une
// entreprise individuelle (Dutreil art. 787 C, autre régime) ou d'« autres biens
// professionnels » n'en relèvent pas.
//
// Le lien se fait à la main (liste « Société liée » de l'AssetForm) vers une
// société existante, ou à la création d'une société avec « Transférer vers la
// liste d'actifs » : aucune société n'est créée automatiquement depuis un actif.

export const NATURES_PARTS_SOCIETE: string[] = [
  'Droits sociaux',
  'Parts de holding',
  'Parts de SCI',
];

export const isPartsSocieteNature = (nature?: string | null): boolean =>
  !!nature && NATURES_PARTS_SOCIETE.includes(nature);

/**
 * Nature de l'actif créé depuis une fiche société. Une entreprise individuelle
 * (ou micro-entreprise) n'a pas de titres : son actif n'est pas une nature
 * « parts » et n'est donc pas rattaché à la fiche (cf. isPartsSocieteNature).
 */
export const natureActifPourSociete = (societe: {
  type_societe?: string | null;
  forme_societe_civile?: string | null;
  holding?: string | null;
}): string => {
  if (['entreprise-individuelle', 'micro-entrepreneur'].includes(societe.type_societe || '')) {
    return 'Entreprise individuelle';
  }
  if (societe.holding === 'Animatrice' || societe.holding === 'Passive') return 'Parts de holding';
  if (
    societe.type_societe === 'societe-civile'
    && ['sci', 'sci-familiale'].includes(societe.forme_societe_civile || '')
  ) {
    return 'Parts de SCI';
  }
  return 'Droits sociaux';
};
