import { FoyerFiscalInput, MajorationDetail, PartsFiscalesResult } from './types';

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

const PLAFOND_DEMI_PART_STANDARD = 1807;
const PLAFOND_QUART_PART_ALTERNEE = 904;
const PLAFOND_COMPLEMENTAIRE_STANDARD = 1801;
const PLAFOND_PARENT_ISOLE = 4262;
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

function construireEnfantsRang(input: FoyerFiscalInput): EnfantRang[] {
  const enfantsCharge: EnfantRang[] = input.enfantsCharge.map(e => ({
    invalide: e.invalide,
    residenceAlternee: e.residenceAlternee,
    estMajeurRattache: false,
  }));
  const majeursRattaches: EnfantRang[] = Array.from({ length: input.enfantsMajeursRattaches }, () => ({
    invalide: false,
    residenceAlternee: false,
    estMajeurRattache: true,
  }));
  return [...enfantsCharge, ...majeursRattaches];
}

function majorationsEnfants(enfants: EnfantRang[]): MajorationDetail[] {
  const majorations: MajorationDetail[] = [];

  enfants.forEach((enfant, index) => {
    const rang = index + 1;
    const tauxPlein = rang <= 2 ? 0.5 : 1;
    const parts = enfant.residenceAlternee ? tauxPlein / 2 : tauxPlein;
    const suffixe = enfant.residenceAlternee ? ' (résidence alternée)' : '';
    const nature = enfant.estMajeurRattache ? 'enfant majeur rattaché' : 'enfant à charge';

    majorations.push({
      type: `enfant_rang_${rang}`,
      libelle: `${rangLabel(rang)} ${nature}${suffixe}`,
      parts,
      plafondUnitaire: parts === 0.25 ? PLAFOND_QUART_PART_ALTERNEE
        : parts === 0.5 ? PLAFOND_DEMI_PART_STANDARD
        : undefined,
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

/**
 * Quotient familial standard (art. 193 à 197 CGI, revenus 2025 / impôt 2026).
 *
 * Fonction pure : ne renvoie que le nombre de parts et le détail des
 * majorations appliquées. Les plafonds en euros portés par chaque majoration
 * (`plafondUnitaire`/`plafondComplementaire`) sont de simples métadonnées,
 * jamais appliquées ici — le plafonnement réel de l'avantage fiscal (art. 197
 * CGI) nécessite un barème IR qui n'existe pas encore dans le repo (Phase
 * différée).
 */
export function calculerPartsFiscales(input: FoyerFiscalInput): PartsFiscalesResult {
  const enfantsRang = construireEnfantsRang(input);
  const nombreEnfants = enfantsRang.length;

  const veufAvecEnfants = input.situationFamille === 'veuf' && nombreEnfants > 0;
  const partsBase = COUPLE_IMPOSITION_COMMUNE.includes(input.situationFamille) || veufAvecEnfants ? 2 : 1;

  const majorations: MajorationDetail[] = [
    ...majorationsEnfants(enfantsRang),
  ];

  input.personnesInvalidesCharge.forEach((_, index) => {
    const rang = index + 1;
    majorations.push({
      type: `personne_invalide_charge_${rang}`,
      libelle: `Personne invalide à charge (${rangLabel(rang)})`,
      parts: 1,
    });
  });

  if (input.parentIsole && nombreEnfants > 0) {
    majorations.push({
      type: 'parent_isole',
      libelle: 'Parent isolé (case T)',
      parts: 1,
      plafondUnitaire: PLAFOND_PARENT_ISOLE,
    });
  }

  if (input.ancienParentIsole) {
    majorations.push({
      type: 'ancien_parent_isole',
      libelle: 'Ancien parent isolé, 5 ans seul (case L)',
      parts: 0.5,
      plafondUnitaire: PLAFOND_ANCIEN_PARENT_ISOLE,
    });
  }

  if (input.invaliditeDeclarant1) {
    majorations.push({
      type: 'invalidite_declarant1',
      libelle: 'Invalidité — déclarant 1',
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  }

  if (input.invaliditeDeclarant2) {
    majorations.push({
      type: 'invalidite_declarant2',
      libelle: 'Invalidité — déclarant 2',
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  }

  if (input.ancienCombattantDeclarant1) {
    majorations.push({
      type: 'ancien_combattant_declarant1',
      libelle: 'Ancien combattant +74 ans — déclarant 1',
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  }

  if (input.ancienCombattantDeclarant2) {
    majorations.push({
      type: 'ancien_combattant_declarant2',
      libelle: 'Ancien combattant +74 ans — déclarant 2',
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  }

  if (input.veufAncienCombattant) {
    majorations.push({
      type: 'veuf_ancien_combattant',
      libelle: "Veuf/veuve d'un ancien combattant +74 ans",
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
    });
  }

  if (input.veuveDeGuerre) {
    majorations.push({
      type: 'veuve_de_guerre',
      libelle: 'Veuve de guerre (art. 195-1-c CGI)',
      parts: 0.5,
      plafondUnitaire: PLAFOND_DEMI_PART_STANDARD,
      plafondComplementaire: PLAFOND_COMPLEMENTAIRE_STANDARD,
    });
  }

  const nombreParts = partsBase + majorations.reduce((total, m) => total + m.parts, 0);

  return {
    partsBase,
    majorations,
    nombreParts,
  };
}
