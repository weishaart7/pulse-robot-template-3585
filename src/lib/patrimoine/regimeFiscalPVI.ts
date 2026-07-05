import { FiscalRegimeResult, getHoldingYears } from './regimeFiscalPlusValue';
import { formatCurrency } from './utils';

/**
 * Moteur de régime fiscal des plus-values immobilières (PVI), nature par
 * nature (taux au 01/01/2026). Ne couvre que les 4 groupes ci-dessous ;
 * `computePVIRegime` retourne `null` pour toute autre nature, auquel cas
 * l'appelant conserve le comportement "Non déterminé".
 */

const PVI_IR_RATE = 0.19;
const PVI_PS_RATE = 0.172;

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
  plusValue: number;
  dateAcquisition?: string;
}

export const computePVIRegime = ({
  nature,
  plusValue,
  dateAcquisition,
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

  if (plusValue <= 0) {
    return {
      badge: isLMNP ? 'LMNP 36,2%' : 'PVI 36,2%',
      tone: 'exonere_total',
      ir: 0,
      ps: 0,
      total: 0,
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
  const surtaxeDue = surtaxe(pvImposableIR);
  const total = irDue + psDue + surtaxeDue;

  const isExonereTotal = tauxAbattementIR >= 1 && tauxAbattementPS >= 1;

  const notes: string[] = [];
  if (isLMNP) {
    notes.push(
      "Depuis 2025, les amortissements déduits pendant la détention doivent être réintégrés dans le calcul (ils réduisent la valeur d'acquisition prise en compte, donc majorent la plus-value imposable). Ce montant cumulé n'est pas un champ du formulaire actif : à renseigner/estimer manuellement, il n'est pas ajouté ici. La plus-value réellement imposable est donc probablement supérieure à celle affichée."
    );
  }
  if (surtaxeDue > 0) {
    notes.push("Surtaxe progressive incluse (plus-value imposable à l'IR supérieure à 50 000 €).");
  }

  const badgeBase = isLMNP ? 'LMNP 36,2%' : 'PVI 36,2%';

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
