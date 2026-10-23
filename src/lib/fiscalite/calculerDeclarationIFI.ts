// Déclaration 2042-IFI (impôt sur la fortune immobilière au 1er janvier N, art. 964 à 983 CGI),
// calculée case à case. Fonction pure : les montants arrivent déjà ramenés à la part du foyer
// (préremplissage : preremplissageIFI.ts), l'arrondi à l'euro est fait sur les cases.

/** Ligne d'actif de l'annexe 2 (biens détenus directement). */
export type CategorieBienIFI =
  | 'residencePrincipale' // 9AA, abattement de 30 % (art. 973 I)
  | 'autreBati' // 9AB
  | 'boisForets' // 9AC, bois, forêts et parts de groupements forestiers (art. 976 I)
  | 'biensRurauxBailLongTerme' // 9AD (art. 976 III)
  | 'partsGfaGaf' // 9BA (art. 976 IV)
  | 'autreNonBati'; // 9BB

export interface BienIFIInput {
  categorie: CategorieBienIFI;
  /** Valeur vénale au 1.1.N, à la part du foyer, avant abattement ou exonération. */
  valeur: number;
  /** Bien mixte : fraction affectée à un usage taxable, en % (100 par défaut). */
  fractionTaxable?: number;
}

/** Dette de l'annexe 4. */
export interface DetteIFIInput {
  /** 9GF : dettes afférentes aux travaux ; 9GH : autres dettes. */
  ligne: '9GF' | '9GH';
  /** Montant restant dû au 1.1.N, à la part du foyer. */
  montant: number;
  /**
   * Catégorie du bien financé : une dette sur un bien partiellement exonéré n'est déductible qu'à
   * proportion de la fraction imposable de sa valeur (art. 974 I).
   */
  categorieBien?: CategorieBienIFI;
  /**
   * Prêt in fine (ou sans terme) contracté pour un bien imposable (art. 974 II) : déductible pour le
   * montant emprunté diminué de montant × années écoulées / durée totale en années.
   */
  inFine?: { montantEmprunte: number; anneesEcoulees: number; dureeAnnees: number };
}

export interface DeclarationIFIInput {
  annee: number;
  biens: BienIFIInput[];
  /** 9CA : fraction immobilière des parts ou actions (y compris unités de compte rachetables). */
  biensIndirects: number[];
  dettes: DetteIFIInput[];
  /** L'IFI théorique (barème sur l'actif net, avant sa propre déduction) est porté en 9GH. */
  deduireIFITheorique?: boolean;
  /** 9NC / 9NG : dons ouvrant droit à la réduction de 75 % (art. 978). */
  donsFrance?: number;
  donsUE?: number;
  /** 9PR : IR, prélèvements sociaux et impôts proportionnels dus au titre des revenus N−1. */
  impotsRevenusN1?: number;
  /** 9PX : revenus et produits N−1 (nets de frais professionnels, avant abattements). */
  revenusN1?: number | null;
}

export interface TrancheIFI {
  min: number;
  max: number;
  taux: number;
  base: number;
  impot: number;
}

export interface DeclarationIFIResultat {
  case9AA: number;
  case9AB: number;
  /** Cases 9AC, 9AD, 9BA : déclarées avant exonération, comme sur le Cerfa. */
  case9AC: number;
  case9AD: number;
  case9BA: number;
  case9BB: number;
  case9CA: number;
  /** Fraction exonérée des biens ruraux, forestiers et GFA/GAF, retranchée de l'actif. */
  exonerationsPartielles: number;
  actifBrut: number;
  /** Dettes après prorata des biens exonérés et dégressivité in fine, avant plafonnement. */
  dettesDeductibles: number;
  /** Réduction des dettes au-delà de 60 % de l'actif lorsque celui-ci excède 5 M€ (art. 974 III). */
  plafonnementDettes: number;
  ifiTheorique: number;
  case9GF: number;
  case9GH: number;
  patrimoineNet: number;
  assujetti: boolean;
  tranches: TrancheIFI[];
  impotBareme: number;
  decote: number;
  ifiApresDecote: number;
  case9NC: number;
  case9NG: number;
  reductionDons: number;
  ifiAvantPlafonnement: number;
  case9PR: number;
  case9PX: number | null;
  /** 75 % des revenus N−1 ; null tant que 9PX n'est pas renseigné. */
  seuilPlafonnement: number | null;
  reductionPlafonnement: number;
  ifiNet: number;
}

