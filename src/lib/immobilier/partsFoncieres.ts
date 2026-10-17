import type { Asset } from '@/services/assetService';
import { PARTS_FONCIERES_NATURES } from '@/constants/assetTypes';
import { computeQuotePart } from './rentabilite';

// Fiche « parts foncières / forestières » (SCPI, groupements fonciers, GFA/GAF/GFV/GFR, sociétés
// d'épargne forestière) : indicateurs de rendement à partir des revenus distribués saisis dans
// Patrimoine, et régime d'imposition **indicatif**. Aucun impôt n'est calculé : le revenu imposable
// n'est pas le revenu distribué mais la quote-part du résultat de la société (attestation fiscale du
// gestionnaire), absente de l'application — cf. docs/immobilier.md.

export const isPartsFoncieres = (nature: string | null | undefined): boolean =>
  !!nature && (PARTS_FONCIERES_NATURES as readonly string[]).includes(nature);

/** Option de régime ajoutée pour les groupements forestiers (forfait cadastral, art. 76 CGI). */
export const REGIME_FORFAIT_FORESTIER = 'Revenus forestiers (forfait cadastral)';

export interface IndicateursParts {
  /** Revenus distribués sur 12 mois ÷ prix d'acquisition (null si l'un des deux manque). */
  tauxDistribution: number | null;
  /** Revenus distribués sur 12 mois ÷ valeur estimée (null si l'un des deux manque). */
  rendementActuel: number | null;
  /** Valeur estimée − coût d'acquisition, pondérés comme la Vue d'ensemble (null si non calculable). */
  plusValueLatente: number | null;
  /** Plus-value latente ÷ coût d'acquisition pondéré. */
  tauxPlusValue: number | null;
}

/**
 * Indicateurs d'une ligne de parts. Les taux portent sur les montants saisis (revenus perçus et prix
 * de la même ligne, donc sans pondération). La plus-value latente reprend la pondération de la Vue
 * d'ensemble : quote-part d'indivision × fraction de démembrement (`fraction`, barème 669 ; `null`
 * si l'âge de l'usufruitier n'est pas calculable → plus-value non calculée), frais d'acquisition non
 * pondérés par la fraction, comme `calculatePlusValue` du Résumé Patrimoine.
 */
export function computeIndicateursParts(
  asset: Pick<Asset, 'revenus_distribues_12m' | 'valeur_acquisition' | 'valeur_estimee' | 'frais_acquisition' | 'pourcentage_utilisateur' | 'pourcentage_conjoint'>,
  fraction: number | null,
): IndicateursParts {
  const revenus = asset.revenus_distribues_12m;
  const prix = asset.valeur_acquisition || 0;
  const valeur = asset.valeur_estimee || 0;

  const tauxDistribution = revenus != null && prix > 0 ? revenus / prix : null;
  const rendementActuel = revenus != null && valeur > 0 ? revenus / valeur : null;

  if (fraction === null || prix <= 0 || valeur <= 0) {
    return { tauxDistribution, rendementActuel, plusValueLatente: null, tauxPlusValue: null };
  }
  const quotePart = computeQuotePart(asset) / 100;
  const valeurPonderee = valeur * fraction * quotePart;
  const coutPondere = (prix * fraction + (asset.frais_acquisition || 0)) * quotePart;
  const plusValueLatente = valeurPonderee - coutPondere;
  return {
    tauxDistribution,
    rendementActuel,
    plusValueLatente,
    tauxPlusValue: coutPondere > 0 ? plusValueLatente / coutPondere : null,
  };
}

export type CategorieImpositionParts =
  | 'revenus_fonciers'
  | 'forfait_forestier'
  | 'scpi_fiscale'
  | 'dividendes'
  | 'autre'
  | 'non_renseigne';

/** Catégorie d'imposition déduite du régime saisi (`assets.regime_fiscal_parts`). */
export function categorieImpositionParts(regime: string | null | undefined): CategorieImpositionParts {
  if (!regime) return 'non_renseigne';
  if (regime.startsWith('Revenus fonciers')) return 'revenus_fonciers';
  if (regime === REGIME_FORFAIT_FORESTIER) return 'forfait_forestier';
  if (regime.startsWith('SCPI fiscale')) return 'scpi_fiscale';
  if (regime === 'Dividendes') return 'dividendes';
  // « Revenus forestiers » (sociétés d'épargne forestière) et « Autre » : régime non modélisé.
  return 'autre';
}

