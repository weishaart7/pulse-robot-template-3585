import { FiscalRegimeResult, getHoldingYears } from './regimeFiscalPlusValue';
import { formatCurrency } from './utils';

/**
 * Moteur de régime fiscal des plus-values immobilières (PVI), nature par
 * nature (taux au 01/01/2026). Ne couvre que les 4 groupes ci-dessous ;
 * `computePVIRegime` retourne `null` pour toute autre nature, auquel cas
 * l'appelant conserve le comportement "Non déterminé".
 */

const PVI_IR_RATE = 0.19;
// 17,2 % et non 18,6 % : la hausse de CSG de la LFSS 2026 (loi n° 2025-1403,
// CSG capital 9,2 % → 10,6 %) ne s'applique pas aux plus-values
// immobilières, qui restent à 9,2 % de CSG. Différence voulue avec
// `PFU_PS` (regimeFiscalPlusValue.ts) — ne pas « harmoniser ».
const PVI_PS_RATE = 0.172;
const PVI_TOTAL_LABEL = `${((PVI_IR_RATE + PVI_PS_RATE) * 100).toFixed(1).replace('.', ',')}%`;

// Forfaits de majoration du prix d'acquisition (art. 150 VB II CGI) :
// 7,5 % pour frais d'acquisition (acquisition à titre onéreux uniquement),
// 15 % pour travaux après 5 ans de détention (immeubles bâtis uniquement).
const FORFAIT_FRAIS_ACQUISITION = 0.075;
const FORFAIT_TRAVAUX = 0.15;
const NATURES_NON_BATIES = ['Terrains', 'Parking / Garage / Box', 'Parts de SCPI'];

const NATURE_RESIDENCE_PRINCIPALE = 'Résidence principale';

// --- Régime général PVI ---
// Immeubles locatifs (loués nus), immeubles professionnels, autres immeubles
// de rapport, résidence secondaire, maison mobile, parking/garage/box,
// autres biens d'usage, SCPI détenue en direct, terrains.
//
// "Terrains à bâtir" (point 3 de la demande) n'existe pas comme nature ni
// comme champ distinct dans l'application (seules "Terrains" et "Terrains
// agricoles" existent, et aucun champ ne marque un terrain comme
// constructible). Faute de donnée pour les distinguer, "Terrains" applique
// systématiquement le régime général ci-dessous (avec surtaxe), sans jamais
// appliquer l'exclusion de surtaxe propre aux terrains à bâtir. Décision
// validée explicitement : fusion avec le régime général plutôt que d'inventer
// un champ.
const NATURES_REGIME_GENERAL = [
  'Immeubles locatifs (loués nus)',
  'Immeubles professionnels (hors LMP)',
  'Autres immeubles de rapport',
  'Résidences secondaires',
  'Maison mobile (péniche, etc.)',
  'Parking / Garage / Box',
  'Autres biens d\'usage',
  'Parts de SCPI',
  'Terrains',
];

// --- LMNP ---
const NATURE_LMNP = 'Immeubles locatifs (LMNP)';
// "Immeubles locatifs (LMP)" (loueur meublé PROFESSIONNEL) n'est pas dans le
// périmètre demandé : reste "Non déterminé".

// Abattement pour durée de détention à l'IR : 0% avant 6 ans, puis 6%/an de
// la 6e à la 21e année (16 ans à 6% = 96%), puis 4% la 22e année → 100% à 22
// ans révolus (exonération totale d'IR).
const abattementIR = (years: number): number => {
  if (years < 6) return 0;
  if (years >= 22) return 1;
  return Math.min((years - 5) * 0.06, 0.96);
};

