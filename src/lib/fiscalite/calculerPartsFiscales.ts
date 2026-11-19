import { FoyerFiscalInput, MajorationDetail, MajorationNonRetenue, PartsFiscalesResult } from './types';
import { PARAMETRES_PAR_DEFAUT, type ParametresFiscaux } from './parametres';

type PlafondsQuotientFamilial = ParametresFiscaux['quotientFamilial'];

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];


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

/** 1 807 € par demi-part, au prorata (un quart de part : 903,5 €, non arrondi — simulateur officiel : 2 quarts = 1 807 €). */
function plafondPourParts(parts: number, qf: PlafondsQuotientFamilial): number {
  return (parts / 0.5) * qf.plafondDemiPart;
}

function majorationsEnfants(
  enfants: EnfantRang[],
  nombrePersonnesInvalides: number,
  qf: PlafondsQuotientFamilial,
): MajorationDetail[] {
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
      plafondUnitaire: plafondPourParts(parts, qf),
    });

    if (enfant.invalide) {
      const partsInvalidite = enfant.residenceAlternee ? 0.25 : 0.5;
      majorations.push({
        type: `enfant_rang_${rang}_invalidite`,
        libelle: `Majoration invalidité — ${rangLabel(rang)} ${nature}${suffixe}`,
        parts: partsInvalidite,
        plafondUnitaire: enfant.residenceAlternee ? qf.plafondDemiPart / 2 : qf.plafondDemiPart,
        plafondComplementaire: enfant.residenceAlternee ? qf.plafondComplementaire / 2 : qf.plafondComplementaire,
      });
    }
  });

  return majorations;
}

const MOTIF_NON_CUMUL_SEUL = 'une seule demi-part parmi les cases P, L, W et G pour une personne seule';