export interface RegimeImpositionParts {
  categorie: CategorieImpositionParts;
  /** Catégorie fiscale, en clair. */
  libelle: string;
  /** Où et sur quelle base le revenu se déclare. */
  declaration: string;
  /**
   * Revenus fonciers uniquement : micro-foncier possible (le foyer détient aussi un bien loué nu en
   * direct, art. 32 CGI) ou régime réel obligatoire. `null` hors revenus fonciers.
   */
  microFoncierPossible: boolean | null;
  /** Points d'attention complémentaires. */
  notes: string[];
}

/**
 * Régime d'imposition indicatif. `detientBienNuEnDirect` : le foyer loue nu au moins un bien détenu
 * en direct (hors parts de sociétés) — condition d'accès au micro-foncier pour les porteurs de parts
 * (CGI art. 32, BOI-RFPI-DECLA-10). Le seuil de 15 000 € de revenus bruts n'est pas vérifiable ici :
 * la quote-part de revenus bruts fonciers des parts n'est pas saisie.
 */
export function regimeImpositionParts(
  regime: string | null | undefined,
  detientBienNuEnDirect: boolean,
): RegimeImpositionParts {
  const categorie = categorieImpositionParts(regime);
  switch (categorie) {
    case 'revenus_fonciers':
      return {
        categorie,
        libelle: 'Revenus fonciers',
        declaration:
          "Quote-part du résultat foncier de la société, indiquée sur l'attestation fiscale du gestionnaire — et non le montant distribué.",
        microFoncierPossible: detientBienNuEnDirect,
        notes: [
          detientBienNuEnDirect
            ? "Micro-foncier possible : le foyer loue aussi un bien nu en direct (sous le seuil de 15 000 € de revenus bruts fonciers, parts comprises)."
            : "Régime réel obligatoire (déclaration 2044) : le micro-foncier n'est ouvert aux porteurs de parts que s'ils louent aussi un bien nu en direct.",
          'Les produits de trésorerie distribués relèvent des revenus de capitaux mobiliers, hors revenus fonciers.',
        ],
      };
    case 'forfait_forestier':
      return {
        categorie,
        libelle: 'Bénéfices agricoles — forfait forestier',
        declaration:
          'Forfait égal au revenu cadastral des bois (art. 76 CGI), communiqué par le gérant et déclaré sur la 2042 C PRO, dû chaque année même sans coupe ni distribution.',
        microFoncierPossible: null,
        notes: [
          'Le prix des coupes de bois n’est ni imposable ni à déclarer : le forfait couvre l’ensemble des charges.',
          'Les droits de chasse loués relèvent des revenus fonciers ; la trésorerie, des revenus de capitaux mobiliers.',
        ],
      };
    case 'scpi_fiscale':
      return {
        categorie,
        libelle: 'Revenus fonciers — SCPI fiscale',
        declaration:
          "Quote-part du résultat foncier indiquée sur l'attestation fiscale ; l'avantage fiscal (réduction ou déficit) est acquis à la souscription.",
        microFoncierPossible: null,
        notes: [
          "L'avantage est conditionné à la conservation des parts pendant la durée d'engagement du dispositif : une cession anticipée peut entraîner sa reprise.",
        ],
      };
    case 'dividendes':
      return {
        categorie,
        libelle: 'Revenus de capitaux mobiliers',
        declaration: 'Dividendes imposés au prélèvement forfaitaire unique ou, sur option, au barème.',
        microFoncierPossible: null,
        notes: [
          'Régime d’une société soumise à l’impôt sur les sociétés : un groupement foncier ou forestier est en principe fiscalement transparent — à vérifier sur l’attestation du gestionnaire.',
        ],
      };
    case 'autre':
      return {
        categorie,
        libelle: regime || 'Autre',
        declaration: "Selon l'attestation fiscale du gestionnaire.",
        microFoncierPossible: null,
        notes: [],
      };
    default:
      return {
        categorie,
        libelle: 'Non renseigné',
        declaration: 'Renseignez le régime fiscal des parts pour afficher leur imposition.',
        microFoncierPossible: null,
        notes: [],
      };
  }
}

/** Bien loué nu détenu en direct : ni parts de société foncière/forestière, ni parts de SCI. */
export const estBienNuEnDirect = (asset: Pick<Asset, 'nature' | 'type_location'>): boolean =>
  asset.type_location === 'Location nue' && !isPartsFoncieres(asset.nature) && asset.nature !== 'Parts de SCI';
