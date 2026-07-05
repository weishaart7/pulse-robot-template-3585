import { differenceInYears } from 'date-fns';

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
export const PFU_PS = 0.186;

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
// Actions, Obligations, Bons du Trésor, dettes subordonnées, dette privée
// (par défaut), CTO générique, matières premières (trackers/ETC/contrats à
// terme).
//
// Changements vs l'ancien système (NATURES_PFU) :
// - "Actions", "Obligations", "Bons du Trésor", "Titres de dette subordonné",
//   "Fonds de dette privée", "Contrat à terme" : restaient déjà PFU.
// - "Compte-titres (CTO)" : corrige un bug de l'ancien système, qui listait
//   "Compte-titres" (sans "(CTO)") dans NATURES_PFU — cette chaîne ne
//   correspondait à aucune valeur réelle de `nature` (ASSET_NATURES utilise
//   "Compte-titres (CTO)"), donc cette nature n'était en réalité JAMAIS
//   classée PFU malgré sa présence dans le tableau. Désormais fonctionnelle.
// - "Matières premières (pétrole, blé…)" : nouvelle addition, absente de
//   l'ancien NATURES_PFU.
const NATURES_PFU_GENERIQUE = [
  'Actions',
  'Obligations',
  'Bons du Trésor',
  'Titres de dette subordonné',
  'Fonds de dette privée',
  'Compte-titres (CTO)',
  'Matières premières (pétrole, blé…)',
  'Contrat à terme',
];

// --- Groupe 2 : PEA / PEA-PME ---
const NATURES_PEA = ['PEA', 'PEA-PME'];

// --- Groupe 3 : Actions gratuites (AGA) ---
const NATURE_AGA = 'Actions gratuites';

// --- Groupe 4 : Stock-options ---
const NATURE_STOCK_OPTIONS = 'Stock-options';

// --- Groupe 5 : BSPCE ---
// La nature "BSPCE" n'existe pas telle quelle dans ASSET_NATURES : la
// constante existante est orthographiée "BCSPE" (coquille historique du
// projet, non corrigée ici — hors périmètre de cette tâche). On s'appuie sur
// cette valeur réelle pour que la correspondance fonctionne.
const NATURE_BSPCE = 'BCSPE';

// --- Groupe 6 : Cryptomonnaies ---
const NATURE_CRYPTO = 'Portefeuille de valeurs numériques (cryptomonnaies)';

// --- Groupe 7 : Private equity (FCPR/FPCI) ---
const NATURE_PRIVATE_EQUITY = 'Fonds de private equity (LBO, growth, venture)';

// --- Groupe 8 : Or et métaux précieux ---
const NATURES_OR = ['Or (physique)', 'Métaux précieux (argent, platine)'];

// Natures qui redescendent en "Non déterminé" alors qu'elles étaient PFU dans
// l'ancien système (hors périmètre des 8 règles demandées ; à ne pas deviner) :
// "Parts de FIP", "Parts de FIP Corse", "Parts de FCPI", "Club deals",
// "SPV d'investissement (structures ad hoc)", "Produits structurés",
// "Autres produits dérivés (Swap, Warrants, CFD...)", "Credit default swap",
// "Options".
//
// Natures qui redescendent en "Non déterminé" alors qu'elles étaient
// "Exonéré" dans l'ancien système : "Livret A", "Livret de développement
// durable et solidaire (LDDS)", "Livret d'épargne populaire (LEP)",
// "Livret Jeune". En pratique ces livrets n'ont pas de valeur d'acquisition
// suivie et n'apparaissent quasiment jamais dans ce tableau.

export const getHoldingYears = (dateAcquisition?: string): number | null => {
  if (!dateAcquisition) return null;
  const acquisition = new Date(dateAcquisition);
  if (isNaN(acquisition.getTime())) return null;
  return differenceInYears(new Date(), acquisition);
};

export interface ComputeFiscalRegimeInput {
  nature: string;
  plusValue: number;
  valeurEstimee: number;
  dateAcquisition?: string;
}

export const computeFiscalRegime = ({
  nature,
  plusValue,
  valeurEstimee,
  dateAcquisition,
}: ComputeFiscalRegimeInput): FiscalRegimeResult => {
  if (NATURES_PFU_GENERIQUE.includes(nature)) {
    return {
      badge: 'PFU 31,4%',
      tone: 'pfu',
      ir: plusValue * PFU_IR,
      ps: plusValue * PFU_PS,
      total: plusValue * PFU_RATE,
      note: "Option pour le barème progressif de l'IR possible sur demande expresse (non calculée ici).",
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
      note: "Exonéré d'IR après 5 ans de détention depuis la souscription ; prélèvements sociaux (18,6%) restant dus.",
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
      note: 'Gain de levée : régime traitements et salaires (barème progressif + prélèvements sociaux). Plus-value de cession au-delà : PFU 31,4%. Décomposition non calculée ici : le prix/valeur de levée n\'est pas un champ distinct dans l\'application.',
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
    const note = "Deux régimes possibles, au choix du contribuable : taxe forfaitaire (aucun justificatif d'acquisition requis) ou option plus-value réelle (nécessite un justificatif de prix et de date d'acquisition).";
    if (years !== null && plusValue > 0) {
      const abattement = years >= 22 ? 1 : Math.min(Math.max(years - 2, 0) * 0.05, 1);
      const totalReelle = plusValue * (1 - abattement) * 0.376;
      alternatives.push({
        label: years >= 22
          ? 'Option plus-value réelle (exonérée après 22 ans de détention)'
          : `Option plus-value réelle 37,6% (abattement ${(abattement * 100).toFixed(0)}% pour ${years} an${years > 1 ? 's' : ''} de détention)`,
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