export const SEUIL_ASSUJETTISSEMENT_IFI = 1_300_000;
export const ABATTEMENT_RESIDENCE_PRINCIPALE = 0.3;
/** Biens ruraux loués à long terme et parts de GFA/GAF : 3/4 jusqu'à ce montant, 1/2 au-delà (art. 976 III et IV). */
export const SEUIL_EXONERATION_RURALE = 101_897;
export const TAUX_REDUCTION_DONS = 0.75;
export const PLAFOND_REDUCTION_DONS = 50_000;
export const TAUX_PLAFONNEMENT = 0.75;
const SEUIL_PLAFONNEMENT_DETTES = 5_000_000;
const QUOTITE_PLAFONNEMENT_DETTES = 0.6;

export const BAREME_IFI: { min: number; max: number; taux: number }[] = [
  { min: 0, max: 800_000, taux: 0 },
  { min: 800_000, max: 1_300_000, taux: 0.005 },
  { min: 1_300_000, max: 2_570_000, taux: 0.007 },
  { min: 2_570_000, max: 5_000_000, taux: 0.01 },
  { min: 5_000_000, max: 10_000_000, taux: 0.0125 },
  { min: 10_000_000, max: Infinity, taux: 0.015 },
];

const positif = (n: number | null | undefined) => Math.max(0, n || 0);

/** Tranches du barème (art. 977) appliquées à un patrimoine net. */
export function tranchesIFI(patrimoineNet: number): TrancheIFI[] {
  return BAREME_IFI.map(({ min, max, taux }) => {
    const base = Math.max(0, Math.min(patrimoineNet, max) - min);
    return { min, max, taux, base, impot: base * taux };
  }).filter((t) => t.base > 0);
}

/** Décote entre 1,3 M€ et 1,4 M€ : 17 500 € − 1,25 % du patrimoine net (art. 977). */
export function decoteIFI(patrimoineNet: number): number {
  if (patrimoineNet <= SEUIL_ASSUJETTISSEMENT_IFI || patrimoineNet >= 1_400_000) return 0;
  return Math.max(0, 17_500 - 0.0125 * patrimoineNet);
}

/** Impôt dû sur un patrimoine net, barème puis décote ; 0 sous le seuil d'assujettissement. */
export function impotIFI(patrimoineNet: number): number {
  if (patrimoineNet <= SEUIL_ASSUJETTISSEMENT_IFI) return 0;
  const bareme = tranchesIFI(patrimoineNet).reduce((s, t) => s + t.impot, 0);
  return Math.round(Math.max(0, bareme - decoteIFI(patrimoineNet)));
}

/** Valeur imposable d'un ensemble de biens d'une même catégorie (abattement ou exonération partielle). */
function valeurImposable(categorie: CategorieBienIFI, valeurDeclaree: number): number {
  switch (categorie) {
    case 'residencePrincipale':
      return valeurDeclaree * (1 - ABATTEMENT_RESIDENCE_PRINCIPALE);
    case 'boisForets':
      return valeurDeclaree * 0.25;
    case 'biensRurauxBailLongTerme':
    case 'partsGfaGaf':
      return Math.min(valeurDeclaree, SEUIL_EXONERATION_RURALE) * 0.25
        + Math.max(0, valeurDeclaree - SEUIL_EXONERATION_RURALE) * 0.5;
    default:
      return valeurDeclaree;
  }
}

/** Montant déductible d'un prêt in fine : capital × (1 − années écoulées / durée). */
export function montantDeductibleInFine({ montantEmprunte, anneesEcoulees, dureeAnnees }: NonNullable<DetteIFIInput['inFine']>): number {
  if (dureeAnnees <= 0) return positif(montantEmprunte);
  const restant = 1 - Math.min(Math.max(0, Math.floor(anneesEcoulees)), dureeAnnees) / dureeAnnees;
  return positif(montantEmprunte) * restant;
}

