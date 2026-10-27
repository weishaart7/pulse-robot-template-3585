import { ChargesDeductiblesInput, FoyerFiscalInput } from './types';

/** Année des revenus déclarés (âge des enfants au 31.12). */
const ANNEE_REVENUS = 2025;

/**
 * Alertes de vigilance du cadre 6 croisées avec la situation de famille
 * (brochure IR 2026 p. 227-229). Le foyer ne relie pas une pension à un enfant
 * précis : ce sont des rappels, pas des blocages.
 */
export function alertesChargesDeductibles(charges: ChargesDeductiblesInput, foyer: FoyerFiscalInput): string[] {
  const alertes: string[] = [];
  const pensionEnfantMajeur = (charges.case6el ?? 0) > 0 || (charges.case6em ?? 0) > 0
    || (charges.case6gi ?? 0) > 0 || (charges.case6gj ?? 0) > 0;
  const autresPensions = (charges.case6gu ?? 0) > 0 || (charges.case6gp ?? 0) > 0;
  const mineurs = foyer.enfantsCharge.filter(e => ANNEE_REVENUS - e.anneeNaissance < 18);

  if (pensionEnfantMajeur && foyer.enfantsMajeursRattaches > 0) {
    alertes.push("Pension à un enfant majeur et enfant majeur rattaché : un même enfant ne peut pas être rattaché et bénéficiaire d'une pension déduite.");
  }
  if (autresPensions && mineurs.some(e => e.residenceAlternee)) {
    alertes.push("Enfant mineur en résidence alternée : aucune pension alimentaire n'est déductible pour son entretien.");
  }
  if (autresPensions && mineurs.length > 0) {
    alertes.push("Pension à un enfant mineur : déductible seulement si vous n'en avez pas la garde. Vérifiez que le bénéficiaire n'est pas compté à charge.");
  }
  return alertes;
}