// Abattement pour durée de détention aux PS : 0% avant 6 ans, puis 1,65%/an
// de la 6e à la 21e année (16 ans = 26,4%), puis 1,60% la 22e année (28%),
// puis 9%/an de la 23e à la 30e année (8 ans = 72%) → 100% à 30 ans révolus.
const abattementPS = (years: number): number => {
  if (years < 6) return 0;
  if (years >= 30) return 1;
  let total = Math.min(years, 21) - 5;
  total = Math.max(total, 0) * 0.0165;
  if (years >= 22) total += 0.016;
  if (years > 22) total += (Math.min(years, 30) - 22) * 0.09;
  return Math.min(total, 1);
};

// Surtaxe progressive (2 % à 6 %) sur la plus-value imposable à l'IR (après
// abattement), au-delà de 50 000 € — barème officiel avec lissage aux
// bornes de tranches (art. 1609 nonies G du CGI).
const surtaxe = (pvImposableIR: number): number => {
  const pv = pvImposableIR;
  if (pv <= 50000) return 0;
  if (pv <= 60000) return 0.02 * pv - (60000 - pv) * (1 / 20);
  if (pv <= 100000) return 0.02 * pv;
  if (pv <= 110000) return 0.03 * pv - (110000 - pv) * (1 / 10);
  if (pv <= 150000) return 0.03 * pv;
  if (pv <= 160000) return 0.04 * pv - (160000 - pv) * (15 / 100);
  if (pv <= 200000) return 0.04 * pv;
  if (pv <= 210000) return 0.05 * pv - (210000 - pv) * (20 / 100);
  if (pv <= 250000) return 0.05 * pv;
  if (pv <= 260000) return 0.06 * pv - (260000 - pv) * (25 / 100);
  return 0.06 * pv;
};

