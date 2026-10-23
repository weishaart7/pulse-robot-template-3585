import type { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import type { EnfantCharge, FoyerFiscalInput, PersonneInvalideCharge } from './types';

// Reprise du foyer fiscal (Ménage de la 2042) depuis Famille. Fonction pure : la situation est
// appréciée pour l'année des revenus N (minorité au 1er janvier N, âge des anciens combattants au
// 31 décembre N). Les champs que Famille ne renseigne pas (résidence alternée, lieu de résidence,
// cases T, L et G) restent ceux du Ménage. Rien n'est enregistré : le formulaire reçoit un brouillon.

/** Champs du Ménage alimentés par Famille. */
export type ChampsFamille = Pick<FoyerFiscalInput,
  | 'situationFamille' | 'enfantsCharge' | 'enfantsMajeursRattaches' | 'personnesInvalidesCharge'
  | 'invaliditeDeclarant1' | 'invaliditeDeclarant2' | 'ancienCombattantDeclarant1' | 'ancienCombattantDeclarant2'>;

export interface FoyerDepuisFamille {
  valeurs: ChampsFamille;
  /** Points que Famille ne permet pas de trancher, à vérifier dans le Ménage. */
  notes: string[];
}

const SITUATIONS: Record<string, FoyerFiscalInput['situationFamille']> = {
  'Marié(e)': 'marie',
  'Pacsé(e)': 'pacse',
  'Divorcé(e)': 'divorce',
  'Veuf/Veuve': 'veuf',
  // Les concubins sont imposés séparément : chacun déclare comme célibataire.
  Concubinage: 'celibataire',
  Célibataire: 'celibataire',
};

const anneeDe = (date?: string | null): number | null => {
  if (!date) return null;
  const annee = Number(date.slice(0, 4));
  return Number.isFinite(annee) && annee > 1800 ? annee : null;
};

/** Mineur au 1er janvier N : né après le 1er janvier N − 18 (enfant né pendant N compris). */
const estMineurAu1erJanvier = (dateNaissance: string, annee: number) => dateNaissance.slice(0, 10) > `${annee - 18}-01-01`;

const nomMembre = (l: FamilyLink) => [l.prenom, l.nom].filter(Boolean).join(' ') || l.lien_familial;

/**
 * Enfant compté dans la déclaration du client : à charge fiscalement, vivant, et rattaché au client.
 * En couple marié ou pacsé, les enfants des deux ; en concubinage ou seul, ceux du client et les
 * enfants communs (un enfant du seul partenaire relève de la déclaration de celui-ci).
 */
function enfantDuFoyer(l: FamilyLink, enCouple: boolean): boolean {
  if (l.lien_familial !== 'Enfant' || l.est_decede || !l.fiscalement_a_charge) return false;
  return enCouple || l.enfant_de !== 'spouse';
}

export function foyerDepuisFamille(
  profile: FamilyProfile | null,
  marital: MaritalStatus | null,
  liens: FamilyLink[],
  anneeRevenus: number,
): FoyerDepuisFamille {
  const notes: string[] = [];
  const statut = marital?.statut_couple ?? null;
  const situationFamille = (statut && SITUATIONS[statut]) || 'celibataire';
  const enCouple = situationFamille === 'marie' || situationFamille === 'pacse';
  if (!statut) notes.push('Statut du couple non renseigné dans Famille : célibataire retenu.');

  const enfantsCharge: EnfantCharge[] = [];
  let enfantsMajeursRattaches = 0;
  for (const l of liens.filter((x) => enfantDuFoyer(x, enCouple))) {
    if (!l.date_naissance) {
      notes.push(`${nomMembre(l)} : date de naissance absente dans Famille, enfant non repris.`);
      continue;
    }
    if (anneeDe(l.date_naissance)! > anneeRevenus) {
      notes.push(`${nomMembre(l)} : né(e) en ${anneeDe(l.date_naissance)}, après l'année des revenus ${anneeRevenus} : non compté(e).`);
      continue;
    }
    if (estMineurAu1erJanvier(l.date_naissance, anneeRevenus)) {
      enfantsCharge.push({ anneeNaissance: anneeDe(l.date_naissance)!, invalide: !!l.handicap, residenceAlternee: false });
    } else {
      enfantsMajeursRattaches += 1;
    }
  }
  const enfantsDuPartenaire = liens.filter((l) => !enCouple && l.lien_familial === 'Enfant' && !l.est_decede
    && l.fiscalement_a_charge && l.enfant_de === 'spouse');
  if (enfantsDuPartenaire.length > 0) {
    notes.push(`${enfantsDuPartenaire.map(nomMembre).join(', ')} : enfant du partenaire seul, compté sur sa déclaration, pas sur la vôtre.`);
  }

  const personnesInvalidesCharge: PersonneInvalideCharge[] = [];
  for (const l of liens.filter((x) => x.lien_familial !== 'Enfant' && !x.est_decede && x.personne_a_charge && x.handicap)) {
    const annee = anneeDe(l.date_naissance);
    if (annee === null) notes.push(`${nomMembre(l)} : date de naissance absente dans Famille, personne invalide non reprise.`);
    else personnesInvalidesCharge.push({ anneeNaissance: annee });
  }

  // Ancien combattant : case W / S seulement au-delà de 74 ans au 31 décembre de l'année des revenus.
  const ancienCombattant = (estAncien: boolean | null | undefined, dateNaissance: string | null | undefined, qui: string) => {
    if (!estAncien) return false;
    const annee = anneeDe(dateNaissance);
    if (annee === null) { notes.push(`${qui} : ancien combattant, date de naissance absente : case non cochée.`); return false; }
    if (anneeRevenus - annee > 74) return true;
    notes.push(`${qui} : ancien combattant de 74 ans ou moins au 31 décembre ${anneeRevenus} : pas de demi-part.`);
    return false;
  };

  if (marital?.separation_de_corps || marital?.residence_separee || marital?.imposition_distincte) {
    notes.push('Séparation de corps, résidence séparée ou imposition distincte déclarée dans Famille : les époux peuvent être imposés séparément, situation à vérifier.');
  }
  if (!enCouple && (enfantsCharge.length > 0 || enfantsMajeursRattaches > 0) && statut !== 'Concubinage') {
    notes.push('Vous vivez seul(e) avec vos enfants ? Cochez la case T (Famille ne le précise pas).');
  }

  return {
    valeurs: {
      situationFamille,
      enfantsCharge,
      enfantsMajeursRattaches,
      personnesInvalidesCharge,
      invaliditeDeclarant1: !!profile?.personne_handicapee,
      invaliditeDeclarant2: enCouple && !!marital?.personne_handicapee_conjoint,
      ancienCombattantDeclarant1: ancienCombattant(profile?.ancien_combattant, profile?.date_naissance, 'Vous'),
      ancienCombattantDeclarant2: enCouple && ancienCombattant(marital?.ancien_combattant_conjoint, marital?.date_naissance_conjoint, 'Votre conjoint(e)'),
    },
    notes,
  };
}

/**
 * Applique la reprise sur le foyer : champs de Famille remplacés, champs propres au Ménage conservés.
 * La résidence alternée est gardée pour un enfant de même année de naissance déjà saisi.
 */
export function appliquerFamille(foyer: FoyerFiscalInput, valeurs: ChampsFamille): FoyerFiscalInput {
  const disponibles = [...foyer.enfantsCharge];
  const enfantsCharge = valeurs.enfantsCharge.map((e) => {
    const i = disponibles.findIndex((d) => d.anneeNaissance === e.anneeNaissance);
    const precedent = i >= 0 ? disponibles.splice(i, 1)[0] : undefined;
    return { ...e, residenceAlternee: precedent?.residenceAlternee ?? false };
  });
  return { ...foyer, ...valeurs, enfantsCharge };
}

const LIBELLES_SITUATION: Record<FoyerFiscalInput['situationFamille'], string> = {
  marie: 'marié(e)', pacse: 'pacsé(e)', celibataire: 'célibataire', divorce: 'divorcé(e)', veuf: 'veuf(ve)',
};

const listeAnnees = (l: { anneeNaissance: number }[]) => l.map((x) => x.anneeNaissance).sort().join(',');

/** Écarts entre le Ménage et Famille, formulés pour l'utilisateur ; vide si concordants. */
export function ecartsAvecFamille(foyer: FoyerFiscalInput, valeurs: ChampsFamille): string[] {
  const ecarts: string[] = [];
  if (foyer.situationFamille !== valeurs.situationFamille) {
    ecarts.push(`Situation : ${LIBELLES_SITUATION[valeurs.situationFamille]} dans Famille, ${LIBELLES_SITUATION[foyer.situationFamille]} ici.`);
  }
  if (listeAnnees(foyer.enfantsCharge) !== listeAnnees(valeurs.enfantsCharge)
    || foyer.enfantsCharge.filter((e) => e.invalide).length !== valeurs.enfantsCharge.filter((e) => e.invalide).length) {
    ecarts.push(`Enfants mineurs à charge : ${valeurs.enfantsCharge.length} dans Famille, ${foyer.enfantsCharge.length} ici (ou années de naissance, invalidité différentes).`);
  }
  if (foyer.enfantsMajeursRattaches !== valeurs.enfantsMajeursRattaches) {
    ecarts.push(`Enfants majeurs rattachés : ${valeurs.enfantsMajeursRattaches} dans Famille, ${foyer.enfantsMajeursRattaches} ici.`);
  }
  if (listeAnnees(foyer.personnesInvalidesCharge) !== listeAnnees(valeurs.personnesInvalidesCharge)) {
    ecarts.push(`Autres personnes invalides à charge : ${valeurs.personnesInvalidesCharge.length} dans Famille, ${foyer.personnesInvalidesCharge.length} ici.`);
  }
  const cases: [keyof ChampsFamille, string][] = [
    ['invaliditeDeclarant1', 'Invalidité (P)'], ['invaliditeDeclarant2', 'Invalidité du conjoint (F)'],
    ['ancienCombattantDeclarant1', 'Ancien combattant (W)'], ['ancienCombattantDeclarant2', 'Ancien combattant, conjoint (S)'],
  ];
  for (const [cle, libelle] of cases) {
    if (foyer[cle] !== valeurs[cle]) ecarts.push(`${libelle} : ${valeurs[cle] ? 'oui' : 'non'} dans Famille, ${foyer[cle] ? 'oui' : 'non'} ici.`);
  }
  return ecarts;
}
