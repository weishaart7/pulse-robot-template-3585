import { Liberalite, PersonId, TypeQuotePart } from './types';
import { ReductionResult } from './reserve';

/**
 * Partage de la succession entre héritiers (phase 1 de l'audit « résultat
 * notaire » du 2026-09-29) : ce que chaque héritier reçoit réellement, en
 * distinguant ce qu'il détient déjà (donations), ce qu'il reçoit des biens
 * de la succession, la soulte de rapport et l'indemnité de réduction.
 *
 * Règles (validées le 2026-09-29, cf. docs/transmission.md) :
 * - R1 : une libéralité déjà détenue (donation, quelle que soit son
 *   imputation) n'est jamais réclamée une 2e fois sur les biens existants.
 * - R3 : droits en pleine propriété du conjoint calculés sur la masse de
 *   l'art. 758-5 (biens existants, legs compris, − passif + donations
 *   rapportables aux enfants — jamais celles au conjoint lui-même), diminués
 *   de ses libéralités (art. 758-6), exercés sur les biens non légués et,
 *   en présence de descendants, plafonnés à la QD restante (réserve d'abord).
 * - R4 : rapport en valeur (art. 858, 860) — l'enfant dont la donation
 *   rapportable dépasse sa part doit la différence aux autres (soulte),
 *   héritier supposé acceptant.
 * - R5 : indemnité de réduction due par un donataire réduit ajoutée au pot.
 * - Usufruit (usufruit total, 1/4 PP + 3/4 US) : porte sur les biens non
 *   légués restant après le quart en PP ; enfants et rapports raisonnés en
 *   pleine propriété, puis valorisés en nue-propriété (barème 669).
 */

export interface PartageHeirLine {
  personId: PersonId;
  quotePart: number;
  typeQuotePart: TypeQuotePart;
}

export interface PartageInput {
  lines: PartageHeirLine[];
  biensExistants: number;
  passifs: number;
  liberalites: Liberalite[];
  reductions: ReductionResult;
  // Rapports dus par chaque enfant réservataire (reserve.ts::computeRapport).
  rapports: { personId: PersonId; montantRapport: number }[];
  childrenIds: PersonId[];
  spouseId?: PersonId;
  // QD non consommée par les libéralités (après réduction), plafond des
  // droits du conjoint en présence de descendants.
  qdRestante: number;
  // Legs maintenus à des non-héritiers, déjà sortis du pot par l'appelant.
  totalLegsNonHeritiers: number;
  pctUsufruit: number;
  pctNuePropriete: number;
}

export interface PartageHeirResult {
  // Aligné sur `lines`. Valeur économique (usufruit / nue-propriété au
  // barème 669), toutes origines confondues, libéralités déjà détenues comprises.
  partFinale: number;
  // Reçu des biens de la succession (biens existants + legs à cet héritier
  // + indemnité de réduction) — clé de l'assiette DMTG.
  recuSuccession: number;
  // Libéralités déjà détenues (donations maintenues), jamais re-réclamées.
  dejaDetenu: number;
  // > 0 : soulte reçue ; < 0 : soulte due (rapport excédentaire).
  soulte: number;
  // Part de l'indemnité de réduction revenant à cet héritier (incluse dans recuSuccession).
  indemniteReduction: number;
}

export interface PartageResult {
  heirs: PartageHeirResult[];
  // Indemnités de réduction dues par des donataires (hors biens existants).
  totalIndemnitesReduction: number;
  droitsConjointPlafonnes: boolean;
}

const maintenu = (lib: Liberalite, reductions: ReductionResult) =>
  Math.max(0, lib.valeur - (reductions.reductions.find(r => r.liberaliteId === lib.id)?.montantReduit || 0));

