import { FiscalRegimeResult, getHoldingYears } from './regimeFiscalPlusValue';
import { formatCurrency } from './utils';

/**
 * Moteur de régime fiscal des plus-values immobilières (PVI), nature par
 * nature (taux au 01/01/2026) : régime général, parts (150 UB), LMNP, LMP
 * (informatif), biens meubles (maison mobile non fixée). `computePVIRegime`
 * retourne `null` pour toute autre nature (régimes mobiliers, cf.
 * regimeFiscalPlusValue.ts), ou "Non déterminé" à défaut.
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
// Immeubles non bâtis : pas de forfait travaux de 15 %.
const NATURES_NON_BATIES = ['Terrains', 'Terrains agricoles', 'Bois & forêts', 'Parking / Garage / Box'];
const NATURE_RESIDENCE_PRINCIPALE = 'Résidence principale';
// Cession de parts de sociétés à prépondérance immobilière soumises à l'IR (art. 150 UB CGI) :
// mêmes taux et abattements, mais ni forfait de 7,5 % ni forfait travaux de 15 % (réservés aux
// cessions d'immeubles), ni exonération des cessions ≤ 15 000 € (150 U II 6°, cessions de biens).
const NATURES_PARTS = ['Parts de SCPI', 'Parts de SCI', 'Parts de groupements fonciers'];
export const NATURE_SCI = 'Parts de SCI';
const NATURE_MAISON_MOBILE = 'Maison mobile (péniche, etc.)';
const NATURE_BOIS = 'Bois & forêts';
const NATURE_LMP = 'Immeubles locatifs (LMP)';
// Exonération des cessions dont le prix n'excède pas 15 000 € (art. 150 U II 6° CGI).
const SEUIL_EXONERATION_PRIX = 15000;
// Bois et forêts : impôt sur le revenu réduit de 10 € par hectare et par année de détention
// (art. 150 VF III CGI, BOI-RFPI-PVI-30-30-10) — IR seulement, pas les prélèvements sociaux.
const REDUCTION_FORESTIERE_HA_AN = 10;

// --- Régime général PVI ---
// Immeubles locatifs (loués nus), immeubles professionnels, résidence secondaire,
// parking/garage/box, autres biens d'usage, terrains (agricoles ou non), bois et forêts,
// maison mobile fixée au sol, et parts (SCPI, SCI à l'IR, groupements fonciers) sans forfaits.
// Les SCI à l'IS ne passent pas ici : cf. assetFiscalRegime.ts (PFU).
const NATURES_REGIME_GENERAL = [
  'Immeubles locatifs (loués nus)',
  'Immeubles professionnels (hors LMP)',
  'Résidences secondaires',
  'Parking / Garage / Box',
  'Autres biens d\'usage',
  'Terrains',
  'Terrains agricoles',
  NATURE_BOIS,
  ...NATURES_PARTS,
];

// Notes informatives par nature (conditions non saisies dans l'application).
const NOTES_NATURE: Record<string, string> = {
  'Résidences secondaires': "Première cession d'un logement autre que la résidence principale exonérée si le cédant n'a pas été propriétaire de sa résidence principale dans les 4 ans précédents et remploie le prix dans les 24 mois pour l'acquérir (art. 150 U II 1° bis) : non appliqué ici.",
  'Immeubles locatifs (loués nus)': "Bien sous dispositif de défiscalisation (Pinel, Denormandie, Loc'Avantages…) : une cession avant la fin de l'engagement de location entraîne la reprise de la réduction d'impôt, non comptée ici. Travaux réels retenus seulement s'ils n'ont pas été déduits des revenus fonciers.",
  'Immeubles professionnels (hors LMP)': "Régime des particuliers : suppose que l'immeuble relève du patrimoine privé. Inscrit à l'actif d'une entreprise, il relève des plus-values professionnelles.",
  'Terrains agricoles': "Bien inscrit à l'actif d'une exploitation agricole : plus-values professionnelles (art. 151 septies), non calculées ici.",
  'Parts de SCPI': "Impôt calculé et prélevé par la société de gestion à la cession. Parts de SCPI fiscale cédées avant la fin de l'engagement : reprise de l'avantage fiscal, non comptée ici.",
  'Parts de SCI': "SCI à l'IR : prix d'acquisition des parts à corriger des bénéfices imposés et non distribués, non pris en compte ici.",
  'Parts de groupements fonciers': "Réduction IR à la souscription (groupements forestiers) reprise en cas de cession anticipée, non comptée ici.",
};

// --- LMNP ---
const NATURE_LMNP = 'Immeubles locatifs (LMNP)';

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

// --- Biens meubles (art. 150 UA CGI) ---
// Maison mobile non fixée au sol (péniche, mobil-home) : bien meuble. Exonération si le prix de
// cession n'excède pas 5 000 €, abattement de 5 % par année de détention au-delà de la 2e
// (exonération à 22 ans), 19 % + 17,2 %, sans forfaits ni surtaxe.
const SEUIL_EXONERATION_MEUBLES = 5000;
const abattementMeubles = (years: number): number => Math.min(Math.max(years - 2, 0) * 0.05, 1);

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
  // Prix de cession (valeur estimée, ou prix net simulé) à la part du foyer : seuils
  // d'exonération de 15 000 € (immeubles) et 5 000 € (biens meubles). Apprécié sur
  // la part du foyer, pas par époux (un bien commun est cédé d'un seul tenant).
  prixCession?: number;
  // Terrains : terrain à bâtir, exclu de la surtaxe (art. 1609 nonies G CGI).
  terrainConstructible?: boolean;
  // Bois & forêts : surface boisée (ha), pour la réduction de 10 €/ha/an.
  surfaceBoiseeHa?: number;
  // Maison mobile fixée au sol à demeure : immeuble (régime général).
  fixeAuSol?: boolean;
  // LMNP : résidence étudiante, seniors ou EHPAD (pas de réintégration des amortissements).
  residenceServices?: boolean;
  // Optionnels, pour une cession simulée (Immobilier → « Simuler une revente ») :
  // - dateCession : date à laquelle s'apprécie la durée de détention (aujourd'hui sinon) ;
  // - travauxReels : dépenses d'amélioration, construction ou agrandissement
  //   facturées par une entreprise et jamais déduites de l'impôt (art. 150 VB
  //   II 4° CGI) — retenues pour leur montant si plus favorables que le forfait
  //   de 15 % (alternative, jamais cumulée) ;
  // - amortissementsReintegres : LMNP, cessions à compter du 15/02/2025 (art.
  //   150 VB modifié par la LF 2025, art. 84) — prix d'acquisition minoré des
  //   amortissements déduits. Le forfait de 7,5 % reste calculé sur le prix
  //   d'acquisition brut (base non tranchée par les textes consultés, décision
  //   du 2026-10-17 : pas de version « prudente » minorée).
  dateCession?: Date;
  travauxReels?: number;
  amortissementsReintegres?: number;
}

/**
 * Plus-value FISCALE : prix d'acquisition majoré du plus favorable entre
 * frais réels et forfait 7,5 % (onéreux), et du forfait travaux 15 % au-delà
 * de 5 ans (bâti). Aucun forfait sur les cessions de parts (150 UB).
 */
