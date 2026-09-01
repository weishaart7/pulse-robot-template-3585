// Logique pure de lecture/écriture de marital_status.statut_couple, partagée par
// FamilleSection.tsx et PartnerForm.tsx (points d'écriture concurrents avant
// centralisation ; FicheClientForm.tsx en écrivait un 3e jusqu'au retrait de son
// champ "Statut matrimonial", devenu redondant avec le menu de FamilleSection.tsx)
// via useMaritalStatus().setStatutCouple().

export const isSingleStatus = (statutCouple?: string | null): boolean =>
  statutCouple === 'Célibataire';

export const buildStatutCoupleWrite = <T extends Record<string, unknown>>(
  statutCouple: string | null,
  extra?: T
): T & { statut_couple: string | null } => ({
  ...(extra ?? ({} as T)),
  statut_couple: statutCouple,
});
