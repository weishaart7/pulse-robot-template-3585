import { FoyerFiscalInput, PartsFiscalesResult } from './types';

/**
 * Barème progressif de l'impôt sur le revenu, revenus 2025 / impôt 2026
 * (art. 4 loi de finances pour 2026, revalorisation de 0,9 %).
 * `seuil` = borne supérieure cumulée de la tranche (revenu par part).
 */
export const BAREME_2026 = [
  { seuil: 11600, taux: 0 },
  { seuil: 29579, taux: 0.11 },
  { seuil: 84577, taux: 0.30 },
  { seuil: 181917, taux: 0.41 },
  { seuil: Infinity, taux: 0.45 },
] as const;

const DECOTE_TAUX = 0.4525;
const DECOTE_SEUIL_CELIBATAIRE = 1982;
const DECOTE_MONTANT_CELIBATAIRE = 897;
const DECOTE_SEUIL_COUPLE = 3277;
const DECOTE_MONTANT_COUPLE = 1483;

const COUPLE_IMPOSITION_COMMUNE: FoyerFiscalInput['situationFamille'][] = ['marie', 'pacse'];

export interface ImpotResult {
  revenuImposable: number;
  nombreParts: number;
  quotientFamilial: number;
  impotSansMajorations: number;
  impotAvecMajorations: number;
  avantageQuotientFamilial: number;
  plafondQuotientFamilial: number;
  plafonnementApplique: boolean;
  impotApresPlafonnement: number;
  decote: number;
  impotNet: number;
  tmi: number;
}

/** Impôt dû sur un quotient (revenu par part), tranche par tranche. */
function impotPourQuotient(quotient: number): number {
  let impot = 0;
  let seuilPrecedent = 0;

  for (const tranche of BAREME_2026) {
    if (quotient <= seuilPrecedent) break;
    const borneSup = Math.min(quotient, tranche.seuil);
    impot += (borneSup - seuilPrecedent) * tranche.taux;
    seuilPrecedent = tranche.seuil;
  }

  return impot;
}

/** Taux marginal d'imposition (taux de la tranche contenant le quotient). */
function tmiPourQuotient(quotient: number): number {
  const tranche = BAREME_2026.find(t => quotient <= t.seuil);
  return tranche ? tranche.taux : BAREME_2026[BAREME_2026.length - 1].taux;
}

function impotBrut(revenuImposable: number, nombreParts: number): number {
  if (nombreParts <= 0) return 0;
  return impotPourQuotient(revenuImposable / nombreParts) * nombreParts;
}

/**
 * Impôt sur le revenu (art. 197 CGI, revenus 2025 / impôt 2026), limité au
 * périmètre actuellement calculable (revenu imposable des salaires, quotient
 * familial).
 *
 * Étapes : barème progressif appliqué au quotient (revenu/parts), puis
 * plafonnement de l'avantage procuré par les majorations de parts (comparé à
 * l'impôt sur les seules parts de base), puis décote, puis arrondi à l'euro.
 *
 * Plafonnement : la somme des `plafondUnitaire` de chaque majoration
 * (`calculerPartsFiscales`) borne l'avantage. Une majoration sans
 * `plafondUnitaire` renseigné (ex. personne invalide à charge, art. 196 A bis
 * CGI — cas non encore chiffré dans `calculerPartsFiscales.ts`) désactive tout
 * plafonnement pour l'ensemble du foyer plutôt que de risquer une sous- ou
 * sur-estimation : simplification à lever quand ce cas sera modélisé. Le
 * `plafondComplementaire` (cumul de majorations sur une même personne) n'est
 * pas non plus appliqué pour l'instant.
 */
export function calculerImpot(
  revenuImposable: number,
  parts: PartsFiscalesResult,
  situationFamille: FoyerFiscalInput['situationFamille'],
): ImpotResult {
  const revenu = Math.max(0, revenuImposable);

  const impotAvecMajorations = impotBrut(revenu, parts.nombreParts);
  const impotSansMajorations = impotBrut(revenu, parts.partsBase);
  const avantageQuotientFamilial = Math.max(0, impotSansMajorations - impotAvecMajorations);

  const majorationSansPlafond = parts.majorations.some(m => m.plafondUnitaire === undefined);
  const plafondQuotientFamilial = majorationSansPlafond
    ? Infinity
    : parts.majorations.reduce((total, m) => total + (m.plafondUnitaire ?? 0), 0);

  const plafonnementApplique = avantageQuotientFamilial > plafondQuotientFamilial;
  const avantageRetenu = Math.min(avantageQuotientFamilial, plafondQuotientFamilial);
  const impotApresPlafonnement = impotSansMajorations - avantageRetenu;

  const estCoupleImpositionCommune = COUPLE_IMPOSITION_COMMUNE.includes(situationFamille);
  const seuilDecote = estCoupleImpositionCommune ? DECOTE_SEUIL_COUPLE : DECOTE_SEUIL_CELIBATAIRE;
  const montantDecoteBase = estCoupleImpositionCommune ? DECOTE_MONTANT_COUPLE : DECOTE_MONTANT_CELIBATAIRE;
  const decote = impotApresPlafonnement < seuilDecote
    ? Math.max(0, montantDecoteBase - impotApresPlafonnement * DECOTE_TAUX)
    : 0;

  const impotNet = Math.max(0, Math.round(impotApresPlafonnement - decote));

  return {
    revenuImposable: revenu,
    nombreParts: parts.nombreParts,
    quotientFamilial: parts.nombreParts > 0 ? revenu / parts.nombreParts : 0,
    impotSansMajorations,
    impotAvecMajorations,
    avantageQuotientFamilial,
    plafondQuotientFamilial,
    plafonnementApplique,
    impotApresPlafonnement,
    decote,
    impotNet,
    tmi: tmiPourQuotient(parts.nombreParts > 0 ? revenu / parts.nombreParts : 0),
  };
}
