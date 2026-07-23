/**
 * Calcul du salaire annuel moyen (SAM) réglementaire : moyenne des N
 * meilleures années de revenu du régime de base (N selon la génération),
 * chaque année revalorisée (coefficient CNAV) puis plafonnée au plafond
 * annuel de la Sécurité sociale (PASS) de l'année concernée. Complète les
 * années manquantes par une projection à revenu constant si la carrière
 * connue est plus courte que le nombre d'années requis.
 * Fonctions pures, sans JSX ni state React — sur le modèle de calcul.ts.
 */

import { PeriodeCarriere } from './parseRIS';
import { COEFFICIENT_REVALORISATION_CNAV } from './coefficientsRevalorisationCNAV';
import { dureeSAMPourGeneration } from './dureeSAMParGeneration';

/**
 * Plafond annuel de la Sécurité sociale (PASS), par année.
 * Source : valeurs officielles publiées par l'Urssaf/Sécurité sociale.
 */
export const PASS_PAR_ANNEE: Record<number, number> = {
  2018: 39732,
  2019: 40524,
  2020: 41136,
  2021: 41136,
  2022: 41136,
  2023: 43992,
  2024: 46368,
  2025: 47100,
};

/**
 * Âge de départ par défaut utilisé pour borner la projection des années
 * futures, en l'absence de toute hypothèse de départ personnalisée — âge du
 * taux plein automatique (67 ans, aucune décote quel que soit le nombre de
 * trimestres), à distinguer de l'âge légal (64 ans, âge minimum de départ
 * avec décote possible si les trimestres ne sont pas atteints). Décidé le
 * 2026-07-23 : à cette date, aucune logique d'âge de départ réellement
 * calculée à partir de la date de naissance n'existe ailleurs dans le module
 * Retraite (`ageTauxPlein` dans Carriere.tsx est un texte statique non relié
 * à la date de naissance) — à remplacer si une telle hypothèse personnalisée
 * (date de départ réelle choisie par le client) devient disponible.
 */
const AGE_DEPART_PAR_DEFAUT = 67;

// Le RIS ne fournit qu'un libellé de régime en texte libre ("L'Assurance
// retraite", "L’Assurance retraite" avec apostrophe typographique, parfois
// suivi d'autres régimes) — recherche par motif plutôt que par égalité
// stricte pour être insensible à la variante d'apostrophe et à la casse.
const RE_REGIME_ASSURANCE_RETRAITE = /assurance retraite/i;

function estPeriodeRegimeDeBase(periode: PeriodeCarriere): boolean {
  return periode.regimes.some((regime) => RE_REGIME_ASSURANCE_RETRAITE.test(regime));
}

/**
 * Répartit le revenu d'une période entre les années civiles qu'elle
 * traverse, au prorata du nombre de jours de la période dans chaque année
 * (et non au prorata du nombre de mois, pour rester exact sur des périodes
 * commençant/finissant en milieu de mois).
 */
function repartirRevenuParAnnee(periode: PeriodeCarriere, revenuParAnnee: Map<number, number>): void {
  const debut = new Date(`${periode.dateDebut}T00:00:00Z`);
  const fin = new Date(`${periode.dateFin}T00:00:00Z`);
  // Un revenu absent du RIS (période non rémunérée : chômage, maladie...)
  // contribue 0 à la somme annuelle, sans jamais réécrire periode.revenu :
  // le `null` d'origine reste la donnée affichée ailleurs (ex: sous-section
  // "Détail de carrière").
  const revenu = periode.revenu ?? 0;

  const anneeDebut = debut.getUTCFullYear();
  const anneeFin = fin.getUTCFullYear();

  if (anneeDebut === anneeFin) {
    revenuParAnnee.set(anneeDebut, (revenuParAnnee.get(anneeDebut) || 0) + revenu);
    return;
  }

  const unJourMs = 24 * 60 * 60 * 1000;
  const joursTotal = Math.round((fin.getTime() - debut.getTime()) / unJourMs) + 1;

  for (let annee = anneeDebut; annee <= anneeFin; annee++) {
    const borneDebut = annee === anneeDebut ? debut : new Date(Date.UTC(annee, 0, 1));
    const borneFin = annee === anneeFin ? fin : new Date(Date.UTC(annee, 11, 31));
    const joursDansCetteAnnee = Math.round((borneFin.getTime() - borneDebut.getTime()) / unJourMs) + 1;
    const part = revenu * (joursDansCetteAnnee / joursTotal);
    revenuParAnnee.set(annee, (revenuParAnnee.get(annee) || 0) + part);
  }
}

export interface AnneeSAM {
  annee: number;
  revenuBrut: number;
  revenuRevalorise: number;
  revenuPlafonne: number;
  projete: boolean;
}

