/**
 * Trimestres de majoration pour enfant (MDA) d'une personne — fonctions
 * pures. Paramètres : bloc `mda` de `params-retraite.json`.
 *
 * Règles validées le 2026-10-22 (référentiel §2.5-2.6, Fidroit CNAV, CNAVPL,
 * fonctionnaires titulaires) :
 * - Régime général, alignés, CNAVPL : 4 trimestres maternité/adoption + 4
 *   trimestres éducation (1 par année écoulée depuis la naissance, au plus 4,
 *   sous réserve de 8 trimestres tous régimes). Par défaut tout à la mère
 *   (moitié-moitié si le couple n'a pas de mère identifiable par la
 *   civilité et que l'enfant est adopté) ; enfant d'un seul parent : tout à
 *   ce parent. Répartition corrigeable par enfant (`retraite_mda_enfants`).
 *   Enfant né avant le 1er avril 2010 : l'éducation ne se répartit pas
 *   (tout ou rien), un avertissement signale une attribution au père.
 * - Fonction publique (prioritaire, art. R. 173-15 CSS) : enfant né à partir
 *   de 2004, 2 trimestres de majoration de durée pour la mère (durée tous
 *   régimes seulement) ; enfant né avant 2004, bonification de 4 trimestres
 *   si cochée (interruption d'activité non vérifiable), comptée dans les
 *   trimestres liquidables.
 * - Un enfant n'est compté que dans un seul régime : défaut FP si la
 *   personne n'a que des droits FP, CNAVPL si elle n'a que des droits
 *   CNAVPL, régime général sinon ; corrigeable par enfant.
 * - Effets (portés par l'appelant) : durée tous régimes, proratisation du
 *   régime qui les accorde ; jamais dans le seuil MICO, la surcote ni la
 *   carrière longue. Ouvrent la surcote parentale.
 * - RIS affichant déjà les MDA (`mda_deja_au_ris`) : détail calculé, aucun
 *   trimestre ajouté.
 */

import { FamilyLink } from '@/services/familyService';
import { PARAMETRES_MDA } from './parametres';

export type PersonneRetraite = 'utilisateur' | 'conjoint';
export type RegimeMDA = 'rg' | 'fp' | 'cnavpl';

/** Écarts au défaut saisis pour un enfant (table `retraite_mda_enfants`). */
export interface AttributionMDA {
  family_link_id: string;
  maternite_adoption_client: number | null;
  education_client: number | null;
  regime_attribution: string | null;
  bonification_fp: boolean;
}

export interface EntreeTrimestresEnfants {
  familyLinks: FamilyLink[];
  attributions: AttributionMDA[];
  personne: PersonneRetraite;
  civiliteUtilisateur: string | null;
  civiliteConjoint: string | null;
  droits: { rg: boolean; fp: boolean; cnavpl: boolean };
  dateEffet: Date;
  /** Durée tous régimes hors MDA (condition des 8 trimestres pour l'éducation). */
  dureeTousRegimesHorsMDA: number;
  mdaDejaAuRis: boolean;
}

export interface DetailEnfantMDA {
  familyLinkId: string;
  prenom: string;
  dateNaissance: string;
  regime: RegimeMDA;
  /** Trimestres de la personne. */
  materniteAdoption: number;
  education: number;
  fpMajorationDuree: number;
  fpBonification: number;
  /** Parts « utilisateur » retenues (défaut ou saisie), pour l'écran. */
  partMaterniteUtilisateur: number;
  partEducationUtilisateur: number;
  estAdopte: boolean;
  avertissements: string[];
}

export interface TrimestresEnfantsParRegime {
  /** Régime général et alignés : trimestres validés (taux, proratisation). */
  rg: number;
  /** CNAVPL : durée CNAVPL (tous régimes). */
  cnavpl: number;
  /** Fonction publique, enfants nés depuis 2004 : durée tous régimes seulement. */
  fpMajorationDuree: number;
  /** Fonction publique, enfants nés avant 2004 : trimestres liquidables. */
  fpBonification: number;
  total: number;
  /** Au moins un trimestre de MDA, même déjà compté au RIS (surcote parentale). */
  auMoinsUn: boolean;
  detail: DetailEnfantMDA[];
}

export const AUCUN_TRIMESTRE_ENFANT: TrimestresEnfantsParRegime = {
  rg: 0,
  cnavpl: 0,
  fpMajorationDuree: 0,
  fpBonification: 0,
  total: 0,
  auMoinsUn: false,
  detail: [],
};

function sexeDepuisCivilite(civilite: string | null): 'F' | 'M' | null {
  if (civilite === 'Mme' || civilite === 'Mlle') return 'F';
  if (civilite === 'M.') return 'M';
  return null;
}

