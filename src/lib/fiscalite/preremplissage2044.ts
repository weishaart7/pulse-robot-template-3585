import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { annualiserCharge, computeLoyersAnnuels, computeQuotePart, creditsBien } from '@/lib/immobilier/rentabilite';
import { syntheseCredits } from '@/lib/immobilier/credit';
import { partFoyerEmprunt } from '@/lib/budget/emprunts';
import { construireTableau, contratDepuisEmprunt } from '@/lib/credit/contrat';
import { estBienNuEnDirect } from '@/lib/immobilier/partsFoncieres';
import type { Immeuble2044Input, PartSociete2044Input } from './calculerDeclaration2044';

// Préremplissage de la 2044 d'une année N depuis Immobilier et Actifs/Passifs. Les montants
// sont ramenés à la part du foyer dans le bien ; l'utilisateur les surcharge ensuite dans la
// déclaration (declaration2044Service : NULL = valeur préremplie).

/** Lignes de frais de la 2044 vers lesquelles une charge d'actif peut être classée. */
export type LigneCharge2044 = 'fraisAdministrationGestion' | 'primesAssurance' | 'travaux' | 'taxesFoncieres' | 'provisionsCharges';

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Ligne du Cerfa de chaque destination, pour les messages de classement. */
export const CODE_LIGNE_CHARGE_2044: Record<LigneCharge2044, string> = {
  fraisAdministrationGestion: '221', primesAssurance: '223', travaux: '224', taxesFoncieres: '227', provisionsCharges: '229',
};

/**
 * Charges écartées de la 2044 (brochure IR 2026 p. 343 et 350) : taxe d'enlèvement des ordures ménagères et
 * charges locatives (eau, électricité, chauffage, ascenseur), récupérables sur le locataire — celles non
 * récupérées à son départ se saisissent en ligne 225 ; taxe sur les bureaux et locaux commerciaux
 * d'Île-de-France, non déductible ; assurance emprunteur, déjà comprise dans la ligne 250 (tableau
 * d'amortissement). Testées avant les règles de classement.
 */
const MOTS_CLES_ECARTES = [
  'ordures', 'teom', 'enlevement', 'emprunteur', 'pret',
  'charges locatives', 'eau', 'electricite', 'chauffage', 'ascenseur',
  'bureaux', 'locaux commerciaux',
];

/** Règles de classement par mots-clés du libellé, dans l'ordre (la première qui correspond gagne). */
const REGLES_CLASSEMENT: { motsCles: string[]; ligne: LigneCharge2044; aVerifier?: boolean }[] = [
  { motsCles: ['taxe fonciere', 'taxes foncieres'], ligne: 'taxesFoncieres' },
  { motsCles: ['taxe', 'taxes'], ligne: 'taxesFoncieres', aVerifier: true },
  { motsCles: ['assurance', 'pno'], ligne: 'primesAssurance' },
  { motsCles: ['copropriete', 'copro', 'syndic'], ligne: 'provisionsCharges' },
  { motsCles: ['gestion', 'agence', 'honoraire'], ligne: 'fraisAdministrationGestion' },
  { motsCles: ['travaux', 'entretien', 'reparation'], ligne: 'travaux' },
];

const contientMot = (libelle: string, mots: string[]) => mots.some((m) => new RegExp(`\\b${m}\\b`).test(libelle));

/**
 * Classe une charge d'après son libellé. `ligne` null : charge écartée (non déductible ou déjà en 250).
 * `aVerifier` : libellé non reconnu (rangé en 221) ou trop vague (« taxe » seule, rangée en 227).
 */
export function classerCharge(denomination: string): { ligne: LigneCharge2044 | null; aVerifier: boolean } {
  const libelle = sansAccents(denomination || '');
  if (contientMot(libelle, MOTS_CLES_ECARTES)) return { ligne: null, aVerifier: false };
  const regle = REGLES_CLASSEMENT.find((r) => contientMot(libelle, r.motsCles));
  return regle ? { ligne: regle.ligne, aVerifier: !!regle.aVerifier } : { ligne: 'fraisAdministrationGestion', aVerifier: true };
}

/** Montant d'une charge retenu pour l'année N : annualisé si récurrente, sa date dans N si ponctuelle. */
export function montantChargeAnnee(charge: Pick<AssetCharge, 'montant' | 'periodicite' | 'date_debut'>, annee: number): number {
  if (charge.periodicite === 'ponctuelle') {
    return charge.date_debut && new Date(charge.date_debut).getFullYear() === annee ? charge.montant : 0;
  }
  return annualiserCharge(charge);
}

export interface InteretsAnnee {
  montant: number;
  /** Au moins un emprunt relié sans contrat complet (capital initial, 1re échéance, durée) : 12 prochains mois retenus. */
  approximatif: boolean;
}

