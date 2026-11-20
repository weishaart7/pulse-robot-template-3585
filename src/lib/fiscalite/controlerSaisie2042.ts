import type {
  ChargesDeductiblesInput,
  FoyerFiscalInput,
  GainsActionnariatSalarieInput,
  PensionsRetraitesRentesInput,
  PlusValuesGainsDiversInput,
  PrelevementSourceDiversInput,
  ReductionsCreditsImpotInput,
  RevenusCapitauxMobiliersInput,
  RevenusFonciers2042Input,
  RevenusNonSalariesInput,
  RevenusSalairesInput,
} from './types';

export interface Saisie2042 {
  foyer: FoyerFiscalInput;
  anneeRevenus: number;
  salaires?: Partial<RevenusSalairesInput> | null;
  gains?: Partial<GainsActionnariatSalarieInput> | null;
  pensions?: Partial<PensionsRetraitesRentesInput> | null;
  capitauxMobiliers?: Partial<RevenusCapitauxMobiliersInput> | null;
  plusValues?: Partial<PlusValuesGainsDiversInput> | null;
  fonciers?: Partial<RevenusFonciers2042Input> | null;
  nonSalaries?: Partial<RevenusNonSalariesInput> | null;
  charges?: Partial<ChargesDeductiblesInput> | null;
  reductions?: Partial<ReductionsCreditsImpotInput> | null;
  prelevementSource?: Partial<PrelevementSourceDiversInput> | null;
}

type Valeurs = Record<string, unknown>;
const lire = (source: object | null | undefined, cle: string) => {
  const v = (source as Valeurs | null | undefined)?.[cle];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};
const somme = (source: object | null | undefined, cles: string[]) => cles.reduce((t, c) => t + Math.max(0, lire(source, c)), 0);
const coche = (source: object | null | undefined, cle: string) => (source as Valeurs | null | undefined)?.[cle] === true;
const codes = (cles: string[]) => cles.map(c => c.replace(/^case/, '').toUpperCase()).join(', ');

/** Revenus d'activité du cadre 5 (micro et réel, hors versement libératoire et cases de PS seuls). */
const REVENUS_CADRE_5 = [
  'case5ko', 'case5lo', 'case5mo', 'case5kp', 'case5lp', 'case5mp', 'case5no', 'case5oo', 'case5po', 'case5np', 'case5op', 'case5pp',
  'case5ng', 'case5og', 'case5pg', 'case5nh', 'case5oh', 'case5ph', 'case5ni', 'case5oi', 'case5pi', 'case5nj', 'case5oj', 'case5pj',
  'case5nk', 'case5ok', 'case5pk', 'case5nl', 'case5ol', 'case5pl', 'case5hq', 'case5iq', 'case5jq', 'case5ku', 'case5lu', 'case5mu',
  'case5xb', 'case5yb', 'case5zb', 'case5hc', 'case5ic', 'case5jc', 'case5hf', 'case5if', 'case5jf', 'case5kc', 'case5lc', 'case5mc',
  'case5kf', 'case5lf', 'case5mf', 'case5nc', 'case5oc', 'case5pc', 'case5nf', 'case5of', 'case5pf', 'case5na', 'case5oa', 'case5pa',
  'case5nm', 'case5om', 'case5pm', 'case5ny', 'case5oy', 'case5py', 'case5qc', 'case5rc', 'case5sc', 'case5qe', 'case5re', 'case5se',
  'case5jg', 'case5rf', 'case5sf', 'case5jj', 'case5rg', 'case5sg',
];
const REVENUS_AGRICOLES = ['case5xb', 'case5yb', 'case5zb', 'case5hc', 'case5ic', 'case5jc', 'case5hf', 'case5if', 'case5jf'];
const RECETTES_MICRO = ['case5ko', 'case5lo', 'case5mo', 'case5kp', 'case5lp', 'case5mp', 'case5no', 'case5oo', 'case5po',
  'case5np', 'case5op', 'case5pp', 'case5hq', 'case5iq', 'case5jq', 'case5ku', 'case5lu', 'case5mu'];

/**
 * Contrôles de saisie croisant plusieurs cadres de la 2042, sans effet sur le calcul : chaque message
 * correspond à une saisie que le simulateur officiel (calc-2026 et calc-2027) refuse alors qu'Aurevia la
 * calcule. Les contrôles internes à un cadre restent dans leur module (`controlerSaisiePlusValues`,
 * alertes des cadres 4 et 5, incohérence 8TI/8ZR, contrôle de 8TK).
 */