/** Rattachement d'un enfant : `user`, `spouse` ou `both_parents` (vide = les deux). */
export function rattachementEnfant(lien: FamilyLink): 'user' | 'spouse' | 'both_parents' {
  const valeur = lien.parent_de ?? lien.enfant_de;
  return valeur === 'user' || valeur === 'spouse' ? valeur : 'both_parents';
}

export function estEnfantDeLaPersonne(lien: FamilyLink, personne: PersonneRetraite): boolean {
  if (lien.lien_familial !== 'Enfant') return false;
  const rattachement = rattachementEnfant(lien);
  return rattachement === 'both_parents' || rattachement === (personne === 'utilisateur' ? 'user' : 'spouse');
}

function dateIso(iso: string): Date | null {
  const [a, m, j] = iso.split('-').map(Number);
  return a && m && j ? new Date(a, m - 1, j) : null;
}

function anneesRevolues(debut: Date, fin: Date): number {
  let annees = fin.getFullYear() - debut.getFullYear();
  if (fin.getMonth() < debut.getMonth() || (fin.getMonth() === debut.getMonth() && fin.getDate() < debut.getDate())) {
    annees -= 1;
  }
  return Math.max(0, annees);
}

/**
 * Part « utilisateur » par défaut (sur 4) : enfant d'un seul parent → tout à
 * ce parent ; sinon tout à la mère ; sans mère identifiable, moitié-moitié
 * pour un enfant adopté, `null` (non attribuable) pour une naissance.
 */
function partUtilisateurParDefaut(
  rattachement: 'user' | 'spouse' | 'both_parents',
  sexeUtilisateur: 'F' | 'M' | null,
  sexeConjoint: 'F' | 'M' | null,
  estAdopte: boolean
): number | null {
  const total = PARAMETRES_MDA.trimestresMaterniteAdoption;
  if (rattachement === 'user') return total;
  if (rattachement === 'spouse') return 0;
  const utilisateurMere = sexeUtilisateur === 'F' && sexeConjoint !== 'F';
  const conjointMere = sexeConjoint === 'F' && sexeUtilisateur !== 'F';
  if (utilisateurMere) return total;
  if (conjointMere) return 0;
  return estAdopte ? total / 2 : null;
}

function regimeParDefaut(droits: EntreeTrimestresEnfants['droits']): RegimeMDA {
  if (droits.fp && !droits.rg && !droits.cnavpl) return 'fp';
  if (droits.cnavpl && !droits.rg && !droits.fp) return 'cnavpl';
  return 'rg';
}

function bornerPart(valeur: number): number {
  return Math.min(PARAMETRES_MDA.trimestresMaterniteAdoption, Math.max(0, valeur));
}