/**
 * Intérêts et assurance emprunteur payés de janvier à décembre de N, à la part du foyer (ligne 250) :
 * - emprunt Patrimoine relié avec contrat complet : tableau d'amortissement du contrat (src/lib/credit/contrat.ts),
 *   intérêts capitalisés d'un différé total exclus (non payés) ;
 * - emprunt relié sans contrat complet : 12 prochaines échéances (approximation signalée) ;
 * - sans emprunt relié : champs Financement du bien, échéancier daté depuis l'acquisition.
 */
export function interetsEmpruntAnnee(asset: Asset, emprunts: Emprunt[], annee: number): InteretsAnnee {
  const qp = computeQuotePart(asset) / 100;
  const relies = emprunts.filter((e) => e.asset_id === asset.id);
  if (relies.length === 0) {
    const montant = creditsBien(asset, emprunts).reduce((total, c) => total + c.part * c.echeancier.echeances
      .filter((e) => e.mois.getFullYear() === annee)
      .reduce((s, e) => s + e.interet + e.assurance, 0), 0);
    return { montant, approximatif: false };
  }
  let montant = 0;
  let approximatif = false;
  for (const e of relies) {
    const part = partFoyerEmprunt(e) ?? qp;
    const contrat = contratDepuisEmprunt(e);
    if (contrat) {
      montant += part * construireTableau(contrat).lignes
        .filter((l) => l.date.getFullYear() === annee)
        .reduce((s, l) => s + (l.differe && contrat.differeType === 'total' ? 0 : l.interet) + l.assurance, 0);
    } else {
      const s = syntheseCredits(creditsBien(asset, [e]), new Date(), true);
      montant += s.interetsAnnee + s.assuranceAnnee;
      approximatif = true;
    }
  }
  return { montant, approximatif };
}

export interface PreremplissageImmeuble {
  valeurs: Partial<Immeuble2044Input>;
  /** Charges classées par défaut, avec leur ligne (« Divers → 221 »). */
  chargesAVerifier: string[];
  /** Libellés des charges écartées (ordures ménagères, assurance emprunteur). */
  chargesEcartees: string[];
  /** Intérêts estimés sur les 12 prochains mois faute de contrat d'emprunt complet. */
  interetsApproximatifs: boolean;
}

export function preremplirImmeuble(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  emprunts: Emprunt[],
  annee: number,
): PreremplissageImmeuble {
  const qp = computeQuotePart(asset) / 100;
  const interets = interetsEmpruntAnnee(asset, emprunts, annee);
  const valeurs: Partial<Immeuble2044Input> = {
    denomination: asset.denomination || asset.nature,
    loyersBruts: computeLoyersAnnuels(revenus) * qp,
    interetsEmprunt: interets.montant,
  };
  const chargesAVerifier: string[] = [];
  const chargesEcartees: string[] = [];
  for (const c of charges) {
    const montant = montantChargeAnnee(c, annee) * qp;
    if (montant <= 0) continue;
    const { ligne, aVerifier } = classerCharge(c.denomination);
    if (!ligne) { chargesEcartees.push(c.denomination); continue; }
    valeurs[ligne] = (valeurs[ligne] || 0) + montant;
    if (aVerifier) chargesAVerifier.push(`${c.denomination} → ${CODE_LIGNE_CHARGE_2044[ligne]}`);
  }
  return { valeurs, chargesAVerifier, chargesEcartees, interetsApproximatifs: interets.approximatif };
}

/**
 * Parts de société : SCPI et groupements → revenus distribués des 12 derniers mois (approximation de
 * l'attestation). Parts de SCI louées nu → quote-part des loyers, charges et intérêts du bien.
 */
export function preremplirPart(
  asset: Asset,
  revenus: AssetRevenu[],
  charges: AssetCharge[],
  emprunts: Emprunt[],
  annee: number,
): Partial<PartSociete2044Input> {
  const qp = computeQuotePart(asset) / 100;
  if (asset.type_location !== 'Location nue') {
    return { denomination: asset.denomination || asset.nature, revenusBruts: (asset.revenus_distribues_12m || 0) * qp };
  }
  return {
    denomination: asset.denomination || asset.nature,
    revenusBruts: computeLoyersAnnuels(revenus) * qp,
    fraisEtCharges: charges
      .filter((c) => classerCharge(c.denomination).ligne !== null)
      .reduce((s, c) => s + montantChargeAnnee(c, annee), 0) * qp,
    interetsEmprunt: interetsEmpruntAnnee(asset, emprunts, annee).montant,
  };
}

/** Répartit les actifs éligibles : immeubles loués nus en direct d'un côté, parts de société de l'autre. */
export function repartirActifs2044(biensLocationNue: Asset[], partsRevenusFonciers: Asset[]) {
  return {
    immeubles: biensLocationNue.filter(estBienNuEnDirect),
    parts: [...biensLocationNue.filter((a) => !estBienNuEnDirect(a)), ...partsRevenusFonciers],
  };
}
