/**
 * Pension consolidée tous régimes, pour l'écran Synthèse.tsx.
 *
 * ⚠️ DETTE TECHNIQUE ASSUMÉE (cf. docs/audit/audit-retraite.md §5, entrée
 * 2026-08-15) : cette fonction reproduit fidèlement le pipeline aujourd'hui
 * codé en ligne dans Carriere.tsx (régime général : lignes ~307-732) et dans
 * le corps de CarriereFonctionPublique.tsx / CarriereCNAVPL.tsx (FP/CNAVPL)
 * — Carriere.tsx n'a PAS été refactorée pour consommer cette fonction dans
 * cette session, par prudence sur un écran déjà en production. Les deux
 * implémentations coexistent et peuvent diverger si l'une est corrigée sans
 * l'autre : fusion à traiter dans un chantier dédié.
 *
 * Fonctions pures, sans JSX ni state React — orchestre calcul.ts,
 * calculFonctionPublique.ts et calculCNAVPL.ts, sur le modèle attendu par
 * CLAUDE.md (types + fonctions pures, pas de logique métier dans les
 * composants React).
 */

import { RegimeDetecte, PeriodeCarriere } from './parseRIS';
import { FamilyLink } from '@/services/familyService';
import {
  DateNaissance,
  AgeLegalResultat,
  tauxProratisation,
  decoteSurTrimestres,
  decoteSurAge,
  decoteApplicable,
  pensionBase,
  pensionComplementaireAnnuelle,
  minimumContributif,
  majorationPalier2MICO,
  ecretementMICO,
  ageLegalAtteint,
  ageLegalParentaleEligible,
  dateAnniversaireLegal,
  ageLegalPourGeneration,
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
  majorationTroisEnfants,
  pensionTotaleConsolideeTousRegimes,
} from './calcul';
import {
  trimestresCotisesEtAssimilesDepuisCarriere,
  ResultatTrimestresCotisesEtAssimiles,
} from './calculTrimestres';
import { nombreEnfantsEligiblesMajorationTroisEnfants } from './enfantsEligiblesMajoration';
import {
  pensionBaseFonctionPublique,
  decoteSurAgeFonctionPublique,
  tauxDecoteParTrimestreFonctionPublique,
  minimumGaranti,
  pensionFonctionPubliqueFinale,
  majorationEnfantsFonctionPublique,
  pensionFonctionPubliqueAvecMajorationEnfants,
  VALEUR_REFERENCE_MIGA_ANNUELLE_2025,
} from './calculFonctionPublique';
import { pensionBaseCNAVPL } from './calculCNAVPL';
import { decoteSurTrimestresPlafond25 } from './calcul';

const VALEUR_SERVICE_POINT_RAFP_2026 = 0.05671;

export interface DonneesFonctionPublique {
  traitementIndiciaireBrut: number;
  trimestresLiquidables: number;
  pointsRAFP: number;
  departAnticipeCategorieActive: boolean;
  ageDepartAnticipe?: number;
  ageAnnulationDecote?: number;
  departPourInvalidite: boolean;
  anneeOuvertureDroits?: number;
}

export interface DonneesCNAVPL {
  trimestresCNAVPL: number;
  pointsCNAVPL: number;
  valeurPointCNAVPL: number;
}

export interface EntreePensionConsolidee {
  salaireAnnuelMoyen: number;
  trimestresValides: number;
  trimestresRequis: number;
  dateNaissance: DateNaissance | null;
  ageActuel: number | null;
  regimesPoints: RegimeDetecte[];
  detailCarriere: PeriodeCarriere[];
  familyLinks: FamilyLink[];
  auMoinsUnTrimestreMajorationEnfant: boolean;
  autresPensionsMensuelles: number;
  fonctionPublique: DonneesFonctionPublique | null;
  cnavpl: DonneesCNAVPL | null;
}

// Sous-totaux annuels par régime — exposés pour l'annexe de l'export PDF
// (cf. Synthese.tsx), déjà calculés en interne par calculerPensionConsolidee
// mais jusqu'ici non retournés.
export interface RepartitionParRegime {
  baseRegimeGeneral: number;
  complementaireRegimeGeneral: number;
  fonctionPublique: number;
  rafp: number;
  cnavpl: number;
}

