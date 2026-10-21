import { differenceInYears } from 'date-fns';
import { NATURE_FONDS_CI } from '@/constants/assetTypes';

/**
 * Moteur de régime fiscal des plus-values, nature par nature (taux au 01/01/2026).
 *
 * Ne couvre que les 8 groupes de natures listés ci-dessous. Toute autre nature
 * retourne 'non_determine', y compris des natures qui étaient auparavant
 * classées PFU ou Exonéré par l'ancien système à base de NATURES_PFU /
 * NATURES_EXONEREES (voir détail des changements sous chaque groupe) : on ne
 * devine pas de règle fiscale pour elles.
 */

export const PFU_RATE = 0.314;
export const PFU_IR = 0.128;
// 18,6 % : CSG sur les revenus du capital portée de 9,2 % à 10,6 % par la
// LFSS 2026 (loi n° 2025-1403). Ne s'applique PAS aux plus-values
// immobilières ni aux métaux précieux (CSG maintenue à 9,2 %, soit 17,2 %) —
// cf. PVI_PS_RATE (regimeFiscalPVI.ts) et METAUX_PS ci-dessous.
export const PFU_PS = 0.186;
// Or / métaux précieux, option plus-value réelle : 19 % IR + 17,2 % PS.
const METAUX_IR = 0.19;
const METAUX_PS = 0.172;
const METAUX_TOTAL = METAUX_IR + METAUX_PS;

export type FiscalTone = 'pfu' | 'exonere_partiel' | 'exonere_total' | 'informatif' | 'choix' | 'non_determine';

export interface FiscalAlternative {
  label: string;
  total: number;
}

export interface FiscalRegimeResult {
  badge: string;
  tone: FiscalTone;
  ir: number | null;
  ps: number | null;
  total: number | null;
  note?: string;
  alternatives?: FiscalAlternative[];
  // Détail court affiché au-dessus du montant dans les cellules IR / PS /
  // Total du tableau (ex. "Abattement 24%", "Surtaxe : 1 200 €"), utilisé par
  // le régime PVI pour rendre le calcul lisible sans colonne supplémentaire.
  irDetail?: string;
  psDetail?: string;
  totalDetail?: string;
}

// --- Groupe 1 : PFU générique ---
// Dettes subordonnées, dette privée
// (par défaut), CTO générique, matières premières (trackers/ETC/contrats à
// terme).
//
// Changements vs l'ancien système (NATURES_PFU) :
// - "Titres de dette subordonnée",
//   "Fonds de dette privée", "Contrat à terme" : restaient déjà PFU.
// - "Compte-titres (CTO)" : corrige un bug de l'ancien système, qui listait
//   "Compte-titres" (sans "(CTO)") dans NATURES_PFU — cette chaîne ne
//   correspondait à aucune valeur réelle de `nature` (ASSET_NATURES utilise
//   "Compte-titres (CTO)"), donc cette nature n'était en réalité JAMAIS
//   classée PFU malgré sa présence dans le tableau. Désormais fonctionnelle.
// - "Matières premières (pétrole, blé…)" : nouvelle addition, absente de
//   l'ancien NATURES_PFU.
const NATURES_PFU_GENERIQUE = [
  'Titres de dette subordonnée',
  'Fonds de dette privée',
  'Compte-titres (CTO)',
  'Matières premières (pétrole, blé…)',
  'Contrat à terme',
  // Ajoutées le 2026-10-18 (revue des placements financiers) : gains sur titres et
  // instruments financiers à terme, PFU (art. 150-0 A et 150 ter CGI).
  'Produits structurés',
  'Autres produits dérivés (Swap, Warrants, CFD...)',
  'Club deals',
  "SPV d'investissement (structures ad hoc)",
  'Parts de SOFICA',
  'Autres valeurs mobilières',
  // Ajoutée le 2026-10-18 : contenu hétérogène, PFU retenu par hypothèse (décision utilisateur).
  'Autres placements divers',
];

