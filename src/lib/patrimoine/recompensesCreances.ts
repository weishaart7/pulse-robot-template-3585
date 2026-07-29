/**
 * Moteur de calcul des récompenses (art. 1468-1478 C. civ.) et des créances
 * entre époux (art. 1479, 1543 C. civ.) — chantier 3A.
 *
 * Profit subsistant (art. 1469 al. 3) : ATTENTION, la formule ci-dessous
 * (computeProfitSubsistant) est une SIMPLIFICATION DOCUMENTÉE, pas une
 * formule légale universelle unique. Le Code civil ne fige qu'un principe
 * (« profit subsistant » = ce qui reste de la plus-value procurée par la
 * dépense au jour de la liquidation) ; en pratique notariale, l'imputation
 * de la cause d'une plus-value se fait au cas par cas dès qu'il y a
 * plusieurs causes possibles (marché, travaux, mix des deux, etc.), ce
 * qu'aucune formule fermée ne peut trancher automatiquement. Ce moteur
 * retient DEUX formules choisies pour coller aux deux exemples de
 * référence du chantier — un cas réel avec causes multiples de plus-value
 * demanderait une analyse notariale au cas par cas, pas ce calcul :
 * - 'acquisition' (financement partiel d'un achat) : le profit subsistant
 *   est la valeur actuelle du bien au prorata de la part financée —
 *   valeurApres × (depenseFaite / valeurAvant). Cas récompense de
 *   référence : 100 000 financés sur 200 000, bien à 500 000 à la
 *   liquidation → 500 000 × (100 000/200 000) = 250 000.
 * - 'conservation' / 'amelioration' (travaux sur un bien déjà détenu) : le
 *   profit subsistant est la plus-value effectivement procurée par les
 *   travaux — valeurApres - valeurAvant (on suppose que l'intégralité de
 *   la plus-value constatée résulte de la dépense, hypothèse simplificatrice
 *   en l'absence d'expertise de la valeur avant travaux hors dépense). Cas
 *   créance de référence : travaux de 40 000, bien de 200 000 → 260 000
 *   → profit subsistant = 60 000 (et non un prorata, qui donnerait 52 000 —
 *   ce point a été vérifié avec Titouan comme la lecture correcte du
 *   référentiel fourni, mais reste une lecture parmi d'autres possibles).
 * - 'autre' : profit subsistant non calculable, la valeur nominale
 *   (dépense faite) s'applique.
 *
 * NON BRANCHÉ dans dmtg/index.ts (computeDMTG lui-même n'est jamais appelé
 * directement par l'UI, cf. transmission/index.ts) — l'intégration se fait
 * via une ligne d'actif synthétique dans transmission/index.ts (mécanisme A
 * retenu comme seul mécanisme de liquidation vivant).
 */

// 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
export type EpouxConcerne = 'user' | 'spouse';
export type NatureDepense = 'acquisition' | 'conservation' | 'amelioration' | 'autre';

export interface RecompenseCalcInput {
  sens: 'communaute_vers_epoux' | 'epoux_vers_communaute';
  epoux: EpouxConcerne;
  depenseFaite: number;
  valeurBienAcquisition?: number | null;
  valeurBienLiquidation?: number | null;
  natureDepense: NatureDepense;
  /** Dépense nécessaire (art. 1469 al. 2), indépendant du caractère qualifiant (al. 3) — les deux planchers se cumulent. Défaut applicatif `false` si non renseigné. */
  depenseNecessaire?: boolean;
  modeEvaluationConventionnel?: 'nominal' | 'profit_subsistant' | 'plafonne' | null;
}

export interface CreanceCalcInput {
  epouxCreancier: EpouxConcerne;
  epouxDebiteur: EpouxConcerne;
  depenseFaite: number;
  valeurBienAvant?: number | null;
  valeurBienApres?: number | null;
  natureDepense: NatureDepense;
  modeEvaluationConventionnel?: 'nominal' | 'profit_subsistant' | null;
}

const NATURES_QUALIFIANTES: NatureDepense[] = ['acquisition', 'conservation', 'amelioration'];

/**
 * Profit subsistant (art. 1469 al. 3), ou null si non calculable (nature
 * 'autre', ou valeurs avant/après absentes ou valeur avant nulle).
 */
export function computeProfitSubsistant(
  depenseFaite: number,
  valeurAvant: number | null | undefined,
  valeurApres: number | null | undefined,
  natureDepense: NatureDepense
): number | null {
  if (valeurAvant == null || valeurApres == null || valeurAvant === 0) return null;

  if (natureDepense === 'acquisition') {
    return valeurApres * (depenseFaite / valeurAvant);
  }
  if (natureDepense === 'conservation' || natureDepense === 'amelioration') {
    return valeurApres - valeurAvant;
  }
  return null;
}

/**
 * Montant d'une récompense individuelle (art. 1469), 4 cas légaux distincts
 * selon deux conditions indépendantes :
 * - "nécessaire" (al. 2, `depenseNecessaire`) : plancher = dépense faite.
 * - "qualifiante" (al. 3, nature_depense ∈ acquisition/conservation/amelioration) :
 *   plancher = profit subsistant.
 * Les deux planchers se cumulent si les deux conditions sont réunies. La base
 * (al. 1, avant tout plancher) est toujours min(dépense faite, profit
 * subsistant) — c'est aussi le résultat du cas où aucune des deux conditions
 * n'est réunie.
 *
 * Mode 'plafonne' : clause contraire du contrat de mariage écartant les deux
 * planchers légaux (art. 1469 n'étant pas d'ordre public) — reste prioritaire
 * sur les 4 branches, comportement inchangé par ce chantier.
 */