export interface ResultatPensionConsolidee {
  pensionTotaleConsolidee: number;
  ageTauxPlein: string;
  repartitionParRegime: RepartitionParRegime;
  historiqueTrimestres: ResultatTrimestresCotisesEtAssimiles;
  ageLegal: AgeLegalResultat | null;
}

function calculerResultatFonctionPublique(
  donnees: DonneesFonctionPublique,
  trimestresRequis: number,
  trimestresAutresRegimes: number,
  dateNaissance: DateNaissance | null,
  auMoinsUnTrimestreMajorationEnfant: boolean,
  nombreEnfantsEligibles: number
): { pensionFinale: number; rafpAnnuelle: number } {
  const tauxDecoteParTrimestre = tauxDecoteParTrimestreFonctionPublique(donnees.anneeOuvertureDroits);
  const taux = tauxProratisation(donnees.trimestresLiquidables, trimestresRequis);
  const decoteTrimestres = Math.min(
    decoteSurTrimestresPlafond25(donnees.trimestresLiquidables + trimestresAutresRegimes, trimestresRequis),
    0
  );

  const decoteAgeUtilisable =
    donnees.departAnticipeCategorieActive &&
    donnees.ageDepartAnticipe !== undefined &&
    !Number.isNaN(donnees.ageDepartAnticipe) &&
    donnees.ageAnnulationDecote !== undefined &&
    !Number.isNaN(donnees.ageAnnulationDecote);
  const decote = decoteAgeUtilisable
    ? decoteApplicable(
        decoteTrimestres,
        decoteSurAgeFonctionPublique(donnees.ageDepartAnticipe!, donnees.ageAnnulationDecote!, tauxDecoteParTrimestre)
      )
    : decoteTrimestres;

  const pensionCalculee = pensionBaseFonctionPublique(donnees.traitementIndiciaireBrut, taux, decote);
  const minimumGarantiValue = minimumGaranti(
    donnees.trimestresLiquidables,
    trimestresRequis,
    VALEUR_REFERENCE_MIGA_ANNUELLE_2025,
    donnees.departPourInvalidite
  );
  const pensionApresMiga = pensionFonctionPubliqueFinale(pensionCalculee, minimumGarantiValue);

  const pensionCalculeeAvantDecote = pensionBaseFonctionPublique(donnees.traitementIndiciaireBrut, taux, 0);
  const dateEffetProxy = new Date();
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = donnees.trimestresLiquidables + trimestresAutresRegimes >= trimestresRequis;
  const trimestresCotisesAnneeReference = 0;
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    trimestresCotisesAnneeReference,
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReference
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, false);
  const surcoteMontant = pensionCalculeeAvantDecote * (surcoteTotalePct / 100);
  const pensionApresSurcote = pensionApresMiga + surcoteMontant;

  const majorationEnfantsPct = majorationEnfantsFonctionPublique(nombreEnfantsEligibles);
  const pensionFinale = pensionFonctionPubliqueAvecMajorationEnfants(
    pensionApresSurcote,
    majorationEnfantsPct,
    donnees.traitementIndiciaireBrut
  );

  const rafpAnnuelle =
    pensionComplementaireAnnuelle({
      nom: 'RAFP',
      type: 'points',
      points: donnees.pointsRAFP,
      valeurPoint: VALEUR_SERVICE_POINT_RAFP_2026,
    }) ?? 0;

  return { pensionFinale, rafpAnnuelle };
}