function majorationPersonnelle(
  type: string,
  libelle: string,
  qf: PlafondsQuotientFamilial,
  plafondComplementaire = true,
): MajorationDetail {
  return {
    type,
    libelle,
    parts: 0.5,
    plafondUnitaire: qf.plafondDemiPart,
    ...(plafondComplementaire ? { plafondComplementaire: qf.plafondComplementaire } : {}),
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
  qf: PlafondsQuotientFamilial,
): { retenues: MajorationDetail[]; nonRetenues: MajorationNonRetenue[] } {
  const retenues: MajorationDetail[] = [];
  const nonRetenues: MajorationNonRetenue[] = [];
  const ecarter = (type: string, libelle: string, motif: string) => nonRetenues.push({ type, libelle, motif });

  if (estCouple) {
    if (input.invaliditeDeclarant1) retenues.push(majorationPersonnelle('invalidite_declarant1', 'Invalidité — déclarant 1 (case P)', qf));
    if (input.invaliditeDeclarant2) retenues.push(majorationPersonnelle('invalidite_declarant2', 'Invalidité — déclarant 2 (case F)', qf));
    if (input.ancienCombattantDeclarant1 || input.ancienCombattantDeclarant2) {
      if (input.invaliditeDeclarant1 || input.invaliditeDeclarant2) {
        ecarter('ancien_combattant_couple', 'Ancien combattant +74 ans (case S)', 'ne se cumule pas avec les cases P ou F');
      } else {
        retenues.push(majorationPersonnelle('ancien_combattant_couple', 'Ancien combattant +74 ans (case S)', qf));
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
      majoration: majorationPersonnelle('invalidite_declarant1', 'Invalidité (case P)', qf),
    },
    {
      coche: input.ancienCombattantDeclarant1,
      majoration: majorationPersonnelle('ancien_combattant_declarant1', 'Ancien combattant +74 ans (case W)', qf),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.veufAncienCombattant,
      majoration: majorationPersonnelle('veuf_ancien_combattant', "Veuf/veuve d'ancien combattant +74 ans (case W)", qf),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.veuveDeGuerre,
      majoration: majorationPersonnelle('veuve_de_guerre', 'Veuve de guerre (case G)', qf),
      exclusion: nombreEnfants > 0 ? 'exclue avec un enfant à charge ou rattaché' : undefined,
    },
    {
      coche: input.ancienParentIsole,
      majoration: {
        type: 'ancien_parent_isole',
        libelle: 'Ancien parent isolé, 5 ans seul (case L)',
        parts: 0.5,
        plafondUnitaire: qf.plafondAncienParentIsole,
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
 * invalidité d'un enfant à charge ci-dessus. Case T avec une seule personne
 * invalide à charge : demi-part plafonnée à 1 807 €, sans le plafond de 4 262 €
 * propre au premier enfant (simulateur officiel 2026).
 */
export function calculerPartsFiscales(
  input: FoyerFiscalInput,
  parametres: ParametresFiscaux = PARAMETRES_PAR_DEFAUT,
): PartsFiscalesResult {
  const qf = parametres.quotientFamilial;
  const enfantsRang = construireEnfantsRang(input);
  const nombreEnfants = enfantsRang.length;

  // Veuf avec enfant ou personne invalide à charge : autant de parts qu'un couple, mais le plafonnement
  // se mesure par rapport à 1 part — la part de veuvage est une majoration plafonnée (2 demi-parts),
  // avec une réduction complémentaire de 2 011 € (simulateur officiel 2026, entière même en résidence alternée).
  const veufAvecEnfants = input.situationFamille === 'veuf'
    && (nombreEnfants > 0 || input.personnesInvalidesCharge.length > 0);
  const estCouple = COUPLE_IMPOSITION_COMMUNE.includes(input.situationFamille);
  const partsBase = estCouple ? 2 : 1;

  const majorations: MajorationDetail[] = [];
  if (veufAvecEnfants) {
    majorations.push({
      type: 'veuf_quotient_conjugal',
      libelle: 'Maintien du quotient conjugal (veuf avec personne à charge)',
      parts: 1,
      plafondUnitaire: plafondPourParts(1, qf),
      plafondComplementaire: qf.plafondComplementaireVeuf,
    });
  }
  majorations.push(...majorationsEnfants(enfantsRang, input.personnesInvalidesCharge.length, qf));

  // Les personnes invalides prennent rang après les enfants à charge exclusive et les majeurs rattachés,
  // avant les enfants en résidence alternée : demi-part « à charge » aux deux premiers rangs, part entière
  // ensuite (simulateur officiel 2027 : 2 enfants + 1 personne invalide → 1 + 0,5 + 0,5 + 1 + 0,5 = 3,5 parts).
  const rangsAvantInvalides = enfantsRang.filter(e => !e.residenceAlternee).length;
  input.personnesInvalidesCharge.forEach((_, index) => {
    const rang = rangsAvantInvalides + index + 1;
    const partsACharge = rang <= 2 ? 0.5 : 1;
    // CGI art. 196 A bis : la part entière se décompose en 2 demi-parts pour le plafonnement (brochure
    // DGFiP p.85) — une demi-part "à charge" (plafond 1807€) et une demi-part "invalidité" (1807€ + 1801€
    // de complément), même mécanique que la majoration invalidité d'un enfant à charge (voir ci-dessus).
    majorations.push({
      type: `personne_invalide_charge_${rang}`,
      libelle: `Personne invalide à charge (${rangLabel(rang)})`,
      parts: partsACharge,
      plafondUnitaire: plafondPourParts(partsACharge, qf),
    });
    majorations.push({
      type: `personne_invalide_charge_${rang}_invalidite`,
      libelle: `Majoration invalidité — personne invalide à charge (${rangLabel(rang)})`,
      parts: 0.5,
      plafondUnitaire: qf.plafondDemiPart,
      plafondComplementaire: qf.plafondComplementaire,
    });
  });

  if (input.parentIsole && (nombreEnfants > 0 || input.personnesInvalidesCharge.length > 0)) {
    // Un seul enfant, en résidence alternée, sans autre personne à charge : la case T vaut 0,25 part et les
    // plafonds sont réduits de moitié (simulateur officiel 2026 : 1,5 part, avantage plafonné à 4 262 € / 2).
    const seulEnfantAlterne = nombreEnfants === 1 && enfantsRang[0].residenceAlternee
      && input.personnesInvalidesCharge.length === 0;
    const plafondT = nombreEnfants > 0 ? qf.plafondParentIsole - qf.plafondDemiPart : qf.plafondDemiPart;
    majorations.push({
      type: 'parent_isole',
      libelle: 'Parent isolé (case T)',
      parts: seulEnfantAlterne ? 0.25 : 0.5,
      // Avec un enfant : plafond global enfant n°1 + case T, dont la demi-part de l'enfant consomme déjà
      // plafondDemiPart. Avec une seule personne invalide à charge : demi-part ordinaire (simulateur officiel
      // 2026 : 2,5 parts, avantage plafonné à 3 × 1 807 €).
      plafondUnitaire: seulEnfantAlterne ? plafondT / 2 : plafondT,
    });
  }

  const { retenues, nonRetenues } = demiPartsPersonnelles(input, estCouple, nombreEnfants, qf);
  majorations.push(...retenues);

  const nombreParts = partsBase + majorations.reduce((total, m) => total + m.parts, 0);

  return {
    partsBase,
    majorations,
    majorationsNonRetenues: nonRetenues,
    nombreParts,
  };
}
