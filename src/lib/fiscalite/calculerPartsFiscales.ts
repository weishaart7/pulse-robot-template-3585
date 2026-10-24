import { FoyerFiscalInput, MajorationDetail, MajorationNonRetenue, PartsFiscalesResult } from './types';

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

const PLAFOND_DEMI_PART_STANDARD = 1807;
const PLAFOND_QUART_PART_ALTERNEE = 904;
const PLAFOND_COMPLEMENTAIRE_STANDARD = 1801;
// Plafond global des deux premières demi-parts au-delà de 1 part (enfant n°1 + case T), dont la
// demi-part de l'enfant n°1 consomme déjà PLAFOND_DEMI_PART_STANDARD : reste pour la case T.
const PLAFOND_PARENT_ISOLE = 4262 - PLAFOND_DEMI_PART_STANDARD;
const PLAFOND_ANCIEN_PARENT_ISOLE = 1079;

function rangLabel(rang: number): string {
  return rang === 1 ? '1er' : `${rang}e`;
}

/**
 * Enfant "virtuel" représentant soit un enfant à charge saisi individuellement,
 * soit l'un des enfants majeurs rattachés (compteur, jamais en résidence
 * alternée ni invalide).
 */
interface EnfantRang {
  invalide: boolean;
  residenceAlternee: boolean;
  estMajeurRattache: boolean;
}

/**
 * Rang occupé par chaque enfant, en tenant compte des personnes invalides recueillies : la brochure
 * décompte les enfants en résidence alternée après elles (elles gardent leur part propre, hors
 * progression). Le rang des enfants à charge exclusive et des majeurs rattachés n'en dépend pas.
 */
function rangsEnfants(enfants: EnfantRang[], nombrePersonnesInvalides: number): number[] {
  return enfants.map((e, index) => (e.residenceAlternee ? index + 1 + nombrePersonnesInvalides : index + 1));
}

/**
 * Ordre de décompte (brochure IR 2026) : enfants à charge exclusive ou principale, puis enfants
 * majeurs rattachés, puis enfants en résidence alternée — le rang (0,5 part jusqu'au 2e, 1 part
 * ensuite) suit cet ordre, pas celui de la saisie.
 */
function construireEnfantsRang(input: FoyerFiscalInput): EnfantRang[] {
  const versRang = (e: FoyerFiscalInput['enfantsCharge'][number]): EnfantRang => ({
    invalide: e.invalide,
    residenceAlternee: e.residenceAlternee,
    estMajeurRattache: false,
  });
  const exclusifs = input.enfantsCharge.filter(e => !e.residenceAlternee).map(versRang);
  const alternes = input.enfantsCharge.filter(e => e.residenceAlternee).map(versRang);
  const majeursRattaches: EnfantRang[] = Array.from({ length: input.enfantsMajeursRattaches }, () => ({
    invalide: false,
    residenceAlternee: false,
    estMajeurRattache: true,
  }));
  return [...exclusifs, ...majeursRattaches, ...alternes];
}

/** 1 807 € par demi-part (un quart de part : 904 €, soit 1 807 € / 2 arrondi). */
function plafondPourParts(parts: number): number {
  return parts === 0.25 ? PLAFOND_QUART_PART_ALTERNEE : (parts / 0.5) * PLAFOND_DEMI_PART_STANDARD;
}

function majorationsEnfants(enfants: EnfantRang[], nombrePersonnesInvalides: number): MajorationDetail[] {
  const majorations: MajorationDetail[] = [];
  const rangs = rangsEnfants(enfants, nombrePersonnesInvalides);

  enfants.forEach((enfant, index) => {
    const rang = rangs[index];
    const tauxPlein = rang <= 2 ? 0.5 : 1;
    const parts = enfant.residenceAlternee ? tauxPlein / 2 : tauxPlein;
    const suffixe = enfant.residenceAlternee ? ' (résidence alternée)' : '';
    const nature = enfant.estMajeurRattache ? 'enfant majeur rattaché' : 'enfant à charge';

    majorations.push({
      type: `enfant_rang_${rang}`,
      libelle: `${rangLabel(rang)} ${nature}${suffixe}`,
      parts,
      plafondUnitaire: plafondPourParts(parts),
    });

    if (enfant.invalide) {
      const partsInvalidite = enfant.residenceAlternee ? 0.25 : 0.5;
      majorations.push({
        type: `enfant_rang_${rang}_invalidite`,
        libelle: `Majoration invalidité — ${rangLabel(rang)} ${nature}${suffixe}`,
        parts: partsInvalidite,
        plafondUnitaire: enfant.residenceAlternee ? PLAFOND_DEMI_PART_STANDARD / 2 : PLAFOND_DEMI_PART_STANDARD,
        plafondComplementaire: enfant.residenceAlternee ? PLAFOND_COMPLEMENTAIRE_STANDARD / 2 : PLAFOND_COMPLEMENTAIRE_STANDARD,
      });
    }
  });

  return majorations;
}

