/**
 * Hypothèse de revenu pour les années futures manquantes (entre l'année en
 * cours et l'année de départ légal en retraite) — permet d'estimer les
 * trimestres futurs et la pension pour un profil dont la carrière connue
 * (RIS) s'arrête avant l'âge légal réel. Fonctions pures, sans JSX ni state
 * React — sur le modèle de calculSAM.ts.
 *
 * Deux modes (cf. Synthese.tsx pour le toggle) :
 * - `derniere_annee_connue` : revenu dérivé automatiquement de la dernière
 *   année du RIS ayant validé au moins un trimestre, annualisé si l'année
 *   était partielle.
 * - `revenu_moyen_projete` : revenu saisi manuellement par le conseiller.
 *
 * Chaque année manquante ainsi projetée est comptée comme 4 trimestres
 * validés (hypothèse de carrière continue) — volontairement PAS recalculée
 * via `trimestresCotisesEtAssimilesDepuisCarriere()` : le barème de seuil de
 * validation (`SEUIL_VALIDATION_TRIMESTRE_PAR_ANNEE`) ne couvre que jusqu'à
 * 2026, une année future au-delà retomberait à tort sur 0 trimestre validé.
 */

import { PeriodeCarriere } from './parseRIS';
import { ResultatTrimestresCotisesEtAssimiles, trimestresCotisesEtAssimilesDepuisCarriere } from './calculTrimestres';
import { DateNaissance, ageLegalPourGeneration, dateAnniversaireLegal } from './calcul';
import { calculerSAM } from './calculSAM';

export type ModeHypotheseRevenuFutur = 'derniere_annee_connue' | 'revenu_moyen_projete';

/**
 * Dernière année du `parAnnee` (triée croissante par l'appelant, cf.
 * `trimestresCotisesEtAssimilesDepuisCarriere()`) ayant validé au moins un
 * trimestre (cotisé ou assimilé) — recule tant qu'une année a 0 trimestre,
 * conformément au besoin fonctionnel. `null` si aucune année du RIS n'a de
 * trimestre validé (RIS vide ou inexploitable).
 */
export function derniereAnneeAvecTrimestreValide(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee']
): ResultatTrimestresCotisesEtAssimiles['parAnnee'][number] | null {
  for (let i = parAnnee.length - 1; i >= 0; i--) {
    const annee = parAnnee[i];
    if (annee.cotises + annee.assimiles > 0) return annee;
  }
  return null;
}

/**
 * Revenu annuel hypothèse en mode "dernière année connue" : revenu de la
 * dernière année validée, ramené à un équivalent 12 mois si l'année était
 * partielle (`revenu_annualisé = revenu_année ÷ (trimestres_validés × 3) ×
 * 12`). `trimestres_validés` = cotisés + assimilés de cette année (déjà
 * plafonné à 4 par `trimestresCotisesEtAssimilesDepuisCarriere()`).
 *
 * `null` si aucune année n'a de trimestre validé — cas limite RIS vide, à
 * l'appelant de basculer sur le mode manuel dans ce cas (cf. Synthese.tsx).
 */
export function revenuAnnuelHypotheseDerniereAnneeConnue(
  parAnnee: ResultatTrimestresCotisesEtAssimiles['parAnnee']
): number | null {
  const derniereAnnee = derniereAnneeAvecTrimestreValide(parAnnee);
  if (derniereAnnee === null) return null;

  const trimestresValides = derniereAnnee.cotises + derniereAnnee.assimiles;
  return (derniereAnnee.revenuCotise / (trimestresValides * 3)) * 12;
}

/**
 * Années à projeter, de `anneeCourante` (incluse) à `anneeRetraite` (incluse)
 * — liste vide si `anneeRetraite < anneeCourante` (taux plein déjà atteint ou
 * âge légal déjà dépassé).
 */
export function anneesManquantes(anneeCourante: number, anneeRetraite: number): number[] {
  const annees: number[] = [];
  for (let annee = anneeCourante; annee <= anneeRetraite; annee++) {
    annees.push(annee);
  }
  return annees;
}