const computePlusValueFiscale = (
  plusValue: number,
  nature: string,
  years: number,
  valeurAcquisition?: number,
  fraisAcquisition?: number,
  acquisitionOnereuse?: boolean,
  travauxReels = 0,
  amortissementsReintegres = 0,
): number => {
  if (valeurAcquisition === undefined) return plusValue;
  const isParts = NATURES_PARTS.includes(nature);
  const frais = fraisAcquisition ?? 0;
  const fraisRetenus = acquisitionOnereuse && !isParts
    ? Math.max(frais, valeurAcquisition * FORFAIT_FRAIS_ACQUISITION)
    : frais;
  const forfaitTravaux = years > 5 && !NATURES_NON_BATIES.includes(nature) && !isParts
    ? valeurAcquisition * FORFAIT_TRAVAUX
    : 0;
  // Travaux réels (justifiés, non déduits) ou forfait 15 % : le plus favorable, jamais les deux.
  const travaux = isParts ? 0 : Math.max(forfaitTravaux, Math.max(0, travauxReels));
  // plusValue = valeurEstimee − valeurAcquisition − frais : on remplace les
  // frais réels par les frais retenus et on retire le forfait travaux.
  return plusValue + frais - fraisRetenus - travaux + Math.max(0, amortissementsReintegres);
};