export interface ResultatSAM {
  sam: number;
  anneesRetenues: AnneeSAM[];
  anneesDisponibles: AnneeSAM[];
  nombreAnneesRequis: number;
  nombreAnneesProjetees: number;
  ageDepartHypothese: number;
}

/**
 * Calcule le SAM à partir des périodes de carrière extraites du RIS et de
 * l'année de naissance du client (détermine le nombre d'années requis et
 * l'année de départ en retraite prévue pour la projection). Ne retient que
 * les périodes rattachées au régime de base ("L'Assurance retraite") : les
 * lignes Agirc-Arrco-only issues du doublon régime/revenu du RIS (même
 * employeur, mêmes dates, deux lignes une par régime) sont exclues pour ne
 * pas fausser le revenu réel de la période.
 *
 * Quand la carrière connue est plus courte que le nombre d'années requis,
 * complète avec des années "projetées" (revenu constant = dernière année
 * connue, déjà revalorisée/plafonnée) pour CHAQUE année manquante jusqu'à
 * l'année de départ en retraite prévue (naissance + 67 ans) — pas seulement
 * assez d'années pour atteindre le quota requis. La sélection des N
 * meilleures années s'effectue ensuite sur l'ensemble complet (réel +
 * projeté), fidèle au mécanisme réel du calcul CNAV qui sélectionne toujours
 * parmi tout ce qui est disponible plutôt que de s'arrêter au premier compte
 * atteint : une mauvaise année réelle (ex: arrêt maladie longue durée à
 * faible revenu) peut ainsi être exclue au profit d'une année projetée plus
 * favorable, au lieu d'être conservée simplement parce qu'elle a été
 * rencontrée avant que le quota ne soit rempli.
 */
export function calculerSAM(periodes: PeriodeCarriere[], anneeNaissance: number): ResultatSAM {
  const periodesRegimeDeBase = periodes.filter(estPeriodeRegimeDeBase);

  const revenuParAnnee = new Map<number, number>();
  for (const periode of periodesRegimeDeBase) {
    repartirRevenuParAnnee(periode, revenuParAnnee);
  }

  // Revalorisation (coefficient CNAV) PUIS plafonnement (PASS) — l'ordre
  // compte : plafonner avant revalorisation minorerait à tort des revenus
  // qui, une fois revalorisés, auraient dépassé le plafond.
  const anneesConnues: AnneeSAM[] = Array.from(revenuParAnnee.entries())
    .map(([annee, revenuBrut]) => {
      const coefficient = COEFFICIENT_REVALORISATION_CNAV[annee] ?? 1;
      const revenuRevalorise = revenuBrut * coefficient;
      const plafond = PASS_PAR_ANNEE[annee];
      const revenuPlafonne = plafond !== undefined ? Math.min(revenuRevalorise, plafond) : revenuRevalorise;
      return { annee, revenuBrut, revenuRevalorise, revenuPlafonne, projete: false };
    })
    .sort((a, b) => a.annee - b.annee);

  const nombreAnneesRequis = dureeSAMPourGeneration(anneeNaissance);
  const anneeDepartPrevue = anneeNaissance + AGE_DEPART_PAR_DEFAUT;

  const anneesProjetees: AnneeSAM[] = [];
  if (anneesConnues.length > 0 && anneesConnues.length < nombreAnneesRequis) {
    const derniereAnneeConnue = anneesConnues[anneesConnues.length - 1];
    for (let annee = derniereAnneeConnue.annee + 1; annee <= anneeDepartPrevue; annee++) {
      anneesProjetees.push({
        annee,
        revenuBrut: derniereAnneeConnue.revenuBrut,
        revenuRevalorise: derniereAnneeConnue.revenuRevalorise,
        revenuPlafonne: derniereAnneeConnue.revenuPlafonne,
        projete: true,
      });
    }
  }

  const anneesDisponibles = [...anneesConnues, ...anneesProjetees].sort((a, b) => a.annee - b.annee);

  const anneesRetenues = [...anneesDisponibles]
    .sort((a, b) => b.revenuPlafonne - a.revenuPlafonne)
    .slice(0, nombreAnneesRequis)
    .sort((a, b) => a.annee - b.annee);

  const sam =
    anneesRetenues.length > 0
      ? anneesRetenues.reduce((total, a) => total + a.revenuPlafonne, 0) / anneesRetenues.length
      : 0;

  return {
    sam,
    anneesRetenues,
    anneesDisponibles,
    nombreAnneesRequis,
    nombreAnneesProjetees: anneesRetenues.filter((a) => a.projete).length,
    ageDepartHypothese: AGE_DEPART_PAR_DEFAUT,
  };
}