const MOTIF_NON_CUMUL_SEUL = 'une seule demi-part parmi les cases P, L, W et G pour une personne seule';

function majorationPersonnelle(type: string, libelle: string, plafondComplementaire = true): MajorationDetail {
  return {
    type,
    libelle,
    parts: 0.5,
    plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
    ...(plafondComplementaire ? { plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD } : {}),
  };
}

/**
 * Demi-parts liées à la situation personnelle des déclarants (cases P, F, L, W, S, G), avec les
 * règles de non-cumul de la brochure IR 2026 (p. 77-79) :
 * - couple : P et F se cumulent ; S (ancien combattant +74 ans, l'un ou les deux) vaut une seule
 *   demi-part pour le couple et ne se cumule pas avec P ou F ;
 * - personne seule : une seule demi-part parmi P, L, W, G, la plus avantageuse retenue (P, W, G
 *   plafonnées 1 807 € + 1 801 €, puis L à 1 079 €) ; W et G exclues avec un enfant à charge ou
 *   rattaché ; L exclue avec toute personne à charge. Les cases du conjoint sont ignorées.
 * Les cases cochées écartées sont restituées dans `nonRetenues` avec leur motif.
 */
function demiPartsPersonnelles(
  input: FoyerFiscalInput,
  estCouple: boolean,
  nombreEnfants: number,
): { retenues: MajorationDetail[]; nonRetenues: MajorationNonRetenue[] } {
  const retenues: MajorationDetail[] = [];
  const nonRetenues: MajorationNonRetenue[] = [];
  const ecarter = (type: string, libelle: string, motif: string) => nonRetenues.push({ type, libelle, motif });

  if (estCouple) {
    if (input.invaliditeDeclarant1) retenues.push(majorationPersonnelle('invalidite_declarant1', 'Invalidité — déclarant 1 (case P)'));
    if (input.invaliditeDeclarant2) retenues.push(majorationPersonnelle('invalidite_declarant2', 'Invalidité — déclarant 2 (case F)'));
    if (input.ancienCombattantDeclarant1 || input.ancienCombattantDeclarant2) {
      if (input.invaliditeDeclarant1 || input.invaliditeDeclarant2) {
        ecarter('ancien_combattant_couple', 'Ancien combattant +74 ans (case S)', 'ne se cumule pas avec les cases P ou F');
      } else {
        retenues.push(majorationPersonnelle('ancien_combattant_couple', 'Ancien combattant +74 ans (case S)'));
      }
    }
    for (const [coche, type, libelle] of [
      [input.ancienParentIsole, 'ancien_parent_isole', 'Ancien parent isolé (case L)'],
      [input.veufAncienCombattant, 'veuf_ancien_combattant', "Veuf/veuve d'ancien combattant (case W)"],
      [input.veuveDeGuerre, 'veuve_de_guerre', 'Veuve de guerre (case G)'],
    ] as const) {
      if (coche) ecarter(type, libelle, 'réservée aux personnes seules');
    }
    return { retenues, nonRetenues };
  }

  const aPersonneACharge = nombreEnfants > 0 || input.personnesInvalidesCharge.length > 0;
  // Ordre de préférence : demi-parts plafonnées 1 807 € + 1 801 € d'abord, puis L (1 079 €).
  const candidates: { coche: boolean; majoration: MajorationDetail; exclusion?: string }[] = [
    {
      coche: input.invaliditeDeclarant1,
      majoration: majorationPersonnelle('invalidite_declarant1', 'Invalidité (case P)'),
    },
    {
      coche: input.ancienCombattantDeclarant1,
      majoration: majorationPersonnelle('ancien_combattant_declarant1', 'Ancien combattant +74 ans (case W)'),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.veufAncienCombattant,
      majoration: majorationPersonnelle('veuf_ancien_combattant', "Veuf/veuve d'ancien combattant +74 ans (case W)"),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.veuveDeGuerre,
      majoration: majorationPersonnelle('veuve_de_guerre', 'Veuve de guerre (case G)'),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.ancienParentIsole,
      majoration: {
        type: 'ancien_parent_isole',
        libelle: 'Ancien parent isolé, 5 ans seul (case L)',
        parts: 0.5,
        plafondUnitaire: PLAFOND_ANCIEN_PARENT_ISOLE,
      },
      exclusion: aPersonneACharge ? 'suppose de vivre seul sans personne à charge' : undefined,
    },
  ];

  for (const { coche, majoration, exclusion } of candidates) {
    if (!coche) continue;
    if (exclusion) ecarter(majoration.type, majoration.libelle, exclusion);
    else if (retenues.length > 0) ecarter(majoration.type, majoration.libelle, MOTIF_NON_CUMUL_SEUL);
    else retenues.push(majoration);
  }
  if (input.invaliditeDeclarant2) ecarter('invalidite_declarant2', 'Invalidité — conjoint (case F)', 'réservée aux couples mariés ou pacsés');
  if (input.ancienCombattantDeclarant2) ecarter('ancien_combattant_declarant2', 'Ancien combattant — conjoint (case S)', 'réservée aux couples mariés ou pacsés');
  return { retenues, nonRetenues };
}

