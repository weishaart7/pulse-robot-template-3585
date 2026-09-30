/**
 * Revenu net du foyer retraité (phase 3) — pensions brutes consolidées de
 * l'utilisateur et du conjoint, foyer fiscal du module Fiscalité sans les
 * enfants à charge. Extrait de `Synthese.tsx` (phase 6b) pour être partagé
 * avec la carte d'écart de revenu (`EcartRevenuRetraite.tsx`).
 */

import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';
import {
  calculerNetRetraiteFoyer,
  tauxRemplacementBrut,
  PensionsBrutesPersonne,
  ResultatNetRetraiteFoyer,
} from './calculNetRetraite';

/** Champs de la pension consolidée d'une personne utiles au calcul du net. */
export interface PensionPersonneNet {
  pensionTotaleConsolidee: number;
  repartitionParRegime: { complementaireRegimeGeneral: number };
  revenuActiviteBrutReference: number | null;
}

type ResultatPersonne = PensionPersonneNet;

// Pensions brutes séparées base / complémentaires (cotisation maladie de 1 %
// sur les seules complémentaires : Agirc-Arrco et autres régimes à points).
export const pensionsBrutes = (r: ResultatPersonne): PensionsBrutesPersonne => ({
  base: r.pensionTotaleConsolidee - r.repartitionParRegime.complementaireRegimeGeneral,
  complementaires: r.repartitionParRegime.complementaireRegimeGeneral,
});

// Situation « foyer fiscal à la retraite » (décision du 2026-09-29) : celle
// enregistrée dans le module Fiscalité, sans les enfants à charge (plus à
// charge au départ en retraite — choix prudent, l'impôt ne peut être que
// surestimé).
export const foyerSansEnfantsACharge = (foyer: FoyerFiscalInput, situationFamille: FoyerFiscalInput['situationFamille']): FoyerFiscalInput => ({
  ...foyer,
  situationFamille,
  enfantsCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
});

export const FOYER_PAR_DEFAUT: FoyerFiscalInput = {
  situationFamille: 'celibataire',
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
};

export type LigneRevenuNet = { titre: string; resultat: ResultatNetRetraiteFoyer; tauxRemplacement: number | null };

export const remplacement = (r: ResultatPersonne) => tauxRemplacementBrut(r.pensionTotaleConsolidee, r.revenuActiviteBrutReference);

// Revenu net du foyer actuel (phase 3) : foyer commun si marié ou pacsé dans
// le module Fiscalité, sinon foyers séparés. Partagé par la carte « Revenu
// net » et la carte « Protection du conjoint survivant » (net du couple).
export const lignesRevenuNet = (
  utilisateur: ResultatPersonne,
  conjoint: ResultatPersonne | null,
  foyerSaisi: FoyerFiscalInput | null,
  nomUtilisateur: string,
  nomConjoint: string
): LigneRevenuNet[] => {
  const impositionCommune =
    conjoint !== null && (foyerSaisi?.situationFamille === 'marie' || foyerSaisi?.situationFamille === 'pacse');
  let lignes: LigneRevenuNet[];
  if (impositionCommune && foyerSaisi && conjoint) {
    const foyer = foyerSansEnfantsACharge(foyerSaisi, foyerSaisi.situationFamille);
    lignes = [
      {
        titre: `Foyer fiscal commun (${nomUtilisateur} et ${nomConjoint})`,
        resultat: calculerNetRetraiteFoyer(
          [pensionsBrutes(utilisateur), pensionsBrutes(conjoint)],
          calculerPartsFiscales(foyer),
          foyer.situationFamille
        ),
        tauxRemplacement: null,
      },
    ];
  } else {
    // Foyers séparés : concubins, ou foyer fiscal non renseigné dans Fiscalité.
    const situationUtilisateur =
      foyerSaisi && !['marie', 'pacse'].includes(foyerSaisi.situationFamille) ? foyerSaisi.situationFamille : 'celibataire';
    const foyerUtilisateur = foyerSansEnfantsACharge(foyerSaisi ?? FOYER_PAR_DEFAUT, situationUtilisateur);
    const foyerConjoint = foyerSansEnfantsACharge(FOYER_PAR_DEFAUT, 'celibataire');
    lignes = [
      {
        titre: nomUtilisateur,
        resultat: calculerNetRetraiteFoyer([pensionsBrutes(utilisateur)], calculerPartsFiscales(foyerUtilisateur), situationUtilisateur),
        tauxRemplacement: remplacement(utilisateur),
      },
      ...(conjoint !== null
        ? [
            {
              titre: nomConjoint,
              resultat: calculerNetRetraiteFoyer([pensionsBrutes(conjoint)], calculerPartsFiscales(foyerConjoint), 'celibataire' as const),
              tauxRemplacement: remplacement(conjoint),
            },
          ]
        : []),
    ];
  }

  return lignes;
};