const exonere = (badge: string, note?: string): FiscalRegimeResult => ({
  badge, tone: 'exonere_total', ir: 0, ps: 0, total: 0, note,
});

const NOTE_MAISON_MOBILE = "Maison mobile non fixée au sol (péniche, mobil-home) : bien meuble (art. 150 UA CGI) — abattement de 5 % par an au-delà de la 2e année, sans forfaits ni surtaxe.";

const computeBiensMeubles = (
  plusValue: number,
  years: number | null,
  prixCession?: number,
  noteRegime: string = NOTE_MAISON_MOBILE,
): FiscalRegimeResult => {
  if (prixCession !== undefined && prixCession <= SEUIL_EXONERATION_MEUBLES) {
    return exonere('Bien meuble — prix ≤ 5 000 €', 'Bien meuble (art. 150 UA CGI) : cession exonérée, prix inférieur ou égal à 5 000 €.');
  }
  if (years === null) {
    return {
      badge: 'Bien meuble — durée inconnue', tone: 'non_determine', ir: null, ps: null, total: null,
      note: "Date d'acquisition non renseignée : impossible de calculer l'abattement pour durée de détention.",
    };
  }
  if (plusValue <= 0) return exonere('Moins-value — aucun impôt');
  const abattement = abattementMeubles(years);
  const base = plusValue * (1 - abattement);
  const ir = base * PVI_IR_RATE;
  const ps = base * PVI_PS_RATE;
  return {
    badge: abattement >= 1 ? 'Bien meuble — exonéré (22 ans)' : `Bien meuble ${PVI_TOTAL_LABEL}`,
    tone: abattement >= 1 ? 'exonere_total' : 'pfu',
    ir, ps, total: ir + ps,
    irDetail: `Abattement ${formatPct(abattement)}`,
    psDetail: `Abattement ${formatPct(abattement)}`,
    note: noteRegime,
  };
};

const LMP_RESULT: FiscalRegimeResult = {
  badge: 'LMP — plus-values professionnelles',
  tone: 'informatif',
  ir: null,
  ps: null,
  total: null,
  note: "Plus-values professionnelles : court terme à hauteur des amortissements (barème + cotisations sociales), long terme au-delà (12,8 % + 17,2 %). Exonération totale si les recettes sont inférieures à 90 000 € et partielle jusqu'à 126 000 €, après 5 ans d'activité (art. 151 septies CGI). Non calculé : recettes moyennes, ancienneté d'activité et amortissements pratiqués ne sont pas saisis.",
};

