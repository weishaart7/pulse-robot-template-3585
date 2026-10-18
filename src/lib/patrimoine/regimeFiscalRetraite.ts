import type { FiscalRegimeResult } from './regimeFiscalPlusValue';
import { PFU_IR, PFU_PS } from './regimeFiscalPlusValue';
import { formatCurrency } from './utils';

/**
 * Fiscalité de sortie de l'épargne retraite (taux au 01/01/2026). Prélèvements sociaux à 18,6 %
 * pour tous les PER, bancaires comme assurantiels (hausse de CSG de la LFSS 2026 appliquée à
 * l'ensemble des retraits selon l'administration). « Contrat article 82 » en capital : calcul de
 * rachat de l'assurance-vie (regimeFiscalAssuranceVie.ts), pas ici. `null` : nature non couverte.
 */

const NATURES_PER = ['PER individuel', 'PER entreprise collectif'];
const NATURE_PER_OBLIGATOIRE = 'PER entreprise obligatoire';
const NATURE_PERCO = 'PERCO/PERCOI';
const NATURE_ARTICLE_82 = 'Contrat article 82';

const RVTG = "rente viagère à titre gratuit : imposée au barème après abattement de 10 %, prélèvements sociaux sur une fraction selon l'âge";
const RVTO = "rente viagère à titre onéreux : fraction imposable selon l'âge au premier versement (70 % avant 50 ans, 50 % de 50 à 59 ans, 40 % de 60 à 69 ans, 30 % ensuite)";

const NOTES_RENTE: Record<string, string> = {
  'PERP': `Sortie en rente (${RVTG}). Capital possible à hauteur de 20 % (7,5 % libératoire après abattement de 10 %, ou barème), ou en totalité pour l'achat d'une première résidence principale.`,
  'Contrat loi Madelin': `Sortie en rente uniquement (${RVTG}).`,
  'Contrat loi Madelin Agricole': `Sortie en rente uniquement (${RVTG}).`,
  'Contrat article 83': `Sortie en rente uniquement (${RVTG}).`,
  'Contrat Préfon-retraite': `Sortie en rente (${RVTG}).`,
  'Contrat retraite mutualiste du combattant': "Rente exonérée d'impôt sur le revenu dans la limite du plafond majorable de l'État ; au-delà, rente viagère à titre gratuit.",
  [NATURE_PER_OBLIGATOIRE]: `Versements obligatoires : sortie en rente uniquement (${RVTG}).`,
};

const informatif = (badge: string, note: string): FiscalRegimeResult => ({
  badge, tone: 'informatif', ir: null, ps: null, total: null, note,
});

export interface ComputeRetraiteRegimeInput {
  nature: string;
  plusValue: number;
  // Versements cumulés (valeur d'acquisition), pour chiffrer le capital déduit.
  valeurAcquisition?: number;
  modeSortie?: string | null;
  // Part des versements volontaires déduits du revenu (%), PER uniquement.
  versementsDeduitsPct?: number | null;
}

export function computeRetraiteRegime({
  nature,
  plusValue,
  valeurAcquisition,
  modeSortie,
  versementsDeduitsPct,
}: ComputeRetraiteRegimeInput): FiscalRegimeResult | null {
  if (NOTES_RENTE[nature]) return informatif('Retraite — sortie en rente', NOTES_RENTE[nature]);

  if (nature === NATURE_ARTICLE_82) {
    return informatif('Article 82 — sortie en rente', `Cotisations non déductibles : ${RVTO}. En capital, le gain suit la fiscalité des rachats d'assurance-vie.`);
  }

  if (nature === NATURE_PERCO) {
    if (modeSortie === 'Rente') return informatif('PERCO — sortie en rente', `Sortie en rente : ${RVTO}.`);
    return {
      badge: 'PERCO — exonéré d\'IR',
      tone: 'exonere_partiel',
      ir: 0,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_PS,
      note: "Sortie en capital : capital et gains exonérés d'impôt sur le revenu ; prélèvements sociaux (18,6 %) sur les gains.",
    };
  }

  if (!NATURES_PER.includes(nature)) return null;

  const noteCollectif = nature === 'PER entreprise collectif'
    ? " Sommes issues de l'épargne salariale (participation, intéressement, abondement) : capital et gains exonérés d'IR, prélèvements sociaux seuls — compartiments non distingués ici."
    : '';
  if (modeSortie === 'Rente') {
    return informatif('PER — sortie en rente', `Versements déduits : ${RVTG}. Versements non déduits : ${RVTO}.${noteCollectif}`);
  }
  if (versementsDeduitsPct == null) {
    return {
      badge: 'PER — versements déduits ?',
      tone: 'non_determine',
      ir: null,
      ps: null,
      total: null,
      note: "Part des versements déduits du revenu non renseignée : elle détermine l'imposition du capital à la sortie (barème pour la part déduite).",
    };
  }
  const gain = Math.max(0, plusValue);
  const ir = gain * PFU_IR;
  const ps = gain * PFU_PS;
  const pct = Math.min(100, Math.max(0, versementsDeduitsPct));
  const capitalDeduit = valeurAcquisition !== undefined ? valeurAcquisition * pct / 100 : undefined;
  const notes = [
    "Sortie en capital : gains au PFU (12,8 % + 18,6 % de prélèvements sociaux), option barème possible.",
    pct > 0
      ? `Capital issu des versements déduits (${pct} %${capitalDeduit !== undefined ? `, soit ${formatCurrency(capitalDeduit)}` : ''}) imposé au barème progressif sans abattement : non chiffré ici (dépend de la tranche marginale), à ajouter au total.`
      : 'Versements non déduits : capital exonéré.',
    "Déblocage anticipé pour accident de la vie : exonération d'IR, prélèvements sociaux seuls.",
  ];
  if (modeSortie === 'Mixte') notes.push(`Part versée en rente : ${RVTG} (versements déduits) ou ${RVTO}.`);
  return {
    badge: pct > 0 ? 'PER — capital (+ barème)' : 'PER — capital',
    tone: 'pfu',
    ir,
    ps,
    total: ir + ps,
    totalDetail: pct > 0 ? 'Hors capital imposé au barème' : undefined,
    note: notes.join(' ') + noteCollectif,
  };
}
