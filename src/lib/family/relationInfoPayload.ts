import { format } from 'date-fns';

// Construit le payload d'enregistrement de RelationInfoForm.tsx en ne gardant
// que les champs réellement affichés à l'écran pour le statut courant (Option
// A) : les colonnes déjà en base pour un statut précédent ne sont ni écrites
// ni effacées, elles restent inchangées si l'utilisateur change de statut
// puis y revient. Conséquence acceptée : tout code qui lit ces colonnes doit
// revérifier statut_couple avant de leur faire confiance (cf. qualifierBien,
// computeTransmission, useAlertesConseil.ts).

export interface RelationInfoFormValues {
  regimeMatrimonial?: string;
  dateMariage?: Date;
  lieuMariage?: string;
  pasDeContrat?: boolean;
  impositionDistincte?: boolean;
  residenceSeparee?: boolean;
  loiApplicableRegime?: string;
  paysPremierDomicileMatrimonial?: string;
  donationDernierVivantPersonne?: boolean;
  dateDonationPersonne?: Date;
  donationDernierVivantConjoint?: boolean;
  dateDonationConjoint?: Date;
  mariagePrecedentPersonne?: boolean;
  dureeMariagePrecedentPersonneAnnees?: number | null;
  dureeMariagePrecedentPersonneMois?: number | null;
  mariagePrecedentConjoint?: boolean;
  dureeMariagePrecedentConjointAnnees?: number | null;
  dureeMariagePrecedentConjointMois?: number | null;
  conventionPacs?: string;
  datePacs?: Date;
}

const formatDate = (d?: Date): string | undefined => (d instanceof Date ? format(d, 'yyyy-MM-dd') : undefined);

export const buildRelationInfoPayload = (
  relationStatus: string,
  data: RelationInfoFormValues
): Record<string, unknown> => {
  // Communs aux deux statuts en couple (affichés dans les deux blocs JSX),
  // absents en Concubinage (aucun champ affiché).
  const commonPayload =
    relationStatus === 'Marié(e)' || relationStatus === 'Pacsé(e)'
      ? { imposition_distincte: data.impositionDistincte ?? false, residence_separee: data.residenceSeparee ?? false }
      : {};

  if (relationStatus === 'Marié(e)') {
    return {
      ...commonPayload,
      regime_matrimonial: data.regimeMatrimonial,
      date_mariage: formatDate(data.dateMariage),
      lieu_mariage: data.lieuMariage,
      pas_de_contrat_mariage: data.pasDeContrat ?? false,
      loi_applicable_regime: data.loiApplicableRegime || null,
      pays_premier_domicile_matrimonial: data.paysPremierDomicileMatrimonial || null,
      donation_dernier_vivant_personne: data.donationDernierVivantPersonne ?? false,
      date_donation_personne: formatDate(data.dateDonationPersonne),
      donation_dernier_vivant_conjoint: data.donationDernierVivantConjoint ?? false,
      date_donation_conjoint: formatDate(data.dateDonationConjoint),
      mariage_precedent_personne: data.mariagePrecedentPersonne ?? false,
      duree_mariage_precedent_personne_annees: data.dureeMariagePrecedentPersonneAnnees ?? null,
      duree_mariage_precedent_personne_mois: data.dureeMariagePrecedentPersonneMois ?? null,
      mariage_precedent_conjoint: data.mariagePrecedentConjoint ?? false,
      duree_mariage_precedent_conjoint_annees: data.dureeMariagePrecedentConjointAnnees ?? null,
      duree_mariage_precedent_conjoint_mois: data.dureeMariagePrecedentConjointMois ?? null,
    };
  }

  if (relationStatus === 'Pacsé(e)') {
    return {
      ...commonPayload,
      convention_pacs: data.conventionPacs,
      date_pacs: formatDate(data.datePacs),
    };
  }

  // Concubinage (ou tout autre statut) : aucun champ affiché, aucune écriture.
  return {};
};
