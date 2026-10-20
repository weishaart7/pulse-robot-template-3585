// Parts du foyer dans une société : de la fiche `societes` (valeur de toute la société, part du
// capital de chaque époux) vers l'actif Patrimoine lié (valeur des seules parts du foyer,
// répartition entre époux). L'actif suit ensuite les règles de n'importe quel bien : commun
// 50/50, propre 100/0, indivision au prorata (cf. lib/patrimoine/succession.ts).
import { qualifierBien, type QualificationContext, type QualificationBien } from '@/lib/patrimoine/qualification';

/** Origines possibles de l'entrée du foyer dans la société (mêmes valeurs que assets.origine_actif). */
export const ORIGINES_ENTREE_SOCIETE = [
  { value: 'Création', label: 'Création (souscription au capital)' },
  { value: 'Acquisition à titre onéreux', label: 'Achat de parts' },
  { value: 'Donation', label: 'Parts reçues par donation' },
  { value: 'Héritage', label: 'Parts reçues par héritage' },
] as const;

/** Contexte matrimonial utile à la qualification (sous-ensemble de QualificationContext). */
export type ContexteMatrimonial = Pick<
  QualificationContext,
  'statutCouple' | 'regimeMatrimonial' | 'dateMariage' | 'conventionPacs' | 'datePacs' | 'societeAcquets' | 'dateJugementSeparationCorps'
>;

export interface EntreeSociete {
  origine?: string | null;
  dateCreation?: string | null;
  dateSouscription?: string | null;
  remploi?: boolean | null;
}

/** Date d'entrée : création de la société pour une création, souscription / acquisition des parts sinon. */
export const dateEntreeSociete = (e: EntreeSociete): string | undefined =>
  (e.origine === 'Création' ? e.dateCreation || e.dateSouscription : e.dateSouscription || e.dateCreation) || undefined;

/** Détenteur (valeur en base) déduit de la part du capital de chaque époux. */
export const detenteurDepuisQuotites = (pctUtilisateur?: number | null, pctConjoint?: number | null): 'user' | 'spouse' | 'common' | null => {
  const u = pctUtilisateur ?? 0;
  const c = pctConjoint ?? 0;
  if (u > 0 && c > 0) return 'common';
  if (u > 0) return 'user';
  if (c > 0) return 'spouse';
  return null;
};

/**
 * Qualification des parts du foyer, par le même moteur que les actifs. Le détenteur déduit des
 * quotités est une entrée du moteur (les deux époux associés hors communauté → indivision).
 */
export const qualifierPartsSociete = (
  contexte: ContexteMatrimonial,
  entree: EntreeSociete,
  pctUtilisateur: number | null | undefined,
  pctConjoint: number | null | undefined,
  natureActif?: string,
): { qualification: QualificationBien; raison: string; detenteur: 'user' | 'spouse' | 'common' | null } => {
  const detenteur = detenteurDepuisQuotites(pctUtilisateur, pctConjoint);
  const date = dateEntreeSociete(entree);
  const { qualification, raison } = qualifierBien({
    ...contexte,
    dateAcquisition: date ? new Date(date).toISOString() : undefined,
    origineActif: entree.origine ? [entree.origine] : undefined,
    detenteur: detenteur ?? undefined,
    clauseRemploi: !!entree.remploi,
    natureActif,
  });
  return { qualification, raison, detenteur };
};

export interface SocieteSource {
  valeur_estimee?: number | null;
  pourcentage_utilisateur?: number | null;
  pourcentage_conjoint?: number | null;
  qualification_bien?: string | null;
  detenteur?: string | null;
  origine_entree?: string | null;
  montant_entree?: number | null;
  date_creation?: string | null;
  date_souscription?: string | null;
}

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Champs de l'actif lié à recopier depuis la société (création et chaque sauvegarde) :
 * valeur des parts du foyer, répartition entre époux, origine, date, prix de revient, qualification.
 */
export const actifDepuisSociete = (s: SocieteSource) => {
  const u = s.pourcentage_utilisateur ?? 0;
  const c = s.pourcentage_conjoint ?? 0;
  const partFoyer = (u + c) / 100;
  const commun = s.qualification_bien === 'Bien commun';
  const date = dateEntreeSociete({ origine: s.origine_entree, dateCreation: s.date_creation, dateSouscription: s.date_souscription });
  return {
    valeur_estimee: s.valeur_estimee != null ? arrondi2(s.valeur_estimee * partFoyer) : null,
    // Bien commun : 50/50 de droit ; sinon, part de chaque époux dans les parts du foyer.
    pourcentage_utilisateur: commun ? 50 : u + c > 0 ? arrondi2((u / (u + c)) * 100) : 100,
    pourcentage_conjoint: commun ? 50 : u + c > 0 ? arrondi2((c / (u + c)) * 100) : 0,
    qualification_bien: s.qualification_bien ?? null,
    qualification_auto: false,
    // Parts communes : la valeur appartient au couple (l'associé reste celui de la fiche société,
    // art. 1832-2) — même convention que les actifs, où un bien commun est détenu par « Le couple ».
    detenteur: commun ? 'common' : s.detenteur ?? null,
    origine_actif: s.origine_entree ? [s.origine_entree] : null,
    date_acquisition: date ?? null,
    valeur_acquisition: s.montant_entree ?? null,
  };
};
