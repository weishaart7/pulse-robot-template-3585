/**
 * Cases du formulaire 2027 (revenus 2026, simulateur officiel provisoire calc-2027) sans effet sur le
 * calcul : vérifiées une à une sur le simulateur (RFR, impôt, PS et solde inchangés avec ou sans la case).
 * Saisissables pour couvrir toute la 2042 ; stockées à part (table `cases_informatives_2042`) et jamais
 * lues par le moteur. Hors périmètre (non-résidents) : 3SE, exit tax 3TA…3YB, 8TD, 8TM, 8TN.
 */

export type FormulaireCasesInformatives =
  | 'salaires' | 'pensions' | 'exoneres' | 'gains' | 'capitauxMobiliers' | 'plusValues' | 'fonciers'
  | 'nonSalaries' | 'prelevementSource';

/** montant en €, case à cocher, nombre entier (mois, diviseur), pourcentage, taux saisi sans virgule (128 = 12,8 %). */
export type TypeCaseInformative = 'montant' | 'coche' | 'mois' | 'nombre' | 'pourcentage' | 'taux';

export interface LigneCasesInformatives {
  formulaire: FormulaireCasesInformatives;
  groupe: string;
  libelle: string;
  type: TypeCaseInformative;
  /** Code de la case et libellé de sa colonne (déclarant, personne à charge, période…). */
  cases: readonly (readonly [code: string, colonne: string])[];
}

const D = ['Déclarant 1', 'Déclarant 2', 'Pers. à charge'] as const;
const parDeclarant = (...codes: string[]) => codes.map((c, i) => [c, D[i]] as const);
const periodes = (avant: string, apres: string) => [[avant, 'Du 1.1 au 19.2'], [apres, 'Du 20.2 au 31.12']] as const;

/** Lignes d'un régime du cadre 5 : durée de l'exercice et cession ou cessation d'activité. */
const regime = (groupe: string, duree: string[], cessation: string[]): LigneCasesInformatives[] => [
  { formulaire: 'nonSalaries', groupe, libelle: 'Durée de l\'exercice', type: 'mois', cases: parDeclarant(...duree) },
  { formulaire: 'nonSalaries', groupe, libelle: 'Cession ou cessation d\'activité en 2026', type: 'coche', cases: parDeclarant(...cessation) },
];
const dontPlusMoinsValues = (groupe: string, regimeReel: string, pv: string[], mv: string[]): LigneCasesInformatives[] => [
  { formulaire: 'nonSalaries', groupe, libelle: `${regimeReel} — dont plus-values à court terme, subventions d'équipement, indemnités d'assurance`, type: 'montant', cases: parDeclarant(...pv) },
  { formulaire: 'nonSalaries', groupe, libelle: `${regimeReel} — dont moins-values à court terme`, type: 'montant', cases: parDeclarant(...mv) },
];
const moinsValuesLongTermePac = (groupe: string, regimeMicro: string, code: string): LigneCasesInformatives => (
  { formulaire: 'nonSalaries', groupe, libelle: `${regimeMicro} — moins-values nettes à long terme`, type: 'montant', cases: [[code, 'Pers. à charge']] }
);

const AGRICOLES = 'Revenus agricoles';
const BIC_PRO = 'Revenus industriels et commerciaux professionnels';
const LMNP = 'Locations meublées non professionnelles';
const BIC_NON_PRO = 'Revenus industriels et commerciaux non professionnels';
const BNC_PRO = 'Revenus non commerciaux professionnels';
const BNC_NON_PRO = 'Revenus non commerciaux non professionnels';
const CDHR = 'Contribution différentielle sur les hauts revenus (page détail)';
const VENTILATION = 'Ventilation par date de perception';