function calculerResultatCNAVPL(
  donnees: DonneesCNAVPL,
  trimestresRequis: number,
  trimestresAutresRegimes: number,
  dateNaissance: DateNaissance | null,
  auMoinsUnTrimestreMajorationEnfant: boolean,
  nombreEnfantsEligibles: number
): { pensionFinale: number } {
  const decoteSeule = Math.min(
    decoteSurTrimestresPlafond25(donnees.trimestresCNAVPL + trimestresAutresRegimes, trimestresRequis),
    0
  );

  const pensionAvantDecoteSurcote = pensionBaseCNAVPL(donnees.pointsCNAVPL, donnees.valeurPointCNAVPL, 0);
  const pensionApresDecote = pensionBaseCNAVPL(donnees.pointsCNAVPL, donnees.valeurPointCNAVPL, decoteSeule);
  const dateEffetProxy = new Date();
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = donnees.trimestresCNAVPL + trimestresAutresRegimes >= trimestresRequis;
  const trimestresCotisesAnneeReference = 0;
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    trimestresCotisesAnneeReference,
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReference
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);
  const surcoteMontant = pensionAvantDecoteSurcote * (surcoteTotalePct / 100);
  const pensionApresSurcote = pensionApresDecote + surcoteMontant;

  const majorationEnfantsPct = majorationTroisEnfants(nombreEnfantsEligibles);
  const pensionFinale = pensionApresSurcote * (1 + majorationEnfantsPct / 100);

  return { pensionFinale };
}

/**
 * Âge du taux plein, même texte binaire que Carriere.tsx (ni l'un ni l'autre
 * ne calcule un âge légal réel — cf. docs/audit/audit-retraite.md §5,
 * entrée Carriere.tsx:171-172, dette non résolue par cette fonction).
 */
export function ageTauxPleinAffiche(trimestresValides: number, trimestresRequis: number): string {
  return trimestresValides >= trimestresRequis
    ? 'Taux plein atteint avec les trimestres validés'
    : '67 ans (âge automatique du taux plein)';
}

