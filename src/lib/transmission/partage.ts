import { Liberalite, PersonId, TypeQuotePart } from './types';
import { ReductionResult, RapportResultat, coefPartage } from './reserve';

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
  rapports: RapportResultat[];
  // Valeur nette des biens existants au partage / au décès (art. 860, masse à
  // partager). Défaut 1 : partage réputé intervenir aux valeurs du décès.
  ratioBiensPartage?: number;
  childrenIds: PersonId[];
  spouseId?: PersonId;
  // QD non consommée par les libéralités (après réduction), plafond des
  // droits du conjoint en présence de descendants.
  qdRestante: number;
  // Option du conjoint issue d'une donation au dernier vivant : assiette
  // maximale de son usufruit sous la quotité spéciale, avant déduction de la
  // pleine propriété prise par l'option (art. 1094-1, contrôle en assiette,
  // cf. reserve.ts::imputeLiberalitesConjoint). Absent : option légale
  // (art. 757), non plafonnée ici.
  plafondAssietteUsufruitDDV?: number;
  // Legs maintenus à des non-héritiers, déjà sortis du pot par l'appelant.
  totalLegsNonHeritiers: number;
  pctUsufruit: number;
  // Conservé pour compatibilité : la nue-propriété vaut 1 − pctUsufruit.
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
  // Valeur de l'usufruit porté par cette ligne (0 sinon) : seule valeur réunie
  // aux nus-propriétaires au décès de l'usufruitier (index.ts, chaînage).
  valeurUsufruit: number;
}

export interface PartageResult {
  heirs: PartageHeirResult[];
  // Indemnités de réduction dues par des donataires (hors biens existants),
  // au décès puis réévaluées au partage (art. 924-2).
  totalIndemnitesReduction: number;
  totalIndemnitesPartage: number;
  droitsConjointPlafonnes: boolean;
}

const maintenu = (lib: Liberalite, reductions: ReductionResult) =>
  Math.max(0, lib.valeur - (reductions.reductions.find(r => r.liberaliteId === lib.id)?.montantReduit || 0));

