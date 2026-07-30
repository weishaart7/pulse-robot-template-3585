// Logique pure de fusion pour l'écriture centralisée des 4 colonnes de
// donation au dernier vivant (marital_status), partagée par
// RelationInfoForm.tsx (onglet "Donation") et useMatrimonialClauses.ts
// (onglet "Clauses du contrat", écriture de clauses_contrat qui réembarquait
// jusqu'ici une copie figée de la donation) via
// useMaritalStatus().setDonationDernierVivant().
//
// `updates: null` signifie "je ne touche pas à la donation" : dans ce cas on
// réécrit la valeur `fresh` (lue en base juste avant l'appel, cf.
// useFamilyData.ts) plutôt qu'une copie locale potentiellement périmée —
// c'est ce qui évite d'écraser silencieusement une modification faite
// entre-temps dans l'autre onglet.

export interface DonationDernierVivantFields {
  donation_dernier_vivant_personne?: boolean;
  date_donation_personne?: string;
  donation_dernier_vivant_conjoint?: boolean;
  date_donation_conjoint?: string;
}

export const buildDonationDernierVivantWrite = (
  updates: DonationDernierVivantFields | null,
  fresh: DonationDernierVivantFields | null,
  extra?: Record<string, unknown>
): Record<string, unknown> => {
  const donationFields =
    updates ?? {
      donation_dernier_vivant_personne: fresh?.donation_dernier_vivant_personne ?? false,
      date_donation_personne: fresh?.date_donation_personne,
      donation_dernier_vivant_conjoint: fresh?.donation_dernier_vivant_conjoint ?? false,
      date_donation_conjoint: fresh?.date_donation_conjoint,
    };

  return { ...extra, ...donationFields };
};
