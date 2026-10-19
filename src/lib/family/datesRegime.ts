import { format } from 'date-fns';

// Cohérence des dates du régime matrimonial (statut Marié(e) uniquement),
// contrôlée à l'enregistrement de RelationInfoForm.tsx.
// - Jugement de séparation de corps : postérieur au mariage.
// - Donation au dernier vivant : à partir de la date du mariage (art. 1096 C. civ.).
//   La donation par contrat de mariage (art. 1093), antérieure au mariage, n'est
//   pas saisie ici : toute date antérieure est refusée, avec ou sans contrat.

export interface DatesRegime {
  dateMariage?: Date;
  separationDeCorps?: boolean;
  dateJugementSeparationCorps?: Date;
  donationDernierVivantPersonne?: boolean;
  dateDonationPersonne?: Date;
  donationDernierVivantConjoint?: boolean;
  dateDonationConjoint?: Date;
}

export interface ErreurDateRegime {
  path: 'dateJugementSeparationCorps' | 'dateDonationPersonne' | 'dateDonationConjoint';
  message: string;
}

// Comparaison sur la date calendaire (yyyy-MM-dd), indépendante de l'heure.
const jour = (d: Date) => format(d, 'yyyy-MM-dd');

export function verifierDatesRegime(d: DatesRegime): ErreurDateRegime[] {
  const erreurs: ErreurDateRegime[] = [];
  if (!d.dateMariage) return erreurs;
  const mariage = jour(d.dateMariage);

  if (d.separationDeCorps && d.dateJugementSeparationCorps && jour(d.dateJugementSeparationCorps) <= mariage) {
    erreurs.push({ path: 'dateJugementSeparationCorps', message: 'Le jugement doit être postérieur au mariage' });
  }

  const messageDonation = 'La donation doit dater du mariage ou d\'après';
  if (d.donationDernierVivantPersonne && d.dateDonationPersonne && jour(d.dateDonationPersonne) < mariage) {
    erreurs.push({ path: 'dateDonationPersonne', message: messageDonation });
  }
  if (d.donationDernierVivantConjoint && d.dateDonationConjoint && jour(d.dateDonationConjoint) < mariage) {
    erreurs.push({ path: 'dateDonationConjoint', message: messageDonation });
  }
  return erreurs;
}
