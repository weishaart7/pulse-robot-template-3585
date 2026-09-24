import { FiscalRegimeResult, resolveEffectiveNature, computeFiscalRegime } from './regimeFiscalPlusValue';
import { computePVIRegime } from './regimeFiscalPVI';
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
}

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
}: ResolveAssetFiscalRegimeInput): FiscalRegimeResult => {
  const effectiveNature = resolveEffectiveNature(nature, ctoMultiActifs, ctoNatureSousJacent);
  return (
    computePVIRegime({
      nature: effectiveNature,
      plusValue,
      dateAcquisition,
      valeurAcquisition,
      fraisAcquisition,
      acquisitionOnereuse: isAcquisitionOnereuse(origineActif),
      partsCedants,
    }) ??
    computeFiscalRegime({ nature: effectiveNature, plusValue, valeurEstimee, dateAcquisition })
  );
};