// Notes propres à certaines natures du PFU générique (conditions non saisies).
const NOTES_PFU: Record<string, string> = {
  'Compte-titres (CTO)': "Titres acquis avant le 01/01/2018 : l'option pour le barème ouvre droit aux abattements pour durée de détention (50 % de 2 à 8 ans, 65 % au-delà ; régime renforcé PME jusqu'à 85 %), non calculés ici.",
  'Club deals': "Souscription au capital d'une PME ayant ouvert droit à la réduction IR-PME : reprise en cas de cession avant 5 ans. Titres reçus en apport à une holding : report d'imposition (art. 150-0 B ter) non modélisé.",
  "SPV d'investissement (structures ad hoc)": "Souscription au capital d'une PME ayant ouvert droit à la réduction IR-PME : reprise en cas de cession avant 5 ans.",
  'Parts de SOFICA': "Aucune exonération de la plus-value. Cession avant 5 ans : reprise de la réduction d'impôt obtenue à la souscription, non comptée ici.",
  'Autres valeurs mobilières': 'PFU retenu par défaut pour des titres détenus en direct.',
  'Autres placements divers': "Hypothèse : PFU retenu par défaut, le régime réel dépendant de la nature du placement.",
  'Matières premières (pétrole, blé…)': "Détention financière (tracker, ETC, contrat) supposée : une détention physique relève des biens meubles (art. 150 UA), à préciser sur l'actif.",
};

// --- Fonds fiscaux de capital-investissement (FIP, FIP Corse, FCPI) ---
// Plus-values de cession exonérées d'IR après 5 ans de détention (art. 150-0 A III 1 CGI),
// prélèvements sociaux dus ; avant 5 ans, PFU et reprise de la réduction d'impôt.
// Clés internes du dispatch : la nature saisie est « Fonds de capital-investissement », dont le
// type de fonds (type_fonds) est résolu vers l'une de ces clés par resolveEffectiveNature.
const NATURES_FONDS_FISCAUX = ['Parts de FIP', 'Parts de FIP Corse', 'Parts de FCPI'];
const TYPE_FONDS_TO_NATURE: Record<string, string> = {
  fcpi: 'Parts de FCPI',
  fip: 'Parts de FIP',
  fip_corse: 'Parts de FIP Corse',
  fcpr_fpci: 'Fonds de private equity (LBO, growth, venture)',
};

// --- Droits sociaux, parts de holding (art. 150-0 A CGI) ---
// PFU 31,4 % ; cession par un dirigeant partant à la retraite : abattement fixe de 500 000 €
// sur l'assiette de l'IR (art. 150-0 D ter), prélèvements sociaux sur toute la plus-value.
const NATURES_DROITS_SOCIAUX = ['Droits sociaux', 'Parts de holding'];
const ABATTEMENT_DEPART_RETRAITE = 500000;

// --- Entreprise individuelle, autres biens professionnels : plus-values professionnelles ---
const NATURES_PV_PROFESSIONNELLES = ['Entreprise individuelle', 'Autres biens professionnels'];

// --- Droits de propriété littéraire ou artistique ---
// Revenus de l'auteur (traitements et salaires ou BNC) : pas de plus-value.
const NATURE_DROITS_AUTEUR = 'Droits de propriété littéraire ou artistique';

// --- Épargne salariale (PEE, PEI) ---
// Gains exonérés d'IR à l'échéance comme en cas de déblocage anticipé légal ; prélèvements
// sociaux seuls (18,6 % : épargne salariale concernée par la hausse de CSG de la LFSS 2026).
const NATURES_EPARGNE_SALARIALE_PV = ['PEE', 'PEI'];

// --- Groupe 2 : PEA / PEA-PME ---
const NATURES_PEA = ['PEA', 'PEA-PME'];

// --- Groupe 3 : Actions gratuites (AGA) ---
const NATURE_AGA = 'Actions gratuites';

// --- Groupe 4 : Stock-options ---
const NATURE_STOCK_OPTIONS = 'Stock-options';

// --- Groupe 5 : BSPCE ---
const NATURE_BSPCE = 'BSPCE';

