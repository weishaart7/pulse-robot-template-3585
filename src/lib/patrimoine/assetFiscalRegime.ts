import { FiscalRegimeResult, resolveEffectiveNature, computeFiscalRegime } from './regimeFiscalPlusValue';
import { computePVIRegime } from './regimeFiscalPVI';

export interface ResolveAssetFiscalRegimeInput {
  nature: string;
  ctoMultiActifs?: boolean;
  ctoNatureSousJacent?: string;
  plusValue: number;
  valeurEstimee: number;
  dateAcquisition?: string;
}

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
}: ResolveAssetFiscalRegimeInput): FiscalRegimeResult => {
  const effectiveNature = resolveEffectiveNature(nature, ctoMultiActifs, ctoNatureSousJacent);
  return (
    computePVIRegime({ nature: effectiveNature, plusValue, dateAcquisition }) ??
    computeFiscalRegime({ nature: effectiveNature, plusValue, valeurEstimee, dateAcquisition })
  );
};
