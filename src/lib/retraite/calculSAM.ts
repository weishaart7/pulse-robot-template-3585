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
import { trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';

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

/**
 * Années exclues du pool des N meilleures années (référentiel §3.4.4),
 * avant sélection — pas un filtrage a posteriori sur `anneesRetenues`.
 *
 * Deux des quatre catégories prévues par le référentiel sont implémentées
 * ici ; les deux autres restent une dette technique documentée, faute de
 * donnée fiable (cf. docs/audit/implementation-sam-exclusions.md) :
 *
 * 1. **Année n'ayant validé aucun trimestre** : implémentée. Dérivée de
 *    `trimestresCotisesEtAssimilesDepuisCarriere()` (cotisés + assimilés
 *    === 0 pour l'année).
 * 2. **Année de la date d'effet de la pension** : implémentée, mais
 *    seulement si `dateEffet` est fourni par l'appelant. `calculerSAM()`
 *    n'a aujourd'hui aucun appelant qui dispose d'une date d'effet réelle
 *    (cf. docstring de `calculerSAM()`) — le paramètre reste donc inactif
 *    en pratique tant qu'aucun composant ne le branche.
 * 3. **Année ne comportant que des périodes assimilées** (hors IJ
 *    maternité) : **non implémentée**. Aucune donnée de ce dépôt ne permet
 *    de distinguer une IJ de congé maternité d'une maladie ordinaire
 *    (`TypeActivite` ne connaît que `'chomage'`/`'maladie'`, pas de
 *    catégorie maternité) — exclure les années "assimilé seul" sans cette
 *    distinction risquerait d'exclure à tort une maternité, ce que le
 *    référentiel interdit explicitement. Décision : ne pas exclure plutôt
 *    que sur-exclure, tant que la distinction n'existe pas.
 * 4. **Année comportant un rachat de trimestres** : **non implémentée**.
 *    Aucune donnée n'existe nulle part dans ce dépôt pour détecter un
 *    rachat sur une période de carrière donnée (le seul "rachat" du
 *    dépôt est une simulation éphémère non persistée, sans rapport avec
 *    `retraite_carriere_detail`) — nécessite une décision produit et une
 *    migration de schéma, hors périmètre d'un filtre de calcul.
 */
function anneesExclues(periodes: PeriodeCarriere[], dateEffet?: Date): Set<number> {
  const exclues = new Set<number>();

  const { parAnnee } = trimestresCotisesEtAssimilesDepuisCarriere(periodes);
  for (const { annee, cotises, assimiles } of parAnnee) {
    if (cotises + assimiles === 0) {
      exclues.add(annee);
    }
  }

  if (dateEffet) {
    exclues.add(dateEffet.getUTCFullYear());
  }

  return exclues;
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
  anneesExclues: number[];
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
 * `dateEffet` (optionnel) exclut l'année de liquidation du pool des
 * meilleures années (référentiel §3.4.4, critère 2) — cf. `anneesExclues()`
 * ci-dessus pour le détail des critères couverts et non couverts. Paramètre
 * volontairement optionnel et non branché par défaut : aucun appelant actuel
 * de cette fonction ne dispose d'une date d'effet réelle (cf.
 * docs/audit/implementation-sam-exclusions.md).
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
 * rencontrée avant que le quota ne soit rempli. Les années exclues
 * (`anneesExclues()`) restent visibles dans `anneesDisponibles` (années
 * réellement connues, pour l'affichage) mais sont retirées du pool avant la
 * sélection des N meilleures — une année exclue ne peut ni être retenue, ni
 * compter dans le quota atteint par les années projetées.
 */
export function calculerSAM(periodes: PeriodeCarriere[], anneeNaissance: number, dateEffet?: Date): ResultatSAM {
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

  // Exclusion des années hors pool AVANT sélection (référentiel §3.4.4) —
  // une année exclue reste visible dans `anneesDisponibles` (années
  // réellement connues) mais ne peut pas être retenue parmi les N
  // meilleures. Les années projetées ne sont jamais exclues : elles ne
  // représentent aucune période réelle, les 4 critères d'exclusion ne
  // s'appliquent qu'aux années issues de la carrière connue.
  const anneesExcluesSet = anneesExclues(periodes, dateEffet);
  const anneesEligibles = anneesDisponibles.filter(
    (a) => a.projete || !anneesExcluesSet.has(a.annee)
  );

  const anneesRetenues = [...anneesEligibles]
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
    anneesExclues: Array.from(anneesExcluesSet).sort((a, b) => a - b),
    nombreAnneesRequis,
    nombreAnneesProjetees: anneesRetenues.filter((a) => a.projete).length,
    ageDepartHypothese: AGE_DEPART_PAR_DEFAUT,
  };
}