export function calculerDeclarationIFI(input: DeclarationIFIInput): DeclarationIFIResultat {
  // Actif : valeur déclarée par catégorie (après fraction taxable des biens mixtes).
  const declare: Record<CategorieBienIFI, number> = {
    residencePrincipale: 0, autreBati: 0, boisForets: 0, biensRurauxBailLongTerme: 0, partsGfaGaf: 0, autreNonBati: 0,
  };
  for (const b of input.biens) {
    declare[b.categorie] += positif(b.valeur) * (b.fractionTaxable == null ? 1 : Math.min(100, Math.max(0, b.fractionTaxable)) / 100);
  }
  // 9AA est déclarée après abattement ; 9AC, 9AD et 9BA avant exonération.
  const imposable = Object.fromEntries(
    (Object.keys(declare) as CategorieBienIFI[]).map((c) => [c, valeurImposable(c, declare[c])]),
  ) as Record<CategorieBienIFI, number>;
  const case9CA = Math.round(input.biensIndirects.reduce((s, v) => s + positif(v), 0));
  const exonerationsPartielles = Math.round(
    (['boisForets', 'biensRurauxBailLongTerme', 'partsGfaGaf'] as const).reduce((s, c) => s + declare[c] - imposable[c], 0),
  );
  const actifBrut = Math.round(Object.values(imposable).reduce((s, v) => s + v, 0)) + case9CA;

  // Passif : prorata de la fraction imposable du bien financé, dégressivité des prêts in fine.
  const ratioImposable = (c?: CategorieBienIFI) =>
    !c || c === 'residencePrincipale' || declare[c] <= 0 ? 1 : imposable[c] / declare[c];
  const dettes = input.dettes.map((d) => ({
    ligne: d.ligne,
    montant: (d.inFine ? montantDeductibleInFine(d.inFine) : positif(d.montant)) * ratioImposable(d.categorieBien),
  }));

  // IFI théorique : impôt sur l'actif net des autres dettes, avant sa propre déduction (9GH).
  const sommeDettes = (liste: { montant: number }[]) => liste.reduce((s, d) => s + d.montant, 0);
  const plafonner = (total: number) => {
    const seuil = QUOTITE_PLAFONNEMENT_DETTES * actifBrut;
    return actifBrut > SEUIL_PLAFONNEMENT_DETTES && total > seuil ? (total - seuil) / 2 : 0;
  };
  const autresDettes = sommeDettes(dettes);
  const ifiTheorique = input.deduireIFITheorique === false
    ? 0
    : impotIFI(actifBrut - (autresDettes - plafonner(autresDettes)));
  const dettesDeductibles = autresDettes + ifiTheorique;
  const plafonnementDettes = plafonner(dettesDeductibles);
  // La réduction pour plafonnement est répartie au prorata entre 9GF et 9GH.
  const coef = dettesDeductibles > 0 ? 1 - plafonnementDettes / dettesDeductibles : 1;
  const case9GF = Math.round(sommeDettes(dettes.filter((d) => d.ligne === '9GF')) * coef);
  const case9GH = Math.round((sommeDettes(dettes.filter((d) => d.ligne === '9GH')) + ifiTheorique) * coef);

  const patrimoineNet = Math.max(0, actifBrut - case9GF - case9GH);
  const assujetti = patrimoineNet > SEUIL_ASSUJETTISSEMENT_IFI;
  const tranches = assujetti ? tranchesIFI(patrimoineNet) : [];
  const impotBareme = Math.round(tranches.reduce((s, t) => s + t.impot, 0));
  const decote = assujetti ? Math.round(decoteIFI(patrimoineNet)) : 0;
  const ifiApresDecote = Math.max(0, impotBareme - decote);

  // Réduction pour dons, avant plafonnement.
  const case9NC = Math.round(positif(input.donsFrance));
  const case9NG = Math.round(positif(input.donsUE));
  const reductionDons = Math.round(Math.min(ifiApresDecote, PLAFOND_REDUCTION_DONS, TAUX_REDUCTION_DONS * (case9NC + case9NG)));
  const ifiAvantPlafonnement = ifiApresDecote - reductionDons;

  // Plafonnement (art. 979) : IFI + impôts sur les revenus N−1 limités à 75 % de ces revenus.
  const case9PR = Math.round(positif(input.impotsRevenusN1));
  const case9PX = input.revenusN1 == null ? null : Math.round(positif(input.revenusN1));
  const seuilPlafonnement = case9PX == null ? null : Math.round(TAUX_PLAFONNEMENT * case9PX);
  const reductionPlafonnement = seuilPlafonnement == null
    ? 0
    : Math.min(ifiAvantPlafonnement, Math.max(0, ifiAvantPlafonnement + case9PR - seuilPlafonnement));

  return {
    case9AA: Math.round(imposable.residencePrincipale),
    case9AB: Math.round(declare.autreBati),
    case9AC: Math.round(declare.boisForets),
    case9AD: Math.round(declare.biensRurauxBailLongTerme),
    case9BA: Math.round(declare.partsGfaGaf),
    case9BB: Math.round(declare.autreNonBati),
    case9CA,
    exonerationsPartielles,
    actifBrut,
    dettesDeductibles: Math.round(dettesDeductibles),
    plafonnementDettes: Math.round(plafonnementDettes),
    ifiTheorique,
    case9GF,
    case9GH,
    patrimoineNet,
    assujetti,
    tranches,
    impotBareme,
    decote,
    ifiApresDecote,
    case9NC,
    case9NG,
    reductionDons,
    ifiAvantPlafonnement,
    case9PR,
    case9PX,
    seuilPlafonnement,
    reductionPlafonnement,
    ifiNet: ifiAvantPlafonnement - reductionPlafonnement,
  };
}