export function computeMontantRecompense(input: RecompenseCalcInput): number {
  const mode = input.modeEvaluationConventionnel || 'profit_subsistant';
  if (mode === 'nominal') return input.depenseFaite;

  const profitSubsistant = computeProfitSubsistant(
    input.depenseFaite,
    input.valeurBienAcquisition,
    input.valeurBienLiquidation,
    input.natureDepense
  );
  if (profitSubsistant == null) return input.depenseFaite;

  // al. 1 : base = la plus faible des deux sommes.
  const base = Math.min(input.depenseFaite, profitSubsistant);

  // Clause 'plafonne' : convention contraire écartant les deux planchers légaux.
  if (mode === 'plafonne') return base;

  const necessaire = input.depenseNecessaire ?? false;
  const qualifiante = NATURES_QUALIFIANTES.includes(input.natureDepense);

  if (necessaire && qualifiante) {
    // al. 2 + al. 3 cumulés : la plus forte des deux sommes.
    return Math.max(input.depenseFaite, profitSubsistant);
  }
  if (necessaire) {
    // al. 2 seul : plancher = dépense faite. Toujours ≥ la base (min(...)),
    // donc ce plancher l'emporte systématiquement → montant = dépense faite.
    return input.depenseFaite;
  }
  if (qualifiante) {
    // al. 3 seul : plancher = profit subsistant. Toujours ≥ la base (min(...)),
    // donc ce plancher l'emporte systématiquement → montant = profit subsistant.
    return profitSubsistant;
  }

  // Ni nécessaire ni qualifiante : pas de plancher, la base s'applique telle quelle.
  return base;
}

/**
 * Montant d'une créance entre époux (art. 1479 al. 2) : profit subsistant
 * seul (pas la règle en 3 temps complète), sauf convention contraire au
 * nominal.
 */
export function computeMontantCreance(input: CreanceCalcInput): number {
  const mode = input.modeEvaluationConventionnel || 'profit_subsistant';
  if (mode === 'nominal') return input.depenseFaite;

  const profitSubsistant = computeProfitSubsistant(
    input.depenseFaite,
    input.valeurBienAvant,
    input.valeurBienApres,
    input.natureDepense
  );
  return profitSubsistant ?? input.depenseFaite;
}

export interface SoldeRecompenses {
  parEpoux: Record<EpouxConcerne, { doitALaCommunaute: number; communauteDoitA: number; soldeNet: number }>;
  /**
   * Impact net sur le boni commun partageable (art. 1470-1474) : positif si
   * les époux sont in fine débiteurs nets de la communauté (accroît la masse
   * commune disponible au partage), négatif si la communauté est débitrice
   * nette (la réduit).
   */
  ajustementBoniCommun: number;
}

/**
 * Compensation entre récompenses réciproques de chaque époux
 * (art. 1470-1474), puis somme des soldes nets pour l'impact sur le boni
 * commun.
 */
export function computeSoldeRecompenses(recompenses: RecompenseCalcInput[]): SoldeRecompenses {
  const parEpoux: SoldeRecompenses['parEpoux'] = {
    user: { doitALaCommunaute: 0, communauteDoitA: 0, soldeNet: 0 },
    spouse: { doitALaCommunaute: 0, communauteDoitA: 0, soldeNet: 0 },
  };

  for (const r of recompenses) {
    const montant = computeMontantRecompense(r);
    if (r.sens === 'epoux_vers_communaute') {
      parEpoux[r.epoux].doitALaCommunaute += montant;
    } else {
      parEpoux[r.epoux].communauteDoitA += montant;
    }
  }

  (['user', 'spouse'] as const).forEach((e) => {
    parEpoux[e].soldeNet = parEpoux[e].doitALaCommunaute - parEpoux[e].communauteDoitA;
  });

  const ajustementBoniCommun = parEpoux.user.soldeNet + parEpoux.spouse.soldeNet;

  return { parEpoux, ajustementBoniCommun };
}

/**
 * Solde des créances entre époux par patrimoine propre : positif si
 * l'époux est créancier net (son patrimoine propre est augmenté d'autant à
 * la liquidation), négatif s'il est débiteur net. Indépendant du boni
 * commun — ajustement direct entre les 2 patrimoines propres, applicable
 * dans tous les régimes.
 */
export function computeSoldeCreancesEntreEpoux(
  creances: CreanceCalcInput[]
): Record<EpouxConcerne, number> {
  const solde: Record<EpouxConcerne, number> = { user: 0, spouse: 0 };

  for (const c of creances) {
    const montant = computeMontantCreance(c);
    solde[c.epouxCreancier] += montant;
    solde[c.epouxDebiteur] -= montant;
  }

  return solde;
}

/**
 * Régime avec une masse commune (récompenses uniquement pertinentes dans ce
 * cas — art. 1468 s. suppose la coexistence d'une masse commune et de
 * masses propres) : régimes communautaires, ou séparation de biens avec
 * société d'acquêts (sur sa seule masse commune). Réplique volontairement
 * en local la même logique de détection que src/lib/patrimoine/qualification.ts
 * (isCommunauteUniverselle, isSeparationSocieteAcquets, etc., non exportées
 * de ce module) plutôt que de les exporter/modifier ce fichier — hors
 * périmètre de ce chantier (cf. décision de ne pas toucher qualification.ts).
 */
export function regimeHasMasseCommune(regimeMatrimonial: string | null | undefined): boolean {
  if (!regimeMatrimonial) return false;
  const r = regimeMatrimonial.toLowerCase();
  const estCommunautaire = r.includes('communaut');
  const estSeparationSocieteAcquets =
    (r.includes('séparation') || r.includes('separation')) && r.includes('société') && r.includes('acquêts');
  return estCommunautaire || estSeparationSocieteAcquets;
}
