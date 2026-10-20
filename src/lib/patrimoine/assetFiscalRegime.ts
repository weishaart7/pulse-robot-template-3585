import { FiscalRegimeResult, resolveEffectiveNature, computeFiscalRegime, PFU_IR, PFU_PS, PFU_RATE } from './regimeFiscalPlusValue';
import { computePVIRegime, computeCorporelRegime, computeBienMeubleRegime, NATURE_SCI } from './regimeFiscalPVI';
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
  // Meublés : statut du loueur (type_location, LMNP ou LMP).
  typeLocation?: string | null;
  // Parts de SCI : régime fiscal de la société liée (societes.regime_fiscal).
  regimeSociete?: string | null;
  // Épargne retraite : mode de sortie et part des versements déduits (cf. regimeFiscalRetraite.ts).
  modeSortie?: string | null;
  versementsDeduitsPct?: number | null;
  // Droits sociaux / parts de holding : cession au départ à la retraite (150-0 D ter).
  cessionDepartRetraite?: boolean | null;
  // Objets numériques (NFT) : qualification fiscale de l'objet (cf. QUALIFICATIONS_NFT).
  qualificationNft?: string | null;
  // Matières premières : 'physique' (bien meuble) ou 'financiere' (PFU, défaut).
  detentionMatieresPremieres?: string | null;
}

const REGIME_IS = 'Impôt sur les sociétés';

const NATURE_NFT = 'Objets numériques (NFT, etc.)';
const NATURE_MATIERES_PREMIERES = 'Matières premières (pétrole, blé…)';
const NATURE_RETRAITE_ETRANGERE = 'Régimes de retraite étrangers';

const pfu = (plusValue: number, badge: string, note: string): FiscalRegimeResult => ({
  badge, tone: 'pfu', ir: plusValue * PFU_IR, ps: plusValue * PFU_PS, total: plusValue * PFU_RATE, note,
});

// Objets numériques : pas de catégorie fiscale propre, le régime suit la qualification de l'objet.
const computeNftRegime = (
  qualification: string | null | undefined,
  plusValue: number,
  valeurEstimee: number,
  dateAcquisition?: string,
): FiscalRegimeResult => {
  switch (qualification) {
    case 'actif_numerique':
      return pfu(plusValue, 'NFT actif numérique — PFU 31,4%',
        "Actif numérique (art. 150 VH bis CGI) : PFU ou barème sur option. Franchise annuelle de 305 € (cumul des cessions) non appliquée ; échange contre un autre actif numérique en sursis d'imposition.");
    case 'titre_financier':
      return pfu(plusValue, 'NFT titre financier — PFU 31,4%',
        "Droits financiers ou de gouvernance (art. 150-0 A CGI) : PFU ou barème sur option ; pas de sursis en cas d'échange contre des cryptoactifs.");
    case 'oeuvre_art': {
      const r = computeCorporelRegime("Objets d'art et antiquités", plusValue, valeurEstimee, dateAcquisition);
      if (r) return { ...r, note: `NFT certifiant une œuvre physique (art. 150 VI CGI). ${r.note ?? ''}`.trim() };
      break;
    }
    case 'bien_meuble':
      return computeBienMeubleRegime(plusValue, valeurEstimee, dateAcquisition,
        "NFT bien meuble incorporel (art. 150 UA CGI, régime par défaut) : exonéré si le prix n'excède pas 5 000 €, sinon plus-value réelle avec abattement de 5 % par an au-delà de la 2e année, 19 % + 17,2 %.");
  }
  return {
    badge: 'NFT — qualification ?',
    tone: 'non_determine',
    ir: null,
    ps: null,
    total: null,
    note: "Qualification du NFT non renseignée sur l'actif : actif numérique, titre financier, œuvre d'art ou bien meuble incorporel, chacun avec son régime.",
  };
};
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
  typeLocation,
  regimeSociete,
  modeSortie,
  versementsDeduitsPct,
  cessionDepartRetraite,
  qualificationNft,
  detentionMatieresPremieres,
}: ResolveAssetFiscalRegimeInput): FiscalRegimeResult => {
  const effectiveNature = resolveEffectiveNature(nature, ctoMultiActifs, ctoNatureSousJacent);
  if (effectiveNature === NATURE_RETRAITE_ETRANGERE) {
    return {
      badge: 'Non pris en compte',
      tone: 'non_determine',
      ir: null,
      ps: null,
      total: null,
      note: "Régime de retraite étranger : fiscalité de sortie non prise en compte (dépend du pays et de la convention fiscale applicable).",
    };
  }
  if (effectiveNature === NATURE_NFT) return computeNftRegime(qualificationNft, plusValue, valeurEstimee, dateAcquisition);
  if (effectiveNature === NATURE_MATIERES_PREMIERES && detentionMatieresPremieres === 'physique') {
    return computeBienMeubleRegime(plusValue, valeurEstimee, dateAcquisition,
      "Matières premières détenues physiquement : bien meuble (art. 150 UA CGI), exonéré si le prix n'excède pas 5 000 €, sinon plus-value réelle avec abattement de 5 % par an au-delà de la 2e année, 19 % + 17,2 %.");
  }
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
      typeLocation: typeLocation ?? undefined,
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
    type_location?: string | null;
    societe_id?: string | null;
    mode_sortie?: string | null;
    versements_deduits_pct?: number | null;
    cession_depart_retraite?: boolean | null;
    qualification_nft?: string | null;
    detention_matieres_premieres?: string | null;
  } | undefined,
  regimesSocietes: Record<string, string | null | undefined> = {},
): Pick<ResolveAssetFiscalRegimeInput, 'terrainConstructible' | 'surfaceBoiseeHa' | 'fixeAuSol' | 'residenceServices' | 'typeLocation' | 'regimeSociete' | 'modeSortie' | 'versementsDeduitsPct' | 'cessionDepartRetraite' | 'qualificationNft' | 'detentionMatieresPremieres'> => ({
  terrainConstructible: asset?.terrain_constructible,
  surfaceBoiseeHa: asset?.surface_boisee_ha,
  fixeAuSol: asset?.fixe_au_sol,
  residenceServices: asset?.residence_services,
  typeLocation: asset?.type_location,
  regimeSociete: asset?.societe_id ? regimesSocietes[asset.societe_id] : undefined,
  modeSortie: asset?.mode_sortie,
  versementsDeduitsPct: asset?.versements_deduits_pct,
  cessionDepartRetraite: asset?.cession_depart_retraite,
  qualificationNft: asset?.qualification_nft,
  detentionMatieresPremieres: asset?.detention_matieres_premieres,
});