/**
 * Quotient familial standard (art. 193 à 197 CGI, revenus 2025 / impôt 2026).
 *
 * Fonction pure : ne renvoie que le nombre de parts et le détail des
 * majorations appliquées. Les plafonds en euros portés par chaque majoration
 * (`plafondUnitaire`/`plafondComplementaire`) sont de simples métadonnées,
 * jamais appliquées ici — le plafonnement réel de l'avantage fiscal (art. 197
 * CGI) est calculé en aval par `calculerImpot.ts`, qui consomme ces
 * métadonnées.
 *
 * **Personne invalide à charge (art. 196 A bis CGI)** : bien que la brochure
 * DGFiP décrive « une part » par personne invalide recueillie, le plafonnement
 * la traite comme 2 demi-parts distinctes (p.85 : « la réduction d'impôt en
 * résultant est limitée à 1 807 € par demi-part [...] une réduction d'impôt
 * complémentaire d'un montant maximal de 1 801 € est appliquée » pour la
 * demi-part liée à l'invalidité elle-même) — modélisé en 2 lignes de
 * `majorations[]` (0,5 part chacune), même mécanique que la majoration
 * invalidité d'un enfant à charge ci-dessus. **Cas non modélisé** : lorsque le
 * foyer ne compte à charge qu'une seule personne invalide ET coche la case T
 * (parent isolé), le plafond spécifique de 4 262 € normalement associé à la
 * case T ne s'applique pas à ces 2 demi-parts (interaction entre deux
 * majorations que la somme indépendante des plafonds par ligne ne peut pas
 * représenter) — laissé en dette plutôt que deviné (voir docs/fiscalite.md).
 */
export function calculerPartsFiscales(input: FoyerFiscalInput): PartsFiscalesResult {
  const enfantsRang = construireEnfantsRang(input);
  const nombreEnfants = enfantsRang.length;

  // Veuf avec enfant à charge ou rattaché : autant de parts qu'un couple, mais le plafonnement se
  // mesure par rapport à 1 part — la part de veuvage est une majoration plafonnée (2 demi-parts).
  const veufAvecEnfants = input.situationFamille === 'veuf' && nombreEnfants > 0;
  const estCouple = COUPLE_IMPOSITION_COMMUNE.includes(input.situationFamille);
  const partsBase = estCouple ? 2 : 1;

  const majorations: MajorationDetail[] = [];
  if (veufAvecEnfants) {
    majorations.push({
      type: 'veuf_quotient_conjugal',
      libelle: 'Maintien du quotient conjugal (veuf avec personne à charge)',
      parts: 1,
      plafondUnitaire: plafondPourParts(1),
    });
  }
  majorations.push(...majorationsEnfants(enfantsRang, input.personnesInvalidesCharge.length));

  input.personnesInvalidesCharge.forEach((_, index) => {
    const rang = index + 1;
    // CGI art. 196 A bis : la part entière se décompose en 2 demi-parts pour le plafonnement (brochure
    // DGFiP p.85) — une demi-part "à charge" (plafond 1807€) et une demi-part "invalidité" (1807€ + 1801€
    // de complément), même mécanique que la majoration invalidité d'un enfant à charge (voir ci-dessus).
    majorations.push({
      type: `personne_invalide_charge_${rang}`,
      libelle: `Personne invalide à charge (${rangLabel(rang)})`,
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
    });
    majorations.push({
      type: `personne_invalide_charge_${rang}_invalidite`,
      libelle: `Majoration invalidité — personne invalide à charge (${rangLabel(rang)})`,
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  });

  if (input.parentIsole && nombreEnfants > 0) {
    majorations.push({
      type: 'parent_isole',
      libelle: 'Parent isolé (case T)',
      parts: 0.5,
      plafondUnitaire: PLAFOND_PARENT_ISOLE,
    });
  }

  const { retenues, nonRetenues } = demiPartsPersonnelles(input, estCouple, nombreEnfants);
  majorations.push(...retenues);

  const nombreParts = partsBase + majorations.reduce((total, m) => total + m.parts, 0);

  return {
    partsBase,
    majorations,
    majorationsNonRetenues: nonRetenues,
    nombreParts,
  };
}
