/**
 * Cases propres à la déclaration 2027 (revenus 2026), absentes du formulaire 2026 et ayant un effet sur
 * l'impôt. Formulaire du simulateur officiel provisoire calc-2027.cgi (novembre 2026, loi de finances 2027
 * non promulguée) : à revoir à la publication du formulaire définitif.
 *
 * Les saisies étant communes aux millésimes (une ligne par foyer), ces cases ne comptent qu'à partir des
 * revenus 2026 : `masquerCases2027` les neutralise pour les millésimes antérieurs.
 */

/** Premier millésime (année des revenus) où ces cases existent. */
export const ANNEE_REVENUS_CASES_2027 = 2026;

/**
 * Cadre 7 : chaque nouvelle case reprend la règle (nature, taux, plafond, millésime de plafonnement global)
 * de sa jumelle de la cohorte précédente, choisie sur la réponse du simulateur officiel calc-2027 à
 * 1 000 €, 50 000 € et 400 000 € et sur le libellé.
 */
export const JUMELLES_CADRE_7_2027 = {
  // Pinel, Pinel+, Denormandie (calculerInvestissementsPinel.ts)
  case7ln: 'case7lv', case7ly: 'case7lw', case7lz: 'case7lx',
  case7ni: 'case7ne', case7nj: 'case7nf', case7nk: 'case7ng', case7nl: 'case7nh',
  case7ir: 'case7kn', case7is: 'case7ko', case7it: 'case7kp', case7iu: 'case7kq',
  case7ho: 'case7hl', case7hp: 'case7hm', case7rq: 'case7ri', case7rr: 'case7rj',
  case7yh: 'case7xh', case7yi: 'case7xi', case7tp: 'case7ro', case7tq: 'case7rp',
  case7hq: 'case7na', case7hr: 'case7nb', case7pm: 'case7na', case7pn: 'case7nb',
  case7qi: 'case7la', case7qj: 'case7lb', case7re: 'case7nc', case7rg: 'case7nd',
  case7rs: 'case7na', case7rz: 'case7nb', case7wa: 'case7na', case7wb: 'case7nb',
  case7wc: 'case7wy', case7wd: 'case7wz',
  // Censi-Bouvard (calculerInvestissementsCensiBouvard.ts)
  case7sq: 'case7st', case7ot: 'case7hx',
  // Scellier (calculerInvestissementsScellier.ts)
  case7av: 'case7qa', case7aw: 'case7qe', case7ax: 'case7qg', case7ay: 'case7qq',
  case7cf: 'case7qz', case7cg: 'case7ra', case7ch: 'case7rc', case7cj: 'case7el',
  case7ck: 'case7qe', case7cl: 'case7tc', case7cm: 'case7td', case7dd: 'case7ua',
  case7de: 'case7ub', case7df: 'case7fd', case7gh: 'case7fb', case7gi: 'case7fe',
  case7gj: 'case7fi', case7gk: 'case7fk', case7gs: 'case7el', case7gt: 'case7ew',
  case7gu: 'case7qb', case7gv: 'case7er',
  case7be: 'case7mo', case7bf: 'case7mp', case7bg: 'case7mq', case7bh: 'case7mr',
  case7ms: 'case7mo', case7mt: 'case7mp', case7mu: 'case7mq', case7mv: 'case7mr',
  case7op: 'case7me', case7oq: 'case7mp', case7or: 'case7mq', case7os: 'case7mr',
  case7tg: 'case7mo', case7tl: 'case7mp', case7tn: 'case7mq', case7to: 'case7mr',
  case7we: 'case7ox', case7wf: 'case7ha', case7wg: 'case7hy', case7wu: 'case7hk',
  case7wv: 'case7xc', case7ww: 'case7xn', case7yj: 'case7ya', case7yk: 'case7yc',
  case7yl: 'case7hk', case7yx: 'case7yc', case7yy: 'case7yo', case7yz: 'case7yc',
  case7za: 'case7xc', case7zb: 'case7ha', case7zc: 'case7hk', case7zd: 'case7xc',
  case7ze: 'case7xn', case7zf: 'case7yc', case7zg: 'case7hk',
  // Outre-mer (calculerInvestissementsOutreMer.ts)
  caseHms: 'caseHls', caseHmt: 'caseHlt', caseHmu: 'caseHlu', caseHmv: 'caseHlv', caseHmw: 'caseHlw',
  caseHvp: 'caseHvo', caseHyk: 'caseHyj',
} as const;

/** Cadre 7 hors tables de jumelles : Loc'Avantages, Malraux, forêt, souscriptions (taux propres). */
const CADRE_7_AUTRES = ['case7ak', 'case7al', 'case7am', 'case7an', 'case7ao', 'case7kz', 'case7vn', 'case7tm',
  'case7cn', 'case7cx', 'case7dn', 'case7cz'] as const;

/** Toutes les cases 2027 avec effet, par groupe de saisie (services, formulaires, masquage). */
export const CASES_2027 = {
  gains: ['case1pp', 'case1pq'],
  plusValues: ['case3yn'],
  nonSalaries: ['case5km', 'case5lm', 'case5mm'],
  reductions: [...Object.keys(JUMELLES_CADRE_7_2027), ...CADRE_7_AUTRES],
  prelevementSource: ['case8ha', 'case8hb', 'case8hc', 'case8hu', 'case8iu', 'case8wb', 'case8px'],
} as const;

/** Neutralise les cases 2027 pour un millésime antérieur aux revenus 2026. */
export function masquerCases2027<T extends object>(
  input: T | null | undefined,
  groupe: keyof typeof CASES_2027,
  anneeRevenus: number,
): T | null | undefined {
  if (!input || anneeRevenus >= ANNEE_REVENUS_CASES_2027) return input;
  const copie = { ...input } as Record<string, unknown>;
  for (const cle of CASES_2027[groupe]) if (cle in copie) copie[cle] = null;
  return copie as T;
}

/** Copie dans une table de règles la règle de la jumelle de chaque nouvelle case du cadre 7. */
export function ajouterJumelles2027<R extends object>(regles: Partial<Record<string, R>>, libelle: (r: R, cle: string) => R): void {
  for (const [nouvelle, jumelle] of Object.entries(JUMELLES_CADRE_7_2027)) {
    const regle = regles[jumelle];
    if (regle && !regles[nouvelle]) regles[nouvelle] = libelle(regle, nouvelle);
  }
}
