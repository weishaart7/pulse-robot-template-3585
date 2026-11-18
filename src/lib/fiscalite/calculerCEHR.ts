import { FoyerFiscalInput } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

/**
 * Contribution exceptionnelle sur les hauts revenus (art. 223 sexies CGI),
 * sans lissage (8TD hors périmètre) : 3 % puis 4 % du revenu fiscal de
 * référence au-delà de 250 000 € / 500 000 € (personne seule) ou
 * 500 000 € / 1 000 000 € (couple soumis à imposition commune). Les revenus
 * au quotient, comptés pour 1/4 dans le RFR, sont retenus pour leur montant
 * total (brochure IR 2026 p. 326).
 */
export function calculerCEHR(
  revenuFiscalReference: number,
  situationFamille: FoyerFiscalInput['situationFamille'],
  revenuExceptionnelQuotient = 0,
  parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT,
): number {
  const { seuilPersonneSeule, tauxPremiereTranche, tauxSecondeTranche } = parametres.cehr;
  const seuil = situationFamille === 'marie' || situationFamille === 'pacse' ? 2 * seuilPersonneSeule : seuilPersonneSeule;
  const rfr = Math.max(0, revenuFiscalReference + Math.max(0, revenuExceptionnelQuotient) * 3 / 4);
  const tranche3 = Math.min(Math.max(0, rfr - seuil), seuil);
  const tranche4 = Math.max(0, rfr - 2 * seuil);
  return Math.round(tranche3 * tauxPremiereTranche + tranche4 * tauxSecondeTranche);
}