export function calculerPensionConsolidee(entree: EntreePensionConsolidee): ResultatPensionConsolidee {
  const {
    salaireAnnuelMoyen,
    trimestresValides,
    trimestresRequis,
    dateNaissance,
    ageActuel,
    regimesPoints,
    detailCarriere,
    familyLinks,
    auMoinsUnTrimestreMajorationEnfant,
    autresPensionsMensuelles,
    fonctionPublique,
    cnavpl,
  } = entree;

  const hasFonctionPublique = fonctionPublique !== null;
  const hasCNAVPL = cnavpl !== null;

  const trimestresTousRegimes =
    trimestresValides +
    (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0) +
    (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0);

  const taux = salaireAnnuelMoyen > 0 && trimestresValides > 0 ? tauxProratisation(trimestresValides, trimestresRequis) : 0;
  const pensionBaseBrute = salaireAnnuelMoyen > 0 && trimestresValides > 0 ? pensionBase(salaireAnnuelMoyen, taux, 0) : 0;

  const trimAutresRegimes =
    (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0) +
    (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0);
  const decoteTrimestresSeule = Math.min(
    decoteSurTrimestres(trimestresValides + trimAutresRegimes, trimestresRequis),
    0
  );
  const decoteSurcote =
    ageActuel !== null ? decoteApplicable(decoteTrimestresSeule, decoteSurAge(ageActuel)) : decoteTrimestresSeule;

  const resultatTrimestresDetailCarriere = trimestresCotisesEtAssimilesDepuisCarriere(detailCarriere);

  const dateEffetProxy = new Date();
  const ageLegalResultat = dateNaissance ? ageLegalPourGeneration(dateNaissance, dateEffetProxy) : null;
  const ageLegalAtteintFlag = dateNaissance ? ageLegalAtteint(dateNaissance, dateEffetProxy) : undefined;
  const ageLegalParentaleEligibleFlag = dateNaissance
    ? ageLegalParentaleEligible(dateNaissance, dateEffetProxy)
    : undefined;
  const dureeRequiseAtteinte = trimestresValides >= trimestresRequis;
  const anneeReferenceSurcote =
    ageLegalResultat?.stable && dateNaissance
      ? dateAnniversaireLegal(dateNaissance, ageLegalResultat.age).getUTCFullYear() - 1
      : null;
  const trimestresCotisesAnneeReference =
    anneeReferenceSurcote !== null
      ? resultatTrimestresDetailCarriere.parAnnee.find((a) => a.annee === anneeReferenceSurcote)?.cotises ?? 0
      : 0;
  const surcoteClassiquePct = surcotePourTrimestresCotises(
    trimestresCotisesAnneeReference,
    ageLegalAtteintFlag,
    dureeRequiseAtteinte
  );
  const surcoteParentalePct = surcoteParentale(
    auMoinsUnTrimestreMajorationEnfant,
    ageLegalParentaleEligibleFlag,
    dureeRequiseAtteinte,
    trimestresCotisesAnneeReference
  );
  const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);

  const micoMontant = minimumContributif(trimestresValides, trimestresRequis, decoteSurcote, trimestresTousRegimes);
  const pensionBaseHorsMicoHorsSurcote = pensionBaseBrute * (1 + decoteSurcote / 100);
  const majorationPalier1 = Math.max(0, micoMontant - pensionBaseHorsMicoHorsSurcote);

  const trimestresCotisesRegimeGeneral = resultatTrimestresDetailCarriere.cotises;
  const majorationPalier2 = majorationPalier2MICO(
    trimestresCotisesRegimeGeneral,
    trimestresValides,
    trimestresRequis,
    decoteSurcote,
    trimestresTousRegimes
  );

  const autresPensionsAnnuelles = autresPensionsMensuelles * 12;
  const majorationMicoTotaleAvantEcretement = majorationPalier1 + majorationPalier2;
  const majorationMicoTotaleApresEcretement = ecretementMICO(
    pensionBaseHorsMicoHorsSurcote,
    majorationMicoTotaleAvantEcretement,
    autresPensionsAnnuelles
  );

  const pensionApresMico = pensionBaseHorsMicoHorsSurcote + majorationMicoTotaleApresEcretement;
  const surcoteMontantRegimeGeneral = pensionBaseBrute * (surcoteTotalePct / 100);
  const pensionApresSurcoteRegimeGeneral = pensionApresMico + surcoteMontantRegimeGeneral;

  const nombreEnfantsEligibles = nombreEnfantsEligiblesMajorationTroisEnfants(familyLinks);
  const majorationEnfantsPct = majorationTroisEnfants(nombreEnfantsEligibles);
  const pensionBaseAjustee = pensionApresSurcoteRegimeGeneral * (1 + majorationEnfantsPct / 100);

  const totalPensionComplementaireAnnuelle = regimesPoints.reduce((total, regime) => {
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);

  const pensionTotaleRegimeGeneral = pensionBaseAjustee + totalPensionComplementaireAnnuelle;

  const resultatFonctionPublique = hasFonctionPublique
    ? calculerResultatFonctionPublique(
        fonctionPublique!,
        trimestresRequis,
        trimestresValides + (hasCNAVPL ? cnavpl!.trimestresCNAVPL : 0),
        dateNaissance,
        auMoinsUnTrimestreMajorationEnfant,
        nombreEnfantsEligibles
      )
    : { pensionFinale: 0, rafpAnnuelle: 0 };

  const resultatCNAVPL = hasCNAVPL
    ? calculerResultatCNAVPL(
        cnavpl!,
        trimestresRequis,
        trimestresValides + (hasFonctionPublique ? fonctionPublique!.trimestresLiquidables : 0),
        dateNaissance,
        auMoinsUnTrimestreMajorationEnfant,
        nombreEnfantsEligibles
      )
    : { pensionFinale: 0 };

  const pensionTotaleConsolidee = pensionTotaleConsolideeTousRegimes(
    pensionTotaleRegimeGeneral,
    hasFonctionPublique,
    resultatFonctionPublique,
    hasCNAVPL,
    resultatCNAVPL
  );

  return {
    pensionTotaleConsolidee,
    ageTauxPlein: ageTauxPleinAffiche(trimestresValides, trimestresRequis),
    repartitionParRegime: {
      baseRegimeGeneral: pensionBaseAjustee,
      complementaireRegimeGeneral: totalPensionComplementaireAnnuelle,
      fonctionPublique: resultatFonctionPublique.pensionFinale,
      rafp: resultatFonctionPublique.rafpAnnuelle,
      cnavpl: resultatCNAVPL.pensionFinale,
    },
    historiqueTrimestres: resultatTrimestresDetailCarriere,
    ageLegal: ageLegalResultat,
  };
}