/**
 * Trimestres validés apportés par les années manquantes projetées — 4 par
 * année (hypothèse de carrière continue), cf. docstring de ce fichier pour
 * pourquoi ce n'est pas dérivé du moteur à seuil de calculTrimestres.ts.
 */
export function trimestresProjetesAnneesManquantes(annees: number[]): number {
  return annees.length * 4;
}

/**
 * Construit des `PeriodeCarriere` synthétiques (une par année manquante,
 * année civile complète, régime de base) pour injection dans
 * `calculerSAM()` aux côtés des périodes réelles du RIS — seul usage prévu
 * de ces périodes synthétiques : ne jamais les persister ni les mélanger au
 * `detailCarriere` affiché/enregistré sur l'écran Carrière.
 */
export function periodesSynthetiquesAnneesManquantes(annees: number[], revenuHypothese: number): PeriodeCarriere[] {
  return annees.map((annee) => ({
    employeur: 'Hypothèse de revenu futur',
    typeActivite: 'employeur',
    dateDebut: `${annee}-01-01`,
    dateFin: `${annee}-12-31`,
    revenu: revenuHypothese,
    estChiffreAffaires: false,
    regimes: ["L'Assurance retraite"],
  }));
}

export interface ProjectionRevenuFutur {
  salaireAnnuelMoyenProjete: number;
  trimestresValidesProjetes: number;
}

/**
 * Glue de la projection de revenu futur — orchestre les fonctions pures
 * ci-dessus (`anneesManquantes`, `trimestresProjetesAnneesManquantes`,
 * `periodesSynthetiquesAnneesManquantes`, `revenuAnnuelHypotheseDerniereAnneeConnue`)
 * pour produire un salaire annuel moyen et un nombre de trimestres projetés,
 * à ajouter aux valeurs réelles avant de les passer à
 * `calculerPensionConsolidee()`.
 *
 * Extraite pour être appelée à l'identique par `usePensionConsolidee.ts`
 * (Synthèse) et par `Carriere.tsx` (cf.
 * docs/audit/audit-pension-consolidation.md, étape 2 de la fusion) — un seul
 * endroit où corriger cette logique si elle évolue, plutôt que deux copies
 * à faire diverger.
 */
export function calculerProjectionRevenuFutur(
  dateNaissance: DateNaissance | null,
  detailCarriere: PeriodeCarriere[],
  salaireAnnuelMoyen: number,
  modeHypothese: ModeHypotheseRevenuFutur,
  revenuHypotheseManuel: number | null,
  dateEffet: Date
): ProjectionRevenuFutur {
  const anneeLegaleResultat = dateNaissance ? ageLegalPourGeneration(dateNaissance, dateEffet) : null;
  const anneeRetraite =
    dateNaissance && anneeLegaleResultat?.stable
      ? dateAnniversaireLegal(dateNaissance, anneeLegaleResultat.age).getUTCFullYear()
      : null;
  const anneeCourante = dateEffet.getUTCFullYear();
  const anneesManquantesListe = anneeRetraite !== null ? anneesManquantes(anneeCourante, anneeRetraite) : [];

  const resultatTrimestresPourHypothese = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);
  const revenuHypothese =
    modeHypothese === 'derniere_annee_connue'
      ? revenuAnnuelHypotheseDerniereAnneeConnue(resultatTrimestresPourHypothese.parAnnee)
      : revenuHypotheseManuel;

  const projectionApplicable =
    revenuHypothese !== null && revenuHypothese > 0 && anneesManquantesListe.length > 0 && dateNaissance !== null;

  const trimestresValidesProjetes = projectionApplicable
    ? trimestresProjetesAnneesManquantes(anneesManquantesListe)
    : 0;

  if (!projectionApplicable || !dateNaissance) {
    return { salaireAnnuelMoyenProjete: salaireAnnuelMoyen, trimestresValidesProjetes };
  }

  const periodesSynthetiques = periodesSynthetiquesAnneesManquantes(anneesManquantesListe, revenuHypothese!);
  const salaireAnnuelMoyenProjete = calculerSAM(
    [...detailCarriere, ...periodesSynthetiques],
    dateNaissance.annee,
    undefined,
    anneeRetraite!
  ).sam;

  return { salaireAnnuelMoyenProjete, trimestresValidesProjetes };
}