export const computePVIRegime = ({
  nature,
  plusValue: plusValueLatente,
  dateAcquisition,
  valeurAcquisition,
  fraisAcquisition,
  acquisitionOnereuse,
  partsCedants = [1],
  prixCession,
  terrainConstructible,
  surfaceBoiseeHa,
  fixeAuSol,
  residenceServices,
  dateCession,
  travauxReels,
  amortissementsReintegres,
}: ComputePVIRegimeInput): FiscalRegimeResult | null => {
  if (nature === NATURE_RESIDENCE_PRINCIPALE) {
    return exonere('Résidence principale — exonérée', 'Exonération totale (IR + PS), sans condition de durée de détention.');
  }
  if (nature === NATURE_LMP) return LMP_RESULT;
  if (nature === NATURE_MAISON_MOBILE && !fixeAuSol) {
    return computeBiensMeubles(plusValueLatente, getHoldingYears(dateAcquisition, dateCession), prixCession);
  }

  const isRegimeGeneral = NATURES_REGIME_GENERAL.includes(nature) || nature === NATURE_MAISON_MOBILE;
  const isLMNP = nature === NATURE_LMNP;
  if (!isRegimeGeneral && !isLMNP) {
    return null;
  }
  const isParts = NATURES_PARTS.includes(nature);

  if (!isParts && prixCession !== undefined && prixCession > 0 && prixCession <= SEUIL_EXONERATION_PRIX) {
    return exonere('PVI — prix ≤ 15 000 €', "Cession exonérée : prix inférieur ou égal à 15 000 € (art. 150 U II 6° CGI).");
  }

  const years = getHoldingYears(dateAcquisition, dateCession);
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

  const plusValue = computePlusValueFiscale(plusValueLatente, nature, years, valeurAcquisition, fraisAcquisition, acquisitionOnereuse, travauxReels, amortissementsReintegres);
  const avecForfaitTravaux = years > 5 && !NATURES_NON_BATIES.includes(nature) && !isParts;
  const forfaitNote = valeurAcquisition === undefined
    ? undefined
    : isParts
      ? `Plus-value imposable ${formatCurrency(Math.max(plusValue, 0))} : cession de parts, sans forfaits de frais ni de travaux (art. 150 UB CGI).`
      : `Plus-value imposable ${formatCurrency(Math.max(plusValue, 0))} après forfaits (frais d'acquisition 7,5 % si plus favorable${
        (travauxReels ?? 0) > 0
          ? avecForfaitTravaux ? ', travaux réels ou forfait 15 %, le plus favorable' : ', travaux réels'
          : avecForfaitTravaux ? ', travaux 15 %' : ''
      }).`;
  const notes: string[] = forfaitNote ? [forfaitNote] : [];
  if (NOTES_NATURE[nature]) notes.push(NOTES_NATURE[nature]);

  if (plusValue <= 0) {
    return exonere('Moins-value — aucun impôt', notes.length > 0 ? notes.join(' ') : undefined);
  }

  const tauxAbattementIR = abattementIR(years);
  const tauxAbattementPS = abattementPS(years);
  const pvImposableIR = plusValue * (1 - tauxAbattementIR);
  const pvImposablePS = plusValue * (1 - tauxAbattementPS);
  const irBrut = pvImposableIR * PVI_IR_RATE;
  // Bois et forêts : réduction de 10 € par hectare et par année de détention, sur l'IR seul.
  const reductionForestiere = nature === NATURE_BOIS && (surfaceBoiseeHa ?? 0) > 0
    ? Math.min(irBrut, Math.floor(surfaceBoiseeHa!) * years * REDUCTION_FORESTIERE_HA_AN)
    : 0;
  const irDue = irBrut - reductionForestiere;
  const psDue = pvImposablePS * PVI_PS_RATE;
  // Terrains à bâtir exclus de la surtaxe. Seuil apprécié par cédant, sur sa quote-part.
  const surtaxeDue = terrainConstructible && nature === 'Terrains'
    ? 0
    : partsCedants.reduce((sum, part) => sum + surtaxe(pvImposableIR * part), 0);
  const total = irDue + psDue + surtaxeDue;
  const isExonereTotal = tauxAbattementIR >= 1 && tauxAbattementPS >= 1;

  if (isLMNP && residenceServices) {
    notes.push('Résidence étudiante, seniors ou EHPAD : amortissements non réintégrés.');
  } else if (isLMNP && amortissementsReintegres !== undefined) {
    notes.push(
      `Amortissements déduits réintégrés : ${formatCurrency(amortissementsReintegres)} (cessions depuis le 15/02/2025, hors résidences étudiantes, seniors et EHPAD). Forfait de 7,5 % calculé sur le prix d'acquisition avant réintégration : point non tranché par les textes consultés.`
    );
  } else if (isLMNP) {
    notes.push(
      "Depuis le 15/02/2025, les amortissements déduits sont réintégrés dans la plus-value (hors résidences étudiantes, seniors et EHPAD) : non ajoutés ici, la plus-value imposable est donc probablement supérieure. Le simulateur de revente (Immobilier) les estime."
    );
  }
  if (nature === NATURE_BOIS) {
    notes.push(reductionForestiere > 0
      ? `Réduction forestière de ${formatCurrency(reductionForestiere)} sur l'IR (10 € par hectare et par année de détention, art. 150 VF III CGI).`
      : "Réduction de 10 € par hectare et par année de détention sur l'IR (art. 150 VF III CGI) : surface boisée non renseignée.");
  }
  if (nature === 'Terrains') {
    notes.push(terrainConstructible
      ? "Terrain à bâtir : exclu de la surtaxe. Première cession après classement en zone constructible : taxes sur les terrains devenus constructibles (art. 1529 et 1605 nonies CGI), non calculées ici."
      : "Terrain non déclaré constructible : surtaxe appliquée le cas échéant (un terrain à bâtir en est exclu).");
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

// --- Actifs corporels (art. 150 UA et 150 VI CGI) ---
// Meubles meublants et véhicules : exonérés (150 UA II 1°). Bijoux, montres, objets d'art, de
// collection et antiquités : taxe forfaitaire de 6,5 % du prix (6 % + 0,5 % de CRDS) au-delà de
// 5 000 €, ou option pour la plus-value réelle (régime des biens meubles). Autres biens meubles :
// régime des biens meubles. L'or physique relève de regimeFiscalPlusValue.ts (métaux précieux).
const NATURES_CORPORELS_EXONERES = ['Meubles meublants', 'Véhicules motorisés'];
const NATURES_OBJETS_PRECIEUX = ["Objets d'art et antiquités", 'Montres', 'Objets de collection', 'Bijoux et pierres précieuses'];
const NATURES_BIENS_MEUBLES = [
  'Sacs et accessoires de luxe',
  'Matériel informatique ou audiovisuel haut de gamme',
  'Matériel sportif de valeur',
  "Vins & spiritueux d'investissement",
];
const TAUX_TAXE_OBJETS_PRECIEUX = 0.065;

export const computeCorporelRegime = (
  nature: string,
  plusValue: number,
  valeurEstimee: number,
  dateAcquisition?: string,
): FiscalRegimeResult | null => {
  if (NATURES_CORPORELS_EXONERES.includes(nature)) {
    return exonere('Exonéré', "Meubles meublants et véhicules : plus-value de cession exonérée (art. 150 UA II 1° CGI).");
  }
  const years = getHoldingYears(dateAcquisition);
  if (NATURES_BIENS_MEUBLES.includes(nature)) {
    return computeBiensMeubles(plusValue, years, valeurEstimee,
      "Bien meuble (art. 150 UA CGI) : exonéré si le prix de cession n'excède pas 5 000 €, sinon plus-value réelle avec abattement de 5 % par an au-delà de la 2e année (exonération à 22 ans), 19 % + 17,2 %.");
  }
  if (!NATURES_OBJETS_PRECIEUX.includes(nature)) return null;
  if (valeurEstimee > 0 && valeurEstimee <= SEUIL_EXONERATION_MEUBLES) {
    return exonere('Prix ≤ 5 000 € — exonéré', "Bijoux, objets d'art, de collection ou antiquités : cession exonérée si le prix n'excède pas 5 000 € (art. 150 VJ CGI).");
  }
  const alternatives = [{ label: 'Taxe forfaitaire 6,5 % (prix de vente, sans justificatif)', total: valeurEstimee * TAUX_TAXE_OBJETS_PRECIEUX }];
  if (years !== null && plusValue > 0) {
    const abattement = abattementMeubles(years);
    alternatives.push({
      label: abattement >= 1
        ? 'Option plus-value réelle (exonérée après 22 ans de détention)'
        : `Option plus-value réelle ${PVI_TOTAL_LABEL} (abattement ${(abattement * 100).toFixed(0)}% pour ${years} an${years > 1 ? 's' : ''} de détention)`,
      total: plusValue * (1 - abattement) * (PVI_IR_RATE + PVI_PS_RATE),
    });
  }
  return {
    badge: 'Objet précieux — choix',
    tone: 'choix',
    ir: null,
    ps: null,
    total: null,
    note: "Deux régimes au choix : taxe forfaitaire de 6,5 % sur le prix de cession (art. 150 VI CGI), ou option pour la plus-value réelle (justificatif de prix et de date d'acquisition requis).",
    alternatives,
  };
};