const formatPct = (rate: number): string => `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;

export interface ComputePVIRegimeInput {
  nature: string;
  // Plus-value latente économique (valeur estimée − prix − frais réels).
  plusValue: number;
  dateAcquisition?: string;
  // Optionnels : sans eux, la plus-value fiscale = `plusValue` (pas de
  // forfait) et la surtaxe est appréciée sur un seul cédant.
  valeurAcquisition?: number;
  fraisAcquisition?: number;
  acquisitionOnereuse?: boolean;
  // Quote-part de chaque cédant dans la plus-value (somme = 1) : le seuil de
  // 50 000 € de la surtaxe s'apprécie par cédant (BOI-RFPI-TPVIE-20 :
  // indivisaires, époux pour un bien de communauté, partenaires de PACS).
  partsCedants?: number[];
}

/**
 * Plus-value FISCALE : prix d'acquisition majoré du plus favorable entre
 * frais réels et forfait 7,5 % (onéreux), et du forfait travaux 15 % au-delà
 * de 5 ans (bâti). Les travaux réels ne sont pas repris (champs du module
 * Immobilier, possiblement déjà déduits des revenus fonciers).
 */
const computePlusValueFiscale = (
  plusValue: number,
  nature: string,
  years: number,
  valeurAcquisition?: number,
  fraisAcquisition?: number,
  acquisitionOnereuse?: boolean
): number => {
  if (valeurAcquisition === undefined) return plusValue;
  const frais = fraisAcquisition ?? 0;
  const fraisRetenus = acquisitionOnereuse
    ? Math.max(frais, valeurAcquisition * FORFAIT_FRAIS_ACQUISITION)
    : frais;
  const travaux = years > 5 && !NATURES_NON_BATIES.includes(nature)
    ? valeurAcquisition * FORFAIT_TRAVAUX
    : 0;
  // plusValue = valeurEstimee − valeurAcquisition − frais : on remplace les
  // frais réels par les frais retenus et on retire le forfait travaux.
  return plusValue + frais - fraisRetenus - travaux;
};

export const computePVIRegime = ({
  nature,
  plusValue: plusValueLatente,
  dateAcquisition,
  valeurAcquisition,
  fraisAcquisition,
  acquisitionOnereuse,
  partsCedants = [1],
}: ComputePVIRegimeInput): FiscalRegimeResult | null => {
  if (nature === NATURE_RESIDENCE_PRINCIPALE) {
    return {
      badge: 'Résidence principale — exonérée',
      tone: 'exonere_total',
      ir: 0,
      ps: 0,
      total: 0,
      note: 'Exonération totale (IR + PS), sans condition de durée de détention.',
    };
  }

  const isRegimeGeneral = NATURES_REGIME_GENERAL.includes(nature);
  const isLMNP = nature === NATURE_LMNP;

  if (!isRegimeGeneral && !isLMNP) {
    return null;
  }

  const years = getHoldingYears(dateAcquisition);
  if (years === null) {
    return {
      badge: isLMNP ? 'LMNP — durée inconnue' : 'PVI — durée inconnue',
      tone: 'non_determine',
      ir: null,
      ps: null,
      total: null,
      note: "Date d'acquisition non renseignée : impossible de calculer les abattements pour durée de détention.",
    };
  }

  const plusValue = computePlusValueFiscale(plusValueLatente, nature, years, valeurAcquisition, fraisAcquisition, acquisitionOnereuse);
  const forfaitNote = valeurAcquisition !== undefined
    ? `Plus-value imposable ${formatCurrency(Math.max(plusValue, 0))} après forfaits (frais d'acquisition 7,5 % si plus favorable${years > 5 && !NATURES_NON_BATIES.includes(nature) ? ', travaux 15 %' : ''}).`
    : undefined;

  if (plusValue <= 0) {
    return {
      badge: 'Moins-value — aucun impôt',
      tone: 'exonere_total',
      ir: 0,
      ps: 0,
      total: 0,
      note: forfaitNote,
    };
  }

  const tauxAbattementIR = abattementIR(years);
  const tauxAbattementPS = abattementPS(years);
  const pvImposableIR = plusValue * (1 - tauxAbattementIR);
  const pvImposablePS = plusValue * (1 - tauxAbattementPS);
  const irDue = pvImposableIR * PVI_IR_RATE;
  const psDue = pvImposablePS * PVI_PS_RATE;
  // Les terrains à bâtir sont exclus par la loi de la surtaxe, mais faute de
  // pouvoir les distinguer des autres terrains (voir commentaire plus haut),
  // la surtaxe s'applique ici à "Terrains" comme au reste du régime général.
  // Seuil apprécié par cédant, sur sa quote-part de plus-value imposable.
  const surtaxeDue = partsCedants.reduce((sum, part) => sum + surtaxe(pvImposableIR * part), 0);
  const total = irDue + psDue + surtaxeDue;

  const isExonereTotal = tauxAbattementIR >= 1 && tauxAbattementPS >= 1;

  const notes: string[] = forfaitNote ? [forfaitNote] : [];
  if (isLMNP) {
    notes.push(
      "Depuis 2025, les amortissements déduits pendant la détention doivent être réintégrés dans le calcul (ils réduisent la valeur d'acquisition prise en compte, donc majorent la plus-value imposable). Ce montant cumulé n'est pas un champ du formulaire actif : à renseigner/estimer manuellement, il n'est pas ajouté ici. La plus-value réellement imposable est donc probablement supérieure à celle affichée."
    );
  }
  if (surtaxeDue > 0) {
    notes.push("Surtaxe progressive incluse (quote-part de plus-value imposable à l'IR d'au moins un cédant supérieure à 50 000 €).");
  }

  const badgeBase = `${isLMNP ? 'LMNP' : 'PVI'} ${PVI_TOTAL_LABEL}`;

  return {
    badge: isExonereTotal ? `${badgeBase} — exonéré (22/30 ans)` : badgeBase,
    tone: isExonereTotal ? 'exonere_total' : 'pfu',
    ir: irDue,
    ps: psDue,
    total,
    irDetail: `Abattement ${formatPct(tauxAbattementIR)}`,
    psDetail: `Abattement ${formatPct(tauxAbattementPS)}`,
    totalDetail: surtaxeDue > 0 ? `Dont surtaxe ${formatCurrency(surtaxeDue)}` : undefined,
    note: notes.length > 0 ? notes.join(' ') : undefined,
  };
};