export function trimestresEnfants(entree: EntreeTrimestresEnfants): TrimestresEnfantsParRegime {
  const {
    familyLinks,
    attributions,
    personne,
    civiliteUtilisateur,
    civiliteConjoint,
    droits,
    dateEffet,
    dureeTousRegimesHorsMDA,
    mdaDejaAuRis,
  } = entree;
  const sexeUtilisateur = sexeDepuisCivilite(civiliteUtilisateur);
  const sexeConjoint = sexeDepuisCivilite(civiliteConjoint);
  const sexePersonne = personne === 'utilisateur' ? sexeUtilisateur : sexeConjoint;
  const dateRepartition = dateIso(PARAMETRES_MDA.dateChargeRepartitionEducation)!;
  const dateFP = dateIso(PARAMETRES_MDA.fpDateChargeMajoration)!;
  const educationOuverte = dureeTousRegimesHorsMDA >= PARAMETRES_MDA.dureeMinimaleEducation;

  const detail: DetailEnfantMDA[] = [];
  for (const lien of familyLinks) {
    if (!lien.id || !estEnfantDeLaPersonne(lien, personne)) continue;
    const naissance = lien.date_naissance ? dateIso(lien.date_naissance) : null;
    if (!naissance || naissance.getTime() > dateEffet.getTime()) continue;

    const attribution = attributions.find((a) => a.family_link_id === lien.id);
    const rattachement = rattachementEnfant(lien);
    const estAdopte = !!lien.enfant_adopte && lien.enfant_adopte !== 'Non';
    const avertissements: string[] = [];

    const partDefaut = partUtilisateurParDefaut(rattachement, sexeUtilisateur, sexeConjoint, estAdopte);
    if (partDefaut === null && attribution?.maternite_adoption_client == null) {
      avertissements.push('Civilités des parents à compléter : trimestres non attribués par défaut.');
    }
    const partMaterniteUtilisateur = bornerPart(attribution?.maternite_adoption_client ?? partDefaut ?? 0);
    const partEducationUtilisateur = bornerPart(attribution?.education_client ?? partDefaut ?? 0);
    const totalMDA = PARAMETRES_MDA.trimestresMaterniteAdoption;
    const partPersonne = (partUtilisateur: number) =>
      personne === 'utilisateur' ? partUtilisateur : totalMDA - partUtilisateur;

    if (
      naissance.getTime() < dateRepartition.getTime() &&
      partEducationUtilisateur > 0 &&
      partEducationUtilisateur < totalMDA
    ) {
      avertissements.push('Enfant né avant le 1er avril 2010 : trimestres éducation non répartissables (tout ou rien).');
    }
    const partEducationPere =
      sexeUtilisateur === 'M' ? partEducationUtilisateur : sexeConjoint === 'M' ? totalMDA - partEducationUtilisateur : 0;
    if (naissance.getTime() < dateRepartition.getTime() && rattachement === 'both_parents' && partEducationPere > 0) {
      avertissements.push("Avant 2010, l'éducation ne va au père que s'il prouve avoir élevé seul l'enfant.");
    }

    const regimeSaisi = attribution?.regime_attribution;
    const regime: RegimeMDA =
      regimeSaisi === 'rg' || regimeSaisi === 'fp' || regimeSaisi === 'cnavpl' ? regimeSaisi : regimeParDefaut(droits);

    let materniteAdoption = 0;
    let education = 0;
    let fpMajorationDuree = 0;
    let fpBonification = 0;
    if (regime === 'fp') {
      if (naissance.getTime() >= dateFP.getTime()) {
        // Majoration réservée à la mère (enfant né après le recrutement, non vérifiable).
        if (sexePersonne === 'F' && partPersonne(partMaterniteUtilisateur) > 0) {
          fpMajorationDuree = PARAMETRES_MDA.fpTrimestresMajorationDuree;
        }
      } else if (attribution?.bonification_fp) {
        fpBonification = PARAMETRES_MDA.fpTrimestresBonification;
      }
    } else {
      materniteAdoption = partPersonne(partMaterniteUtilisateur);
      if (educationOuverte) {
        const fin =
          lien.est_decede && lien.date_deces && dateIso(lien.date_deces)
            ? new Date(Math.min(dateIso(lien.date_deces)!.getTime(), dateEffet.getTime()))
            : dateEffet;
        const anneesEducation = Math.min(PARAMETRES_MDA.trimestresEducation, anneesRevolues(naissance, fin));
        // Éducation acquise au fil des années, répartie au prorata de la part.
        education = Math.round((anneesEducation * partPersonne(partEducationUtilisateur)) / totalMDA);
      }
    }

    detail.push({
      familyLinkId: lien.id,
      prenom: lien.prenom ?? lien.nom,
      dateNaissance: lien.date_naissance!,
      regime,
      materniteAdoption,
      education,
      fpMajorationDuree,
      fpBonification,
      partMaterniteUtilisateur,
      partEducationUtilisateur,
      estAdopte,
      avertissements,
    });
  }

  const somme = (cle: (d: DetailEnfantMDA) => number) => detail.reduce((t, d) => t + cle(d), 0);
  const rgCalcule = somme((d) => (d.regime === 'rg' ? d.materniteAdoption + d.education : 0));
  const cnavplCalcule = somme((d) => (d.regime === 'cnavpl' ? d.materniteAdoption + d.education : 0));
  const fpMajorationDureeCalcule = somme((d) => d.fpMajorationDuree);
  const fpBonificationCalcule = somme((d) => d.fpBonification);
  const totalCalcule = rgCalcule + cnavplCalcule + fpMajorationDureeCalcule + fpBonificationCalcule;

  if (mdaDejaAuRis) {
    return { ...AUCUN_TRIMESTRE_ENFANT, auMoinsUn: totalCalcule > 0, detail };
  }
  return {
    rg: rgCalcule,
    cnavpl: cnavplCalcule,
    fpMajorationDuree: fpMajorationDureeCalcule,
    fpBonification: fpBonificationCalcule,
    total: totalCalcule,
    auMoinsUn: totalCalcule > 0,
    detail,
  };
}

/** Liens familiaux vus par une personne : ses enfants seulement (autres liens inchangés). */
export function liensFamiliauxDeLaPersonne(familyLinks: FamilyLink[], personne: PersonneRetraite): FamilyLink[] {
  return familyLinks.filter((lien) => lien.lien_familial !== 'Enfant' || estEnfantDeLaPersonne(lien, personne));
}
