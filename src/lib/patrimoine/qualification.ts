/**
 * Qualification automatique d'un actif en bien propre / commun
 * selon le régime matrimonial (ou la convention PACS), l'origine du bien et
 * la date d'acquisition.
 *
 * Règles simplifiées (régime légal français : communauté réduite aux acquêts)
 * - Clause de remploi actée → bien propre (prioritaire sur tout le reste, y
 *   compris communauté universelle : un époux peut avoir acté une clause de
 *   remploi explicite pour conserver le caractère propre d'un bien)
 * - Bien acquis AVANT le mariage → bien propre
 * - Bien acquis PENDANT le mariage à titre onéreux → commun
 * - Bien reçu par héritage / donation / présent d'usage → bien propre, sauf
 *   clause d'entrée en communauté explicitement actée sur une donation → commun
 * - Régime de séparation de biens → toujours bien propre
 * - Régime de communauté universelle → toujours commun
 * - PACS avec convention de séparation de patrimoines (par défaut) → bien propre
 * - PACS avec convention d'indivision → bien commun (assimilé, pas de notion
 *   distincte pour les besoins de cet outil : répartition/transmission identiques)
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
  conventionPacs?: string;
  dateAcquisition?: string;
  origineActif?: string[];
  modeDetention?: string;
  detenteur?: string;
  clauseEntreeCommunaute?: boolean;
  clauseRemploi?: boolean;
}

const ORIGINES_PROPRES = [
  'Donation',
  'Héritage',
  "Présent d'usage",
  'Acquisition à titre gratuit',
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

const isPacse = (statut?: string): boolean => {
  if (!statut) return false;
  const s = statut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s.includes('pacs');
};

const isConventionPacsIndivision = (convention?: string): boolean => {
  if (!convention) return false;
  return convention.toLowerCase().includes('indivision');
};

export const qualifierBien = (ctx: QualificationContext): {
  qualification: QualificationBien;
  raison: string;
} => {
  const {
    statutCouple,
    regimeMatrimonial,
    dateMariage,
    conventionPacs,
    dateAcquisition,
    origineActif,
    detenteur,
    clauseEntreeCommunaute,
    clauseRemploi,
  } = ctx;

  // Cas indivision (plusieurs détenteurs hors couple)
  if (detenteur && detenteur.toLowerCase().includes('indivision')) {
    return { qualification: 'Indivision', raison: 'Bien détenu en indivision.' };
  }

  // Pas en couple → bien personnel
  if (!isInCouple(statutCouple)) {
    return { qualification: 'Bien personnel', raison: 'Vous n\'êtes pas en couple : bien personnel.' };
  }

  // Clause de remploi actée → propre, prioritaire sur tout le reste (y compris
  // communauté universelle : un époux peut avoir acté une clause de remploi
  // explicite pour conserver le caractère propre d'un bien acheté avec des
  // fonds propres réemployés).
  if (clauseRemploi) {
    return {
      qualification: 'Bien propre',
      raison: 'Bien propre car acquis avec des fonds propres réemployés (clause de remploi actée).',
    };
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

  // Origine "gratuite" (donation, héritage, présent d'usage) → bien propre,
  // sauf clause d'entrée en communauté explicitement actée sur une donation.
  const origines = origineActif || [];
  const estGratuit = origines.some((o) => ORIGINES_PROPRES.includes(o));
  if (estGratuit) {
    if (clauseEntreeCommunaute && origines.includes('Donation')) {
      return {
        qualification: 'Bien commun',
        raison: 'Bien commun car la donation comporte une clause d\'entrée en communauté.',
      };
    }
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

  // PACS : régime des partenaires distinct du régime matrimonial. Par défaut
  // (séparation de patrimoines), les biens acquis restent propres à leur
  // acquéreur ; sur option d'indivision à la signature, ils sont assimilés à
  // des biens communs pour les besoins de cet outil (répartition/transmission
  // identiques à un bien commun matrimonial).
  if (isPacse(statutCouple)) {
    if (isConventionPacsIndivision(conventionPacs)) {
      return {
        qualification: 'Bien commun',
        raison: 'Bien commun car les partenaires de PACS ont opté pour la convention d\'indivision.',
      };
    }
    return {
      qualification: 'Bien propre',
      raison: 'Bien propre car les partenaires de PACS sont, par défaut, soumis à la séparation de patrimoines.',
    };
  }

  // Par défaut sous régime légal (mariage) : bien acquis pendant l'union à
  // titre onéreux → commun
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
