// Logique pure de lecture/écriture de marital_status.statut_couple, partagée par
// FamilleSection.tsx, FicheClientForm.tsx et PartnerForm.tsx (3 points d'écriture
// concurrents avant centralisation) via useMaritalStatus().setStatutCouple().

export const isSingleStatus = (statutCouple?: string | null): boolean =>
  statutCouple === 'Célibataire';

export const buildStatutCoupleWrite = <T extends Record<string, unknown>>(
  statutCouple: string | null,
  extra?: T
): T & { statut_couple: string | null } => ({
  ...(extra ?? ({} as T)),
  statut_couple: statutCouple,
});