// --- Groupe 6 : Cryptomonnaies ---
const NATURE_CRYPTO = 'Portefeuille de valeurs numériques (cryptomonnaies)';

// --- Groupe 7 : Private equity (FCPR/FPCI) ---
const NATURE_PRIVATE_EQUITY = 'Fonds de private equity (LBO, growth, venture)';

// --- Groupe 8 : Or et métaux précieux ---
const NATURES_OR = ['Or (physique)', 'Métaux précieux (argent, platine)'];
// Taxe forfaitaire due quel que soit le prix de cession (art. 150 VI CGI) : le seuil de
// 5 000 € (150 VJ) ne vise que les bijoux, objets d'art, de collection et antiquités.

// "Objets numériques (NFT, etc.)" : aiguillé dans assetFiscalRegime.ts selon
// `qualification_nft` ; "Non déterminé" ici tant qu'elle n'est pas renseignée.
//
// Natures qui redescendent en "Non déterminé" alors qu'elles étaient
// "Exonéré" dans l'ancien système : "Livret A", "Livret de développement
// durable et solidaire (LDDS)", "Livret d'épargne populaire (LEP)",
// "Livret Jeune". En pratique ces livrets n'ont pas de valeur d'acquisition
// suivie et n'apparaissent quasiment jamais dans ce tableau.
//
// "Droits à royalties" : "Non déterminé", mis de côté le 2026-10-18 (le régime
// dépend de la forme de l'actif, cf. docs/patrimoine.md). La plus-value brute reste affichée normalement dans
// l'UI, seule la fiscalité n'est pas calculée.

// --- CTO multi-actifs : résolution de la nature effective pour le régime fiscal ---
// Un CTO peut détenir un sous-jacent qui suit un régime fiscal différent du
// PFU générique (SCPI, cryptomonnaies, or/métaux précieux, private equity).
// Cette table fait correspondre le sous-jacent déclaré à une nature déjà
// gérée par les moteurs de régime existants (regimeFiscalPVI.ts pour SCPI,
// ci-dessus pour les 3 autres) : aucune logique de calcul n'est dupliquée,
// seule la nature transmise au dispatch change.
const CTO_SOUS_JACENT_TO_NATURE: Record<string, string> = {
  'SCPI': 'Parts de SCPI',
  'Cryptomonnaies': NATURE_CRYPTO,
  // Les deux natures d'NATURES_OR reçoivent un traitement fiscal identique
  // (même badge, mêmes taux) : le choix de l'une ou l'autre ici est sans
  // incidence sur le résultat calculé.
  'Or / métaux précieux': NATURES_OR[0],
  'Private equity (FCPR/FPCI)': NATURE_PRIVATE_EQUITY,
};

export const resolveEffectiveNature = (
  nature: string,
  ctoMultiActifs?: boolean,
  ctoNatureSousJacent?: string,
  typeFonds?: string | null
): string => {
  if (nature === NATURE_FONDS_CI) return (typeFonds && TYPE_FONDS_TO_NATURE[typeFonds]) || nature;
  if (nature === 'Compte-titres (CTO)' && ctoMultiActifs && ctoNatureSousJacent) {
    return CTO_SOUS_JACENT_TO_NATURE[ctoNatureSousJacent] ?? nature;
  }
  return nature;
};

/** Années révolues de détention à `dateReference` (aujourd'hui par défaut, ou date de cession simulée). */
export const getHoldingYears = (dateAcquisition?: string, dateReference: Date = new Date()): number | null => {
  if (!dateAcquisition) return null;
  const acquisition = new Date(dateAcquisition);
  if (isNaN(acquisition.getTime())) return null;
  return differenceInYears(dateReference, acquisition);
};

export interface ComputeFiscalRegimeInput {
  nature: string;
  plusValue: number;
  valeurEstimee: number;
  dateAcquisition?: string;
  // Droits sociaux / parts de holding : cession au départ à la retraite du dirigeant.
  cessionDepartRetraite?: boolean;
}