export const CASES_INFORMATIVES_2027: readonly LigneCasesInformatives[] = [
  // Cadre 1
  { formulaire: 'salaires', groupe: 'Salaires des personnes à charge', libelle: 'Majoration du seuil d\'exonération (apprentis, étudiants)', type: 'coche', cases: [['1CV', '1re pers. à charge'], ['1DV', '2e pers. à charge']] },
  { formulaire: 'salaires', groupe: 'Salaires des personnes à charge', libelle: 'Salaires des lignes 1GB, 1GF… plus perçus en 2026', type: 'coche', cases: [['1GP', '1re pers. à charge'], ['1GQ', '2e pers. à charge']] },
  { formulaire: 'salaires', groupe: 'Salaires des personnes à charge', libelle: 'Abattement forfaitaire : assistants maternels ou familiaux, journalistes', type: 'montant', cases: [['1IA', '1re pers. à charge'], ['1JA', '2e pers. à charge']] },
  { formulaire: 'pensions', groupe: 'Pensions des personnes à charge', libelle: 'Pensions des lignes 1AO, 1AM plus perçues en 2027', type: 'coche', cases: [['1HP', '1re pers. à charge'], ['1HQ', '2e pers. à charge']] },
  { formulaire: 'exoneres', groupe: 'Salaires exonérés des personnes à charge', libelle: 'Marins-pêcheurs exerçant hors des eaux territoriales françaises', type: 'coche', cases: [['1IE', '1re pers. à charge'], ['1JE', '2e pers. à charge']] },
  { formulaire: 'gains', groupe: 'Gains de cession de titres souscrits ou acquis par des salariés et dirigeants', libelle: 'Fraction des gains de 2026 placée en report d\'imposition', type: 'montant', cases: parDeclarant('1NP', '1NQ') },
  { formulaire: 'gains', groupe: 'Gains de cession de titres souscrits ou acquis par des salariés et dirigeants', libelle: 'Fraction des gains antérieurs dont le report d\'imposition est maintenu en 2026', type: 'montant', cases: parDeclarant('1OP', '1OQ') },
  // Cadre 2
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Produits de la ligne 2DH', type: 'montant', cases: periodes('2DK', '2DL') },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Revenus de la ligne 2EE', type: 'montant', cases: periodes('2EF', '2EG') },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Prélèvement sur les revenus 2EE perçus du 20.2 au 31.12.2026', type: 'montant', cases: [['2EH', 'Montant']] },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Gains de la ligne 2VM', type: 'montant', cases: periodes('2VJ', '2VK') },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Prélèvement sur les gains 2VM perçus du 20.2 au 31.12.2026', type: 'montant', cases: [['2VL', 'Montant']] },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Produits de la ligne 2XX', type: 'montant', cases: periodes('2XY', '2XZ') },
  { formulaire: 'capitauxMobiliers', groupe: VENTILATION, libelle: 'Prélèvement sur les produits 2XX perçus du 20.2 au 31.12.2026', type: 'montant', cases: [['2XW', 'Montant']] },
  // Cadres 3 et 4
  { formulaire: 'plusValues', groupe: 'Plus-values en report d\'imposition (art. 150-0 B ter CGI)', libelle: 'Plus-values réalisées en 2026', type: 'montant', cases: [['3WH', 'Avant abattement'], ['3WG', 'Après abattement']] },
  { formulaire: 'fonciers', groupe: 'Revenus fonciers', libelle: 'Déficit imputable sur les revenus fonciers', type: 'montant', cases: [['4BB', 'Montant']] },
  // Cadre 5
  ...regime(AGRICOLES, ['5AD', '5BD', '5ED'], ['5AF', '5AI', '5AH']),
  ...dontPlusMoinsValues(AGRICOLES, 'Bénéfice réel', ['5AQ', '5BQ', '5CU'], ['5AY', '5BY', '5CV']),
  { formulaire: 'nonSalaries', groupe: AGRICOLES, libelle: 'Bénéfice réel — jeunes agriculteurs : abattement de 50 % ou 100 %', type: 'pourcentage', cases: parDeclarant('5HM', '5IM', '5JM') },
  { formulaire: 'nonSalaries', groupe: AGRICOLES, libelle: 'Bénéfice réel — option pour le paiement fractionné si passage à l\'IS', type: 'montant', cases: parDeclarant('5EA', '5EI', '5EU') },
  moinsValuesLongTermePac(AGRICOLES, 'Micro-BA', '5ZN'),
  ...regime(BIC_PRO, ['5DB', '5EB', '5FB'], ['5BF', '5BI', '5BH']),
  ...dontPlusMoinsValues(BIC_PRO, 'Bénéfice réel', ['5UT', '5VT', '5VQ'], ['5UY', '5VY', '5VV']),
  moinsValuesLongTermePac(BIC_PRO, 'Micro-entreprise', '5MR'),
  ...regime(LMNP, ['5CD', '5DD', '5FD'], ['5CF', '5CI', '5CM']),
  ...dontPlusMoinsValues(LMNP, 'Bénéfice réel', ['5DK', '5EK', '5FK'], ['5DM', '5EM', '5FM']),
  ...regime(BIC_NON_PRO, ['5UP', '5VP', '5TP'], ['5AN', '5BN', '5CN']),
  moinsValuesLongTermePac(BIC_NON_PRO, 'Micro-entreprise', '5PR'),
  ...regime(BNC_PRO, ['5XI', '5YI', '5ZI'], ['5AO', '5BO', '5CQ']),
  ...dontPlusMoinsValues(BNC_PRO, 'Déclaration contrôlée', ['5XY', '5YY', '5ZY'], ['5VM', '5WM', '5ZM']),
  moinsValuesLongTermePac(BNC_PRO, 'Régime déclaratif spécial', '5JS'),
  ...regime(BNC_NON_PRO, ['5XR', '5YR', '5ZR'], ['5AP', '5BP', '5CR']),
  ...dontPlusMoinsValues(BNC_NON_PRO, 'Déclaration contrôlée', ['5XP', '5YP', '5ZP'], ['5XH', '5YH', '5ZH']),
  moinsValuesLongTermePac(BNC_NON_PRO, 'Régime déclaratif spécial ou micro-BNC', '5MW'),
  // Cadre 8 : page détail de la CDHR
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Revenus de source étrangère exonérés par convention internationale (montant net)', type: 'montant', cases: [['8CD', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Revenus exceptionnels nets taxés au quotient', type: 'montant', cases: [['8KA', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Abattements des RCM et pour durée de détention des plus-values', type: 'montant', cases: [['8KB', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Abattement fixe des dirigeants partant à la retraite', type: 'montant', cases: [['8KC', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Revenus exceptionnels non taxés au quotient', type: 'montant', cases: [['8KD', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Taux proportionnel appliqué à ces revenus (sans virgule : 12,8 % → 128)', type: 'taux', cases: [['8KE', 'Taux']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Seconds revenus exceptionnels non taxés au quotient', type: 'montant', cases: [['8KF', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Taux proportionnel appliqué à ces revenus (sans virgule : 12,8 % → 128)', type: 'taux', cases: [['8KG', 'Taux']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Revenus différés nets taxés au quotient', type: 'montant', cases: [['8KI', 'Montant']] },
  { formulaire: 'prelevementSource', groupe: CDHR, libelle: 'Diviseur du quotient (années d\'échéances normales + 1)', type: 'nombre', cases: [['8KJ', 'Diviseur']] },
];

/** Code de case → clé de saisie (5AD → case5ad) et colonne Supabase (case_5ad). */
export const cleCaseInformative = (code: string) => `case${code.toLowerCase()}`;
export const colonneCaseInformative = (code: string) => `case_${code.toLowerCase()}`;

export const TOUTES_CASES_INFORMATIVES_2027 = CASES_INFORMATIVES_2027.flatMap((l) => l.cases.map(([code]) => ({ code, type: l.type, formulaire: l.formulaire })));

/** Valeurs saisies, par clé (`case5ad`) : nombre, booléen pour une case à cocher, null si vide. */
export type ValeursCasesInformatives = Record<string, number | boolean | null>;