export function controlerSaisie2042(s: Saisie2042): string[] {
  const alertes: string[] = [];
  const { salaires, gains, pensions, capitauxMobiliers, plusValues, fonciers, nonSalaries, charges, reductions, prelevementSource } = s;
  const optionBareme = coche(capitauxMobiliers, 'case2op');

  // Cadre 1
  if (lire(salaires, 'case1sm') > lire(charges, 'case6qs')) alertes.push('1SM : le montant 6QS ne peut être inférieur à 1SM.');
  if (lire(salaires, 'case1dn') > lire(charges, 'case6qt')) alertes.push('1DN : le montant 6QT ne peut être inférieur à 1DN.');
  if (lire(gains, 'case1ny') > lire(gains, 'case1nx')) alertes.push('1NY est compris dans 1NX : 1NX ne peut être inférieur à 1NY.');
  if (lire(gains, 'case1oy') > lire(gains, 'case1ox')) alertes.push('1OY est compris dans 1OX : 1OX ne peut être inférieur à 1OY.');
  if (somme(pensions, ['case1ar', 'case1br', 'case1cr', 'case1dr']) > 0 && lire(prelevementSource, 'case8tk') <= 0) {
    alertes.push('1AR à 1DR (rentes ouvrant droit au crédit égal à l\'impôt français) exigent le montant 8TK.');
  }

  // Cadre 2
  const pertesPrets = ['case2tu', 'case2tv', 'case2tw', 'case2tx'];
  if (lire(capitauxMobiliers, 'case2tt') > 0 && somme(capitauxMobiliers, pertesPrets) > 0) {
    alertes.push(`2TT est incompatible avec ${codes(pertesPrets)} : compensez intérêts et pertes avant saisie.`);
  }

  // Cadre 3 (option barème)
  if (!optionBareme) {
    const abattements = ['case3sg', 'case3sl', 'caseRsg', 'caseRsl'].filter(c => lire(plusValues, c) > 0);
    if (abattements.length > 0) alertes.push(`${codes(abattements)} : abattements pour durée de détention sans option pour le barème (2OP).`);
    const quotient = ['caseRvg', 'caseRua'].filter(c => lire(plusValues, c) > 0);
    if (quotient.length > 0) alertes.push(`${codes(quotient)} : plus-values au quotient sans option pour le barème (2OP).`);
  }

  // Cadre 4
  if (lire(fonciers, 'case4by') > 0 && somme(fonciers, ['case4be', 'case4eb']) > 0) {
    alertes.push('4BY (amortissement Robien ou Borloo) est incompatible avec le micro-foncier (4BE, 4EB).');
  }

  // Cadre 5
  const revenusActivite = somme(nonSalaries, REVENUS_CADRE_5);
  if (somme(nonSalaries, ['case5hy', 'case5iy', 'case5jy']) > 0 && revenusActivite <= 0) {
    alertes.push('5HY, 5IY ou 5JY : revenus à imposer aux prélèvements sociaux sans revenu professionnel correspondant.');
  }

  // Cadre 6
  const plafonds: [string[], string, string][] = [
    [['case6ns', 'case6rs'], 'case6ps', 'déclarant 1'], [['case6nt', 'case6rt'], 'case6pt', 'déclarant 2'],
    [['case6nu', 'case6ru'], 'case6pu', 'personne à charge'],
  ];
  for (const [cotisations, plafond, qui] of plafonds) {
    if (somme(charges, cotisations) > 0 && lire(charges, plafond) <= 0) {
      alertes.push(`${codes(cotisations)} (${qui}) : cotisations d'épargne retraite sans plafond ${codes([plafond])} saisi, aucune déduction.`);
    }
  }

  // Cadre 7
  const versements = lire(reductions, 'case7wn');
  const jugement = lire(reductions, 'case7wo');
  if (versements > jugement) alertes.push('7WN ne peut dépasser le montant total fixé par le jugement (7WO).');
  if (lire(reductions, 'case7wm') > 0 && lire(reductions, 'case7wm') < versements) {
    alertes.push('7WM (capital fixé en substitution de rente) ne peut être inférieur aux versements 7WN.');
  }
  if (lire(reductions, 'case7wp') > 0 && versements + jugement > 0) {
    alertes.push('7WP (report des sommes décidées l\'an dernier) est incompatible avec des versements de l\'année (7WN, 7WO).');
  }
  const enfants = s.foyer.enfantsCharge ?? [];
  const exclusifs = enfants.filter(e => !e.residenceAlternee);
  const alternes = enfants.filter(e => e.residenceAlternee);
  const scolariteExclusive = somme(reductions, ['case7ea', 'case7ec', 'case7ef']);
  const scolariteAlternee = somme(reductions, ['case7eb', 'case7ed', 'case7eg']);
  if (scolariteExclusive > exclusifs.length + Math.max(0, s.foyer.enfantsMajeursRattaches ?? 0)) {
    alertes.push('7EA + 7EC + 7EF : plus d\'enfants scolarisés que d\'enfants à charge.');
  }
  if (scolariteAlternee > alternes.length) alertes.push('7EB + 7ED + 7EG : plus d\'enfants scolarisés que d\'enfants en résidence alternée.');
  const moinsDe6Ans = (e: { anneeNaissance: number }) => e.anneeNaissance >= s.anneeRevenus - 5;
  const gardeExclusive = ['case7ga', 'case7gb', 'case7gc'].filter(c => lire(reductions, c) > 0).length;
  const gardeAlternee = ['case7ge', 'case7gf', 'case7gg'].filter(c => lire(reductions, c) > 0).length;
  if (gardeExclusive > exclusifs.filter(moinsDe6Ans).length) {
    alertes.push('7GA à 7GC : frais de garde déclarés pour plus d\'enfants de moins de 6 ans que le foyer n\'en compte.');
  }
  if (gardeAlternee > alternes.filter(moinsDe6Ans).length) {
    alertes.push('7GE à 7GG : frais de garde déclarés pour plus d\'enfants de moins de 6 ans en résidence alternée que le foyer n\'en compte.');
  }

  // Cadre 8
  if (lire(prelevementSource, 'case8vl') > 0 && lire(prelevementSource, 'case8pl') <= 0) {
    alertes.push('8VL (impôt étranger sur revenus de capitaux mobiliers) exige les revenus correspondants en 8PL.');
  }
  if (somme(prelevementSource, ['case8vm', 'case8wm', 'case8um']) > 0 && lire(prelevementSource, 'case8pm') <= 0) {
    alertes.push('8VM, 8WM ou 8UM (impôt étranger sur autres revenus) exigent les revenus correspondants en 8PM.');
  }
  for (const [rubriques, qui] of [[['case8tv', 'case8th', 'case8tx'], 'déclarant 1'], [['case8qv', 'case8qh', 'case8qx'], 'déclarant 2']] as const) {
    if (rubriques.filter(c => lire(prelevementSource, c) > 0).length > 1) {
      alertes.push(`${codes([...rubriques])} (${qui}) : une seule rubrique de taux possible pour les pensions de source étrangère.`);
    }
  }
  const creditsEntreprise = ['case8tb', 'case8tc', 'case8wk', 'case8tg', 'case8ts', 'case8uz', 'case8wc', 'case8wr', 'case8cv',
    'case8pz', 'case8py', 'case8px'].filter(c => lire(prelevementSource, c) > 0);
  if (creditsEntreprise.length > 0 && revenusActivite <= 0) {
    alertes.push(`${codes(creditsEntreprise)} : crédits ou réductions d'entreprise sans revenu professionnel correspondant (cadre 5).`);
  }
  const creditsAgricoles = ['case8wa', 'case8wh', 'case8wt', 'case8wb'].filter(c => lire(prelevementSource, c) > 0);
  if (creditsAgricoles.length > 0 && somme(nonSalaries, REVENUS_AGRICOLES) <= 0) {
    alertes.push(`${codes(creditsAgricoles)} : crédits agricoles sans bénéfice agricole correspondant (cadre 5).`);
  }
  if (lire(prelevementSource, 'case8uy') > 0 && somme(nonSalaries, RECETTES_MICRO) <= 0) {
    alertes.push('8UY : remboursement de versements libératoires sans recettes micro correspondantes (5KO, 5KP, 5HQ…).');
  }
  const holdings = ['case8ha', 'case8hb', 'case8hc'];
  const holdingsSaisies = holdings.filter(c => lire(prelevementSource, c) > 0).length;
  if (holdingsSaisies > 0 && holdingsSaisies < holdings.length) {
    alertes.push('Taxe sur les holdings : 8HA, 8HB et 8HC doivent être remplies ensemble.');
  }
  return alertes;
}
