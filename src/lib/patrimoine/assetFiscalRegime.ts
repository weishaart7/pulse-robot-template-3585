import { FiscalRegimeResult, resolveEffectiveNature, computeFiscalRegime, PFU_IR, PFU_PS, PFU_RATE } from './regimeFiscalPlusValue';
import { computePVIRegime, computeCorporelRegime, NATURE_SCI } from './regimeFiscalPVI';
import { computeRetraiteRegime } from './regimeFiscalRetraite';
import { ORIGINES_PROPRES } from './qualification';

export interface ResolveAssetFiscalRegimeInput {
  nature: string;
  ctoMultiActifs?: boolean;
  ctoNatureSousJacent?: string;
  plusValue: number;
  valeurEstimee: number;
  dateAcquisition?: string;
  // Optionnels, pour la plus-value immobilière (forfaits, surtaxe par
  // cédant) — cf. ComputePVIRegimeInput.
  valeurAcquisition?: number;
  fraisAcquisition?: number;
  origineActif?: string[] | null;
  partsCedants?: number[];
  // Caractéristiques propres à certaines natures immobilières (cf. ComputePVIRegimeInput).
  terrainConstructible?: boolean | null;
  surfaceBoiseeHa?: number | null;
  fixeAuSol?: boolean | null;
  residenceServices?: boolean | null;
  // Parts de SCI : régime fiscal de la société liée (societes.regime_fiscal).
  regimeSociete?: string | null;
  // Épargne retraite : mode de sortie et part des versements déduits (cf. regimeFiscalRetraite.ts).
  modeSortie?: string | null;
  versementsDeduitsPct?: number | null;
  // Droits sociaux / parts de holding : cession au départ à la retraite (150-0 D ter).
  cessionDepartRetraite?: boolean | null;
}

const REGIME_IS = 'Impôt sur les sociétés';
const REGIME_IR = 'Impôt sur le revenu';

// Acquisition à titre onéreux (forfait 7,5 % de frais applicable) : origine
// non renseignée (défaut du formulaire) ou sans aucune origine gratuite.
const isAcquisitionOnereuse = (origines?: string[] | null): boolean =>
  !origines || origines.length === 0 || !origines.some((o) => ORIGINES_PROPRES.includes(o));

// Séquence unique "nature effective → régime PVI → sinon régime générique",
// utilisée par toutes les vues affichant un régime fiscal de plus-value
// (PatrimoineTreeView, PatrimoinePlusValues) : évite que cette priorité entre
// régimes ne diverge entre écrans si elle change un jour.
export const resolveAssetFiscalRegime = ({
  nature,
  ctoMultiActifs,
  ctoNatureSousJacent,
  plusValue,
  valeurEstimee,
  dateAcquisition,
  valeurAcquisition,
  fraisAcquisition,
  origineActif,
  partsCedants,
  terrainConstructible,
  surfaceBoiseeHa,
  fixeAuSol,
  residenceServices,
  regimeSociete,
  modeSortie,
  versementsDeduitsPct,
  cessionDepartRetraite,
}: ResolveAssetFiscalRegimeInput): FiscalRegimeResult => {
  const effectiveNature = resolveEffectiveNature(nature, ctoMultiActifs, ctoNatureSousJacent);
  const retraite = computeRetraiteRegime({ nature: effectiveNature, plusValue, valeurAcquisition, modeSortie, versementsDeduitsPct });
  if (retraite) return retraite;
  const corporel = computeCorporelRegime(effectiveNature, plusValue, valeurEstimee, dateAcquisition);
  if (corporel) return corporel;
  // Parts de SCI : à l'IS, plus-value mobilière (PFU, sans abattement pour durée de
  // détention) ; à l'IR, plus-value immobilière sur parts (150 UB) ; régime inconnu : non déterminé.
  if (effectiveNature === NATURE_SCI && regimeSociete === REGIME_IS) {
    return {
      badge: 'SCI à l\'IS — PFU 31,4%',
      tone: 'pfu',
      ir: plusValue * PFU_IR,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_RATE,
      note: "Parts de SCI soumise à l'IS : plus-value mobilière au PFU (ou barème sur option), sans abattement pour durée de détention.",
    };
  }
  if (effectiveNature === NATURE_SCI && regimeSociete !== REGIME_IR) {
    return {
      badge: 'SCI — régime inconnu',
      tone: 'non_determine',
      ir: null,
      ps: null,
      total: null,
      note: "Régime fiscal de la SCI (IR ou IS) non renseigné dans le module Sociétés : plus-value immobilière (IR) ou mobilière au PFU (IS).",
    };
  }
  return (
    computePVIRegime({
      nature: effectiveNature,
      plusValue,
      dateAcquisition,
      valeurAcquisition,
      fraisAcquisition,
      acquisitionOnereuse: isAcquisitionOnereuse(origineActif),
      partsCedants,
      prixCession: valeurEstimee,
      terrainConstructible: terrainConstructible ?? undefined,
      surfaceBoiseeHa: surfaceBoiseeHa ?? undefined,
      fixeAuSol: fixeAuSol ?? undefined,
      residenceServices: residenceServices ?? undefined,
    }) ??
    computeFiscalRegime({ nature: effectiveNature, plusValue, valeurEstimee, dateAcquisition, cessionDepartRetraite: cessionDepartRetraite ?? undefined })
  );
};

/** Champs d'un actif propres au régime de plus-value de sa nature (à étaler dans resolveAssetFiscalRegime). */
export const caracteristiquesFiscalesActif = (
  asset: {
    terrain_constructible?: boolean | null;
    surface_boisee_ha?: number | null;
    fixe_au_sol?: boolean | null;
    residence_services?: boolean | null;
    societe_id?: string | null;
    mode_sortie?: string | null;
    versements_deduits_pct?: number | null;
    cession_depart_retraite?: boolean | null;
  } | undefined,
  regimesSocietes: Record<string, string | null | undefined> = {},
): Pick<ResolveAssetFiscalRegimeInput, 'terrainConstructible' | 'surfaceBoiseeHa' | 'fixeAuSol' | 'residenceServices' | 'regimeSociete' | 'modeSortie' | 'versementsDeduitsPct' | 'cessionDepartRetraite'> => ({
  terrainConstructible: asset?.terrain_constructible,
  surfaceBoiseeHa: asset?.surface_boisee_ha,
  fixeAuSol: asset?.fixe_au_sol,
  residenceServices: asset?.residence_services,
  regimeSociete: asset?.societe_id ? regimesSocietes[asset.societe_id] : undefined,
  modeSortie: asset?.mode_sortie,
  versementsDeduitsPct: asset?.versements_deduits_pct,
  cessionDepartRetraite: asset?.cession_depart_retraite,
});