export function computePartage(input: PartageInput): PartageResult {
  const { lines, liberalites, reductions, childrenIds, spouseId, pctUsufruit } = input;
  const actifNet = Math.max(0, input.biensExistants - input.passifs);
  const results: PartageHeirResult[] = lines.map(() => ({
    partFinale: 0, recuSuccession: 0, dejaDetenu: 0, soulte: 0, indemniteReduction: 0, valeurUsufruit: 0
  }));
  const personIds = new Set(lines.map(l => l.personId));
  const firstLineOf = (id: PersonId) => lines.findIndex(l => l.personId === id);

  // Indemnités de réduction dues par des donataires (R5).
  const totalIndemnitesReduction = reductions.reductions
    .reduce((sum, r) => {
      const lib = liberalites.find(l => l.id === r.liberaliteId);
      if (lib?.type !== 'donation') return sum;
      // Donation en usufruit : indemnité = valeur d'usufruit réduite.
      return sum + (lib.droitTransmis === 'usufruit' ? r.montantReduit * (lib.pctUsufruit ?? 0) : r.montantReduit);
    }, 0);

  // Legs maintenus aux héritiers, hors part ou au conjoint : prélevés sur le
  // pot et remis au légataire en plus de sa part. Un legs « sur part » à un
  // enfant reste dans le pot (rapporté via `rapports`).
  const legsHorsPartParHeritier = new Map<PersonId, number>();
  // Legs au conjoint en usufruit (art. 1094-1) : les biens grevés restent dans
  // le pot (nue-propriété aux autres héritiers) ; seule leur assiette est retenue.
  const assietteLegsUsufruitConjoint = liberalites
    .filter(l => l.type === 'legs' && spouseId && l.beneficiaireId === spouseId && l.droitTransmis === 'usufruit')
    .reduce((s, l) => s + maintenu(l, reductions), 0);
  liberalites
    // Legs d'usufruit à un autre héritier : sa valeur (assiette maintenue ×
    // usufruit du légataire) lui revient, la nue-propriété restant aux héritiers.
    .filter(l => l.type === 'legs' && personIds.has(l.beneficiaireId as PersonId) && !(spouseId && l.beneficiaireId === spouseId && l.droitTransmis === 'usufruit'))
    .filter(l => !(l.typeImputation === 'avance_part' && childrenIds.includes(l.beneficiaireId as PersonId)))
    .forEach(l => legsHorsPartParHeritier.set(
      l.beneficiaireId as PersonId,
      (legsHorsPartParHeritier.get(l.beneficiaireId as PersonId) || 0)
        + (l.droitTransmis === 'usufruit' ? maintenu(l, reductions) * (l.pctUsufruit ?? 0) : maintenu(l, reductions))
    ));
  const totalLegsHeritiers = Array.from(legsHorsPartParHeritier.values()).reduce((s, v) => s + v, 0);

  // Donations déjà détenues par chaque héritier (R1).
  const donationsDetenues = new Map<PersonId, number>();
  const donationsDetenuesPartage = new Map<PersonId, number>();
  liberalites.filter(l => l.type === 'donation').forEach(l => {
    const titulaire = (l.typeImputation === 'partage' && l.generationIntermediaireId && personIds.has(l.generationIntermediaireId))
      ? l.generationIntermediaireId
      : l.beneficiaireId as PersonId;
    if (!personIds.has(titulaire)) return;
    // Donation en usufruit : valeur de l'usufruit détenu.
    const valeur = l.droitTransmis === 'usufruit' ? maintenu(l, reductions) * (l.pctUsufruit ?? 0) : maintenu(l, reductions);
    donationsDetenues.set(titulaire, (donationsDetenues.get(titulaire) || 0) + valeur);
    // Même donation, à sa valeur au partage (art. 860) — affichage de ce que
    // l'héritier détient déjà, cohérent avec son rapport.
    donationsDetenuesPartage.set(titulaire, (donationsDetenuesPartage.get(titulaire) || 0) + valeur * coefPartage(l, true));
  });

  // Pot = biens non légués + indemnités de réduction (valeurs au décès : les
  // droits du conjoint s'y calculent, art. 758-5).
  const pot = Math.max(0, actifNet - input.totalLegsNonHeritiers - totalLegsHeritiers) + totalIndemnitesReduction;

  // Valeurs au jour du partage (R25-R28) : les biens existants, les legs et
  // les parts du conjoint (quotes-parts des biens) évoluent comme les biens
  // (rho) ; les indemnités de réduction sont réévaluées selon la valeur au
  // partage de chaque donation réduite (art. 924-2) ; les rapports suivent la
  // valeur au partage de chaque donation (art. 860).
  const rho = input.ratioBiensPartage ?? 1;
  const totalIndemnitesPartage = reductions.reductions
    .reduce((sum, r) => {
      const lib = liberalites.find(l => l.id === r.liberaliteId);
      if (lib?.type !== 'donation') return sum;
      const valeur = lib.droitTransmis === 'usufruit' ? r.montantReduit * (lib.pctUsufruit ?? 0) : r.montantReduit;
      return sum + valeur * coefPartage(lib, false);
    }, 0);

  // ── Conjoint (R3) ──
  const spouseLines = lines.map((l, i) => ({ l, i })).filter(x => spouseId && x.l.personId === spouseId);
  const qpPP = spouseLines.filter(x => x.l.typeQuotePart === 'pleine_propriete').reduce((s, x) => s + x.l.quotePart, 0);
  const hasSpouseUS = spouseLines.some(x => x.l.typeQuotePart === 'usufruit');
  const rapportsEnfants = input.rapports
    .filter(r => childrenIds.includes(r.personId))
    .reduce((s, r) => s + r.montantRapport, 0);
  const liberalitesConjoint = spouseId
    ? (donationsDetenues.get(spouseId) || 0) + (legsHorsPartParHeritier.get(spouseId) || 0)
      + assietteLegsUsufruitConjoint * pctUsufruit
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
  // Plafond de l'option issue d'une DDV (R20) : l'usufruit est réduit d'abord,
  // puis la pleine propriété.
  let assietteUsufruitOption = hasSpouseUS ? Math.max(0, pot - spousePPduPot) : 0;
  if (input.plafondAssietteUsufruitDDV !== undefined && hasSpouseUS) {
    const plafond = Math.max(0, input.plafondAssietteUsufruitDDV - spousePPduPot);
    if (assietteUsufruitOption > plafond + 0.5) {
      assietteUsufruitOption = plafond;
      droitsConjointPlafonnes = true;
    }
  }
  const potApresPP = Math.max(0, pot - spousePPduPot);
  // Assiette totale grevée d'usufruit au profit du conjoint (option et/ou legs),
  // jamais au-delà des biens restants.
  const assietteUsufruit = Math.min(potApresPP, Math.max(assietteUsufruitOption, assietteLegsUsufruitConjoint));
  const valeurUsufruitConjoint = assietteUsufruit * pctUsufruit;
  // Parts du conjoint au partage : quotes-parts des biens, réévaluées comme eux.
  const spousePPPartage = spousePPduPot * rho;
  const valeurUsufruitPartage = valeurUsufruitConjoint * rho;

  // Libellé des parts conjoint.
  // L'usufruit (option ou legs) est porté par la ligne usufruit si elle
  // existe, sinon par la première ligne du conjoint.
  const ligneUsufruit = spouseLines.find(x => x.l.typeQuotePart === 'usufruit') ?? spouseLines[0];
  spouseLines.forEach(({ l, i }, k) => {
    if (l.typeQuotePart === 'pleine_propriete') {
      results[i].recuSuccession = spousePPPartage;
      results[i].partFinale = spousePPPartage;
    }
    if (ligneUsufruit && ligneUsufruit.i === i) {
      results[i].recuSuccession += valeurUsufruitPartage;
      results[i].partFinale += valeurUsufruitPartage;
      results[i].valeurUsufruit = valeurUsufruitPartage;
    }
    if (k === 0 && spouseId) {
      const legs = (legsHorsPartParHeritier.get(spouseId) || 0) * rho;
      const don = donationsDetenues.get(spouseId) || 0;
      results[i].recuSuccession += legs;
      results[i].dejaDetenu = don;
      results[i].partFinale += legs + don;
    }
  });

  // ── Autres héritiers (enfants, ou ordres suivants) : égalité avec rapport (R4) ──
  const others = lines.map((l, i) => ({ l, i })).filter(x => !(spouseId && x.l.personId === spouseId));
  const sumQ = others.reduce((s, x) => s + x.l.quotePart, 0);
  // Legs « sur part successorale » à un enfant : resté dans le pot, il s'impute
  // sur sa part sans être ajouté à la masse égalitaire (contrairement à une
  // donation rapportable, sortie du patrimoine).
  const legsSurPart = (id: PersonId) => liberalites
    .filter(l => l.type === 'legs' && l.beneficiaireId === id && l.typeImputation === 'avance_part' && childrenIds.includes(id))
    .reduce((s, l) => s + maintenu(l, reductions), 0) * rho;
  // Rapports au jour du partage : donation à sa valeur au partage (art. 860),
  // legs sur part comme les biens existants.
  const rapportDe = (id: PersonId) => input.rapports
    .filter(r => r.personId === id)
    .reduce((s, r) => s + (r.estLegs ? r.montantRapport * rho : (r.montantRapportPartage ?? r.montantRapport)), 0);
  // Valeur restant aux autres héritiers, au jour du partage : biens restants
  // (dont ceux grevés de l'usufruit du conjoint pour leur seule
  // nue-propriété) + indemnités de réduction réévaluées. L'égalité se
  // raisonne en valeur, donations rapportées comprises.
  const valeurPourAutres = Math.max(0, potApresPP - totalIndemnitesReduction - valeurUsufruitConjoint) * rho
    + totalIndemnitesPartage;
  const masseEgalitaire = valeurPourAutres + others.reduce((s, x) => s + rapportDe(x.l.personId) - legsSurPart(x.l.personId), 0);

  const aRecevoir = others.map(x => {
    const s = sumQ > 0 ? x.l.quotePart / sumQ : 0;
    // Le legs sur part reste compté dans ce qui est reçu de la succession.
    return s * masseEgalitaire - rapportDe(x.l.personId) + legsSurPart(x.l.personId);
  });
  const totalSoultesDues = aRecevoir.filter(v => v < 0).reduce((s, v) => s - v, 0);
  const totalPositif = aRecevoir.filter(v => v > 0).reduce((s, v) => s + v, 0);
  const indemniteParPot = valeurPourAutres > 0 ? totalIndemnitesPartage / valeurPourAutres : 0;

  others.forEach((x, k) => {
    const r = results[x.i];
    const du = aRecevoir[k];
    const c = 1;
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
      r.dejaDetenu = donationsDetenuesPartage.get(x.l.personId) || 0;
      r.recuSuccession += (legsHorsPartParHeritier.get(x.l.personId) || 0) * rho;
    }
    r.partFinale = r.recuSuccession + r.soulte + r.dejaDetenu;
  });

  return { heirs: results, totalIndemnitesReduction, totalIndemnitesPartage, droitsConjointPlafonnes };
}
