/**
 * Qualification automatique d'un actif en bien propre / commun
 * selon le régime matrimonial, l'origine du bien et la date d'acquisition.
 *
 * Règles simplifiées (régime légal français : communauté réduite aux acquêts)
 * - Bien acquis AVANT le mariage → bien propre
 * - Bien acquis PENDANT le mariage à titre onéreux → commun
 * - Bien reçu par héritage / donation / présent d'usage → bien propre (sauf clause d'apport)
 * - Régime de séparation de biens → toujours bien propre
 * - Régime de communauté universelle → toujours commun
 * - Sans union (célibataire / divorcé / veuf) → bien personnel
 */

export type QualificationBien =
  | 'Bien propre'
  | 'Bien commun'
  | 'Bien personnel'
  | 'Indivision'
  | 'À qualifier';

export interface QualificationContext {
  statutCouple?: string;
  regimeMatrimonial?: string;
  dateMariage?: string;
  dateAcquisition?: string;
  origineActif?: string[];
  modeDetention?: string;
  detenteur?: string;
}

const ORIGINES_PROPRES = [
  'Donation',
  'Héritage',
  "Présent d'usage",
  'Acquisition à titre gratuite',
  'Découverte',
  'Création',
];

const isInCouple = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('mari') || s.includes('pacs') || s.includes('concubin');
};

const isSeparationDeBiens = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('séparation') || r.includes('separation');
};

const isCommunauteUniverselle = (regime?: string): boolean => {
  if (!regime) return false;
  const r = regime.toLowerCase();
  return r.includes('universelle');
};

export const qualifierBien = (ctx: QualificationContext): {
  qualification: QualificationBien;
  raison: string;
} => {
  const {
    statutCouple,
    regimeMatrimonial,
    dateMariage,
    dateAcquisition,
    origineActif,
    detenteur,
  } = ctx;

  // Cas indivision (plusieurs détenteurs hors couple)
  if (detenteur && detenteur.toLowerCase().includes('indivision')) {
    return { qualification: 'Indivision', raison: 'Bien détenu en indivision.' };
  }

  // Pas en couple → bien personnel
  if (!isInCouple(statutCouple)) {
    return { qualification: 'Bien personnel', raison: 'Vous n\'êtes pas en couple : bien personnel.' };
  }

  // Séparation de biens → toujours propre
  if (isSeparationDeBiens(regimeMatrimonial)) {
    return {
      qualification: 'Bien propre',
      raison: 'Régime de séparation de biens : tout bien est propre à son acquéreur.',
    };
  }

  // Communauté universelle → toujours commun
  if (isCommunauteUniverselle(regimeMatrimonial)) {
    return {
      qualification: 'Bien commun',
      raison: 'Régime de communauté universelle : tous les biens sont communs.',
    };
  }

  // Origine "gratuite" (donation, héritage, présent d'usage) → bien propre
  const origines = origineActif || [];
  const estGratuit = origines.some((o) => ORIGINES_PROPRES.includes(o));
  if (estGratuit) {
    return {
      qualification: 'Bien propre',
      raison: 'Bien reçu à titre gratuit (donation, héritage, présent d\'usage) : reste propre sauf clause d\'apport à la communauté.',
    };
  }

  // Bien acquis avant le mariage → propre
  if (dateMariage && dateAcquisition) {
    const dAcq = new Date(dateAcquisition);
    const dMar = new Date(dateMariage);
    if (!isNaN(dAcq.getTime()) && !isNaN(dMar.getTime()) && dAcq < dMar) {
      return {
        qualification: 'Bien propre',
        raison: 'Bien acquis avant le mariage : il est propre à son acquéreur.',
      };
    }
  }

  // Par défaut sous régime légal : bien acquis pendant le mariage à titre onéreux → commun
  return {
    qualification: 'Bien commun',
    raison: 'Bien acquis pendant l\'union à titre onéreux : présumé commun (régime légal).',
  };
};

export const QUALIFICATION_OPTIONS: QualificationBien[] = [
  'Bien propre',
  'Bien commun',
  'Bien personnel',
  'Indivision',
  'À qualifier',
];
