// Logique pure de lecture/écriture de marital_status.statut_couple, partagée par
// FamilleSection.tsx et PartnerForm.tsx (points d'écriture concurrents avant
// centralisation ; FicheClientForm.tsx en écrivait un 3e jusqu'au retrait de son
// champ "Statut matrimonial", devenu redondant avec le menu de FamilleSection.tsx)
// via useMaritalStatus().setStatutCouple().

const STATUTS_EN_COUPLE = ['Marié(e)', 'Pacsé(e)', 'Concubinage', 'MARIE', 'PACS', 'PACSE', 'CONCUBINAGE'];

// Un conjoint n'est retenu que si le statut est « en couple » ET que son prénom est renseigné — même règle
// que useAssetForm/usePassifEmpruntForm, pour que Budget propose et affiche les mêmes personnes.
export const hasConjoint = (
  maritalStatus?: { statut_couple?: string | null; prenom_conjoint?: string | null } | null
): boolean =>
  !!maritalStatus?.prenom_conjoint && STATUTS_EN_COUPLE.includes(maritalStatus.statut_couple || '');

export const isSingleStatus = (statutCouple?: string | null): boolean =>
  statutCouple === 'Célibataire';

export const buildStatutCoupleWrite = <T extends Record<string, unknown>>(
  statutCouple: string | null,
  extra?: T
): T & { statut_couple: string | null } => ({
  ...(extra ?? ({} as T)),
  statut_couple: statutCouple,
});