export function computePartage(input: PartageInput): PartageResult {
  const { lines, liberalites, reductions, childrenIds, spouseId, pctUsufruit, pctNuePropriete } = input;
  const actifNet = Math.max(0, input.biensExistants - input.passifs);
  const results: PartageHeirResult[] = lines.map(() => ({
    partFinale: 0, recuSuccession: 0, dejaDetenu: 0, soulte: 0, indemniteReduction: 0
  }));
  const personIds = new Set(lines.map(l => l.personId));
  const firstLineOf = (id: PersonId) => lines.findIndex(l => l.personId === id);

  // Indemnités de réduction dues par des donataires (R5).
  const totalIndemnitesReduction = reductions.reductions
    .filter(r => liberalites.find(l => l.id === r.liberaliteId)?.type === 'donation')
    .reduce((sum, r) => sum + r.montantReduit, 0);

  // Legs maintenus aux héritiers, hors part ou au conjoint : prélevés sur le
  // pot et remis au légataire en plus de sa part. Un legs « sur part » à un
  // enfant reste dans le pot (rapporté via `rapports`).
  const legsHorsPartParHeritier = new Map<PersonId, number>();
  liberalites
    .filter(l => l.type === 'legs' && personIds.has(l.beneficiaireId as PersonId))
    .filter(l => !(l.typeImputation === 'avance_part' && childrenIds.includes(l.beneficiaireId as PersonId)))
    .forEach(l => legsHorsPartParHeritier.set(
      l.beneficiaireId as PersonId,
      (legsHorsPartParHeritier.get(l.beneficiaireId as PersonId) || 0) + maintenu(l, reductions)
    ));
  const totalLegsHeritiers = Array.from(legsHorsPartParHeritier.values()).reduce((s, v) => s + v, 0);

  // Donations déjà détenues par chaque héritier (R1).
  const donationsDetenues = new Map<PersonId, number>();
  liberalites.filter(l => l.type === 'donation').forEach(l => {
    const titulaire = (l.typeImputation === 'partage' && l.generationIntermediaireId && personIds.has(l.generationIntermediaireId))
      ? l.generationIntermediaireId
      : l.beneficiaireId as PersonId;
    if (!personIds.has(titulaire)) return;
    donationsDetenues.set(titulaire, (donationsDetenues.get(titulaire) || 0) + maintenu(l, reductions));
  });

  // Pot = biens non légués + indemnités de réduction.
  const pot = Math.max(0, actifNet - input.totalLegsNonHeritiers - totalLegsHeritiers) + totalIndemnitesReduction;

  // ── Conjoint (R3) ──
  const spouseLines = lines.map((l, i) => ({ l, i })).filter(x => spouseId && x.l.personId === spouseId);
  const qpPP = spouseLines.filter(x => x.l.typeQuotePart === 'pleine_propriete').reduce((s, x) => s + x.l.quotePart, 0);
  const hasSpouseUS = spouseLines.some(x => x.l.typeQuotePart === 'usufruit');
  const rapportsEnfants = input.rapports
    .filter(r => childrenIds.includes(r.personId))
    .reduce((s, r) => s + r.montantRapport, 0);
  const liberalitesConjoint = spouseId
    ? (donationsDetenues.get(spouseId) || 0) + (legsHorsPartParHeritier.get(spouseId) || 0)
    : 0;
  let spousePPduPot = 0;
  let droitsConjointPlafonnes = false;
  if (qpPP > 0) {
    const masse7585 = actifNet + rapportsEnfants;
    const droitBrut = qpPP * masse7585;
    let complement = Math.max(0, droitBrut - liberalitesConjoint);
    const plafonds = [pot];
    if (childrenIds.length > 0) plafonds.push(Math.max(0, input.qdRestante));
    const plafond = Math.min(...plafonds);
    if (complement > plafond) { complement = plafond; droitsConjointPlafonnes = true; }
    spousePPduPot = complement;
  }
  const potApresPP = Math.max(0, pot - spousePPduPot);
  const valeurUsufruitConjoint = hasSpouseUS ? potApresPP * pctUsufruit : 0;

  // Libellé des parts conjoint.
  spouseLines.forEach(({ l, i }, k) => {
    if (l.typeQuotePart === 'pleine_propriete') {
      results[i].recuSuccession = spousePPduPot;
      results[i].partFinale = spousePPduPot;
    } else {
      results[i].recuSuccession = valeurUsufruitConjoint;
      results[i].partFinale = valeurUsufruitConjoint;
    }
    if (k === 0 && spouseId) {
      const legs = legsHorsPartParHeritier.get(spouseId) || 0;
      const don = donationsDetenues.get(spouseId) || 0;
      results[i].recuSuccession += legs;
      results[i].dejaDetenu = don;
      results[i].partFinale += legs + don;
    }
  });

  // ── Autres héritiers (enfants, ou ordres suivants) : égalité avec rapport (R4) ──
  const others = lines.map((l, i) => ({ l, i })).filter(x => !(spouseId && x.l.personId === spouseId));
  const sumQ = others.reduce((s, x) => s + x.l.quotePart, 0);
  const rapportDe = (id: PersonId) => input.rapports.filter(r => r.personId === id).reduce((s, r) => s + r.montantRapport, 0);
  const masseEgalitaire = potApresPP + others.reduce((s, x) => s + rapportDe(x.l.personId), 0);
  // Valorisation : nue-propriété si les enfants sont nus-propriétaires.
  const coef = (t: TypeQuotePart) => t === 'nue_propriete' ? pctNuePropriete : 1;

  const aRecevoir = others.map(x => {
    const s = sumQ > 0 ? x.l.quotePart / sumQ : 0;
    return s * masseEgalitaire - rapportDe(x.l.personId);
  });
  const totalSoultesDues = aRecevoir.filter(v => v < 0).reduce((s, v) => s - v, 0);
  const totalPositif = aRecevoir.filter(v => v > 0).reduce((s, v) => s + v, 0);
  const indemniteParPot = pot > 0 ? totalIndemnitesReduction / pot : 0;

  others.forEach((x, k) => {
    const r = results[x.i];
    const du = aRecevoir[k];
    const c = coef(x.l.typeQuotePart);
    if (du >= 0) {
      // Part reçue des biens du pot / part reçue en soulte.
      const partSoulte = totalPositif > 0 ? totalSoultesDues * (du / totalPositif) : 0;
      const duPot = du - partSoulte;
      r.recuSuccession = duPot * c;
      r.soulte = partSoulte * c;
      r.indemniteReduction = duPot * c * indemniteParPot;
    } else {
      r.soulte = du * c;
    }
    const dejaImpute = firstLineOf(x.l.personId) !== x.i;
    if (!dejaImpute) {
      r.dejaDetenu = donationsDetenues.get(x.l.personId) || 0;
      r.recuSuccession += legsHorsPartParHeritier.get(x.l.personId) || 0;
    }
    r.partFinale = r.recuSuccession + r.soulte + r.dejaDetenu;
  });

  return { heirs: results, totalIndemnitesReduction, droitsConjointPlafonnes };
}