export const computeFiscalRegime = ({
  nature,
  plusValue,
  valeurEstimee,
  dateAcquisition,
  cessionDepartRetraite,
}: ComputeFiscalRegimeInput): FiscalRegimeResult => {
  // Fonds de capital-investissement dont le type n'a pas été résolu (cf. resolveEffectiveNature).
  if (nature === NATURE_FONDS_CI) {
    return {
      badge: 'Type de fonds à préciser',
      tone: 'non_determine',
      ir: null,
      ps: null,
      total: null,
      note: "Type de fonds non renseigné (FCPI, FIP, FIP Corse ou FCPR / FPCI) : il détermine l'exonération après 5 ans et la reprise éventuelle d'une réduction d'impôt.",
    };
  }
  if (NATURES_DROITS_SOCIAUX.includes(nature)) {
    const abattement = cessionDepartRetraite ? Math.min(Math.max(plusValue, 0), ABATTEMENT_DEPART_RETRAITE) : 0;
    const ir = (plusValue - abattement) * PFU_IR;
    const notes = [
      cessionDepartRetraite
        ? `Départ à la retraite du dirigeant : abattement fixe de ${abattement.toLocaleString('fr-FR')} € sur l'IR (art. 150-0 D ter, conditions de fonctions, de détention et de cessation d'activité dans les 2 ans) ; prélèvements sociaux sur toute la plus-value.`
        : "Cession par un dirigeant partant à la retraite : abattement fixe de 500 000 € sur l'IR (art. 150-0 D ter), à indiquer sur l'actif.",
      "Option barème : abattements pour durée de détention sur les titres acquis avant 2018 (50 % / 65 %, jusqu'à 85 % pour une jeune PME), non calculés.",
      "Apport préalable à une holding : report d'imposition (art. 150-0 B ter) ; donation avant cession : plus-value purgée.",
      "Société de personnes (IR) dans laquelle l'associé exerce son activité : plus-values professionnelles.",
    ];
    return {
      badge: cessionDepartRetraite ? 'PFU 31,4% — départ retraite' : 'PFU 31,4%',
      tone: 'pfu',
      ir,
      ps: plusValue * PFU_PS,
      total: ir + plusValue * PFU_PS,
      irDetail: abattement > 0 ? `Abattement ${abattement.toLocaleString('fr-FR')} €` : undefined,
      note: notes.join(' '),
    };
  }
  if (nature === NATURE_DROITS_AUTEUR) {
    return {
      badge: "Revenus d'auteur",
      tone: 'informatif',
      ir: null,
      ps: null,
      total: null,
      note: "Droits perçus ou cédés par l'auteur : imposés comme des revenus (traitements et salaires ou bénéfices non commerciaux), pas comme une plus-value.",
    };
  }
  if (NATURES_PV_PROFESSIONNELLES.includes(nature)) {
    return {
      badge: 'Plus-values professionnelles',
      tone: 'informatif',
      ir: null,
      ps: null,
      total: null,
      note: "Plus-values professionnelles : court terme au barème (et cotisations sociales), long terme à 12,8 % + 17,2 %. Exonérations possibles : selon les recettes après 5 ans d'activité (art. 151 septies), cession de l'entreprise d'une valeur jusqu'à 500 000 € (totale) ou 1 000 000 € (partielle, art. 238 quindecies), départ à la retraite (art. 151 septies A). Non calculé : chiffre d'affaires, activité, ancienneté et ventilation de l'actif non saisis.",
    };
  }
  if (NATURES_PFU_GENERIQUE.includes(nature)) {
    const base = "Option pour le barème progressif de l'IR possible sur demande expresse (non calculée ici).";
    return {
      badge: 'PFU 31,4%',
      tone: 'pfu',
      ir: plusValue * PFU_IR,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_RATE,
      note: NOTES_PFU[nature] ? `${base} ${NOTES_PFU[nature]}` : base,
    };
  }

  if (nature === NATURE_CRYPTO) {
    // Simplification volontaire : la franchise d'imposition de 305 € (seuil
    // annuel, cumul de toutes les cessions de cryptoactifs de l'année) n'est
    // PAS appliquée ici. Elle nécessite d'agréger l'ensemble des cessions de
    // l'année sur tous les actifs crypto de l'utilisateur, ce qui est hors
    // périmètre de cette vue par actif.
    return {
      badge: 'PFU 31,4%',
      tone: 'pfu',
      ir: plusValue * PFU_IR,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_RATE,
      note: 'Option pour le barème progressif possible. Franchise annuelle de 305 € (cumul de toutes les cessions) non appliquée ici.',
    };
  }

  if (NATURES_EPARGNE_SALARIALE_PV.includes(nature)) {
    return {
      badge: 'Épargne salariale — exonérée d\'IR',
      tone: 'exonere_partiel',
      ir: 0,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_PS,
      note: "Gains exonérés d'impôt sur le revenu, à l'échéance comme en cas de déblocage anticipé ; prélèvements sociaux (18,6 %) seuls dus. Gain = valeur − versements (abondement compris, déjà soumis à la CSG/CRDS à l'entrée). Des taux historiques de prélèvements sociaux peuvent s'appliquer aux gains anciens : non modélisés.",
    };
  }
  if (NATURES_PEA.includes(nature)) {
    const years = getHoldingYears(dateAcquisition);
    if (years === null) {
      return {
        badge: 'PEA — durée inconnue',
        tone: 'non_determine',
        ir: null,
        ps: null,
        total: null,
        note: "Date d'acquisition non renseignée : impossible de déterminer si le seuil de 5 ans de détention est atteint.",
      };
    }
    if (years < 5) {
      return {
        badge: 'PEA < 5 ans',
        tone: 'pfu',
        ir: plusValue * PFU_IR,
        ps: plusValue * PFU_PS,
        total: plusValue * PFU_RATE,
        note: "Sauf cas de retrait anticipé sans clôture du plan (licenciement, invalidité, création d'entreprise, retraite anticipée) : non calculé ici.",
      };
    }
    return {
      badge: 'PEA ≥ 5 ans',
      tone: 'exonere_partiel',
      ir: 0,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_PS,
      note: 'Exonéré d\'IR après 5 ans de détention ; prélèvements sociaux (18,6%) restant dus.',
    };
  }

  if (NATURES_FONDS_FISCAUX.includes(nature)) {
    const years = getHoldingYears(dateAcquisition);
    if (years === null) {
      return {
        badge: 'FIP/FCPI — durée inconnue',
        tone: 'non_determine',
        ir: null,
        ps: null,
        total: null,
        note: 'Date de souscription non renseignée : impossible de déterminer si le seuil de 5 ans est atteint.',
      };
    }
    if (years < 5) {
      return {
        badge: 'FIP/FCPI < 5 ans',
        tone: 'pfu',
        ir: plusValue * PFU_IR,
        ps: plusValue * PFU_PS,
        total: plusValue * PFU_RATE,
        note: "Cession avant 5 ans : plus-value au PFU et reprise de la réduction d'impôt obtenue à la souscription (non comptée ici), sauf invalidité, décès ou licenciement.",
      };
    }
    return {
      badge: 'FIP/FCPI ≥ 5 ans',
      tone: 'exonere_partiel',
      ir: 0,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_PS,
      note: "Exonéré d'IR après 5 ans de détention ; prélèvements sociaux (18,6%) restant dus.",
    };
  }
  if (nature === NATURE_PRIVATE_EQUITY) {
    const years = getHoldingYears(dateAcquisition);
    if (years === null) {
      return {
        badge: 'Private equity — durée inconnue',
        tone: 'non_determine',
        ir: null,
        ps: null,
        total: null,
        note: 'Date de souscription non renseignée : impossible de déterminer si le seuil de 5 ans est atteint.',
      };
    }
    if (years < 5) {
      return {
        badge: 'FCPR/FPCI < 5 ans',
        tone: 'pfu',
        ir: plusValue * PFU_IR,
        ps: plusValue * PFU_PS,
        total: plusValue * PFU_RATE,
        note: 'Option pour le barème progressif possible.',
      };
    }
    return {
      badge: 'FCPR/FPCI ≥ 5 ans',
      tone: 'exonere_partiel',
      ir: 0,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_PS,
      note: "Exonéré d'IR après 5 ans de détention depuis la souscription ; prélèvements sociaux (18,6%) restant dus. Suppose un fonds fiscal (FCPR fiscal / FPCI) avec engagement de conservation de 5 ans et réinvestissement des distributions : un fonds non fiscal reste au PFU.",
    };
  }

  if (nature === NATURE_AGA) {
    return {
      badge: 'Actions gratuites (AGA)',
      tone: 'informatif',
      ir: null,
      ps: null,
      total: null,
      note: "Gain d'acquisition (fraction < 300 000 €) : abattement 50% puis barème progressif + prélèvements sociaux spécifiques 17,2%. Au-delà de 300 000 € : régime traitements et salaires (barème + CSG/CRDS 9,7% + contribution salariale spécifique 10%). Plus-value de cession au-delà de la valeur à l'acquisition : PFU 31,4%. Décomposition non calculée ici : la valeur à l'acquisition n'est pas distincte de la valeur d'achat suivie dans l'application.",
    };
  }

  if (nature === NATURE_STOCK_OPTIONS) {
    return {
      badge: 'Stock-options',
      tone: 'informatif',
      ir: null,
      ps: null,
      total: null,
      note: "Gain de levée (valeur des titres à la levée − prix d'exercice) : régime traitements et salaires (barème progressif + prélèvements sociaux). Plus-value de cession au-delà : PFU 31,4%. Décomposition non calculée ici : la valeur des titres au jour de la levée n'est pas saisie (seul le prix d'exercice l'est).",
    };
  }

  if (nature === NATURE_BSPCE) {
    return {
      badge: 'BSPCE',
      tone: 'informatif',
      ir: null,
      ps: null,
      total: null,
      note: "Gain d'exercice : 12,8% si ancienneté ≥ 3 ans dans la société à la date de cession, sinon barème progressif obligatoire (+ 18,6% de prélèvements sociaux dans tous les cas). Gain de cession (différence entre prix de cession et valeur à l'exercice) : PFU 31,4% (ou barème sur option). L'ancienneté dans la société n'est pas un champ du formulaire actif : à renseigner/estimer manuellement, elle n'est pas devinée ici.",
    };
  }

  if (NATURES_OR.includes(nature)) {
    const totalForfaitaire = valeurEstimee * 0.115;
    const alternatives: FiscalAlternative[] = [
      { label: 'Taxe forfaitaire 11,5% (prix de vente, sans justificatif)', total: totalForfaitaire },
    ];

    const years = getHoldingYears(dateAcquisition);
    const note = "Deux régimes possibles, au choix du contribuable : taxe forfaitaire, due quel que soit le prix de cession (aucun justificatif d'acquisition requis), ou option plus-value réelle (nécessite un justificatif de prix et de date d'acquisition).";
    if (years !== null && plusValue > 0) {
      const abattement = years >= 22 ? 1 : Math.min(Math.max(years - 2, 0) * 0.05, 1);
      const totalReelle = plusValue * (1 - abattement) * METAUX_TOTAL;
      alternatives.push({
        label: years >= 22
          ? 'Option plus-value réelle (exonérée après 22 ans de détention)'
          : `Option plus-value réelle ${(METAUX_TOTAL * 100).toFixed(1).replace('.', ',')}% (abattement ${(abattement * 100).toFixed(0)}% pour ${years} an${years > 1 ? 's' : ''} de détention)`,
        total: totalReelle,
      });
    }

    return {
      badge: 'Or / métaux précieux — choix',
      tone: 'choix',
      ir: null,
      ps: null,
      total: null,
      note,
      alternatives,
    };
  }

  return {
    badge: 'Non déterminé',
    tone: 'non_determine',
    ir: null,
    ps: null,
    total: null,
  };
};
