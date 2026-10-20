import { format } from 'date-fns';
import type { MaritalStatus } from '@/services/familyService';
import { toRegimeType } from '@/types/matrimonial';
import { champsObsoletesPourStatut } from '@/lib/family/maritalStatus';

// Construit le payload d'enregistrement de RelationInfoForm.tsx : les champs
// affichés pour le statut courant, et l'effacement de ceux d'un autre statut
// (champsObsoletesPourStatut) — un ancien PACS ou régime ne reste jamais en
// base. La clause de société d'acquêts (clauses_contrat) est retirée dès que le
// régime n'est plus une séparation de biens avec société d'acquêts sous contrat.

export interface RelationInfoFormValues {
  regimeMatrimonial?: string;
  dateMariage?: Date;
  lieuMariage?: string;
  pasDeContrat?: boolean;
  impositionDistincte?: boolean;
  residenceSeparee?: boolean;
  separationDeCorps?: boolean;
  separationCorpsClauseRenonciation?: boolean;
  dateJugementSeparationCorps?: Date;
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

// null (et non undefined) pour un champ vidé : une clé undefined disparaît de
// la requête et l'upsert laisserait l'ancienne date en base.
const formatDate = (d?: Date): string | null => (d instanceof Date ? format(d, 'yyyy-MM-dd') : null);

export const buildRelationInfoPayload = (
  relationStatus: string,
  data: RelationInfoFormValues
): MaritalStatus => {
  // Communs aux deux statuts en couple (affichés dans les deux blocs JSX),
  // absents en Concubinage (aucun champ affiché).
  const commonPayload =
    relationStatus === 'Marié(e)' || relationStatus === 'Pacsé(e)'
      ? { imposition_distincte: data.impositionDistincte ?? false, residence_separee: data.residenceSeparee ?? false }
      : {};

  const obsoletes = champsObsoletesPourStatut(relationStatus);

  if (relationStatus === 'Marié(e)') {
    const avecSocieteAcquets =
      toRegimeType(data.regimeMatrimonial) === 'separation_societe_acquets' && !data.pasDeContrat;
    return {
      ...obsoletes,
      ...(avecSocieteAcquets ? {} : { clauses_contrat: null }),
      ...commonPayload,
      regime_matrimonial: data.regimeMatrimonial,
      date_mariage: formatDate(data.dateMariage),
      lieu_mariage: data.lieuMariage,
      pas_de_contrat_mariage: data.pasDeContrat ?? false,
      donation_dernier_vivant_personne: data.donationDernierVivantPersonne ?? false,
      date_donation_personne: data.donationDernierVivantPersonne ? formatDate(data.dateDonationPersonne) : null,
      donation_dernier_vivant_conjoint: data.donationDernierVivantConjoint ?? false,
      date_donation_conjoint: data.donationDernierVivantConjoint ? formatDate(data.dateDonationConjoint) : null,
      mariage_precedent_personne: data.mariagePrecedentPersonne ?? false,
      duree_mariage_precedent_personne_annees: data.dureeMariagePrecedentPersonneAnnees ?? null,
      duree_mariage_precedent_personne_mois: data.dureeMariagePrecedentPersonneMois ?? null,
      mariage_precedent_conjoint: data.mariagePrecedentConjoint ?? false,
      duree_mariage_precedent_conjoint_annees: data.dureeMariagePrecedentConjointAnnees ?? null,
      duree_mariage_precedent_conjoint_mois: data.dureeMariagePrecedentConjointMois ?? null,
      separation_de_corps: data.separationDeCorps ?? false,
      separation_corps_clause_renonciation: data.separationCorpsClauseRenonciation ?? false,
      // Vidée si la case est décochée : la date ne vaut que pour une séparation de corps en cours.
      date_jugement_separation_corps: data.separationDeCorps ? formatDate(data.dateJugementSeparationCorps) : null,
    };
  }

  if (relationStatus === 'Pacsé(e)') {
    return {
      ...obsoletes,
      ...commonPayload,
      convention_pacs: data.conventionPacs,
      date_pacs: formatDate(data.datePacs),
    };
  }

  // Concubinage, Divorcé(e), Veuf/Veuve… : aucun champ affiché ; effacement selon
  // champsObsoletesPourStatut (le régime d'une union dissoute est conservé).
  return obsoletes as MaritalStatus;
};
