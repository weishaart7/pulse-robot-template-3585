/**
 * Répartition nette par héritier — source unique de vérité.
 *
 * Comble le champ `netARecevoir` déjà prévu (mais jamais rempli) dans
 * dmtg/types.ts::DMTGBeneficiaryResult. Remplace le calcul dupliqué et
 * incohérent qui existait dans Synthese.tsx (heritiersData d'un côté,
 * bloc "Coûts de la succession" de l'autre), chacun avec sa propre
 * définition erronée de la quote-part.
 *
 * Portée volontairement limitée : ne couvre que le net de succession
 * (droits DMTG + frais de notaire + droit de partage). Le capital net
 * d'assurance-vie hors succession (capitalDeces − prélèvement 990 I) n'y
 * est pas encore intégré — `avContracts` reste une liste vide côté
 * transmission/index.ts, faute de table/UI pour saisir un contrat avec
 * bénéficiaire désigné (décision du 2026-07-17 : chantier de modélisation
 * séparé, pas un fix de code). Un futur ajout d'avContracts devra étendre
 * NetPerHeirInput avec un champ `capitalAVNet`, additionné après coup à
 * `netARecevoir` sans toucher au reste de cette fonction.
 *
 * Correction apportée au passage : le droit de partage (art. 746, 747
 * CGI) se calcule sur l'actif net partagé = actif brut − passif, PAS sur
 * la transmission déjà nette de droits de succession et de frais de
 * notaire (c'était le bug de Synthese.tsx ligne ~531).
 */

export interface NetPerHeirInput {
  personId: string;
  nom: string;
  lien: string;
  /** DMTGBeneficiaryResult.baseApresFrais : part de l'héritier avant abattement, après
   *  imputation de sa quote-part de frais funéraires. Sert de clé de répartition pour
   *  les frais de notaire et le droit de partage (art. 1705 CGI : au prorata de la part
   *  dans la succession, pas au prorata du net déjà taxé). */
  baseApresFrais: number;
  /** DMTGBeneficiaryResult.droitsTotaux : droits DMTG + prélèvement 990 I déjà cumulés
   *  pour cet héritier. */
  droitsTotaux: number;
  /** HeirShare.typeQuotePart : présence d'un usufruit ou d'une nue-propriété sur CET
   *  héritier suffit à écarter le droit de partage pour TOUTE la succession (un
   *  usufruitier et un nu-propriétaire ne sont jamais en indivision l'un avec l'autre). */
  typeQuotePart?: 'pleine_propriete' | 'usufruit' | 'nue_propriete';
}

export interface NetPerHeirResult {
  personId: string;
  nom: string;
  lien: string;
  baseApresFrais: number;
  droitsDMTG: number;
  fraisNotaire: number;
  droitPartage: number;
  totalCouts: number;
  netARecevoir: number;
  /** Part de ce net dans le total net réparti entre héritiers, en %, arrondie à 1 décimale.
   *  Par construction, la somme des percentage de tous les héritiers vaut 100 (±0.1 d'arrondi). */
  percentage: number;
}

export interface NetBreakdownTotals {
  droitsDMTG: number;
  fraisNotaire: number;
  droitPartage: number;
  netTotal: number;
}

export interface NetBreakdownResult {
  heirs: NetPerHeirResult[];
  totals: NetBreakdownTotals;
}

export interface NetBreakdownParams {
  /** patrimony.biensExistants */
  actifBrut: number;
  /** patrimony.passifs */
  passif: number;
  /** transmissionResult.fraisNotaire (ou notaryFeesResult.frais) */
  fraisNotaireTotal: number;
  /** Taux du droit de partage : 2,5 % en régime normal (art. 746 CGI),
   *  1,1 % en cas de rupture d'union (divorce, séparation, PACS). Par
   *  défaut 0.025 — ne pas oublier de passer 0.011 si applicable. */
  tauxDroitPartage?: number;
  /** Le droit de partage (art. 746 CGI) n'est dû que si un acte de partage est
   *  effectivement dressé — les héritiers peuvent rester en indivision indéfiniment
   *  sans jamais le payer. Un outil de simulation ne doit pas le présumer : par
   *  défaut false, à mettre à true seulement si un partage est réellement envisagé.
   *  Sans effet si un des héritiers est en démembrement (cf. typeQuotePart). */
  partageEnvisage?: boolean;
}

export function computeNetPerHeir(
  heirs: NetPerHeirInput[],
  params: NetBreakdownParams
): NetBreakdownResult {
  if (heirs.length === 0) {
    return { heirs: [], totals: { droitsDMTG: 0, fraisNotaire: 0, droitPartage: 0, netTotal: 0 } };
  }

  const taux = params.tauxDroitPartage ?? 0.025;

  // Le droit de partage n'est dû que si : (1) plusieurs héritiers (un héritier
  // unique n'est jamais en indivision à partager), (2) aucun démembrement
  // (usufruitier et nu-propriétaire ne sont jamais en indivision entre eux, par
  // nature — ce garde-fou prime toujours), (3) un partage est effectivement
  // envisagé (l'indivision peut durer indéfiniment sans jamais être payée).
  const hasDemembrement = heirs.some(
    h => h.typeQuotePart === 'usufruit' || h.typeQuotePart === 'nue_propriete'
  );
  const actifNetPartage = Math.max(0, params.actifBrut - params.passif);
  const droitPartageTotal =
    heirs.length > 1 && !hasDemembrement && params.partageEnvisage
      ? Math.round(actifNetPartage * taux)
      : 0;

  const totalBase = heirs.reduce((sum, h) => sum + h.baseApresFrais, 0);

  const provisional = heirs.map(h => {
    const quotePart = totalBase > 0 ? h.baseApresFrais / totalBase : 1 / heirs.length;
    const fraisNotaire = Math.round(params.fraisNotaireTotal * quotePart);
    const droitPartage = Math.round(droitPartageTotal * quotePart);
    const totalCouts = h.droitsTotaux + fraisNotaire + droitPartage;
    const netARecevoir = Math.max(0, h.baseApresFrais - totalCouts);

    return {
      personId: h.personId,
      nom: h.nom,
      lien: h.lien,
      baseApresFrais: h.baseApresFrais,
      droitsDMTG: h.droitsTotaux,
      fraisNotaire,
      droitPartage,
      totalCouts,
      netARecevoir
    };
  });

  const netTotal = provisional.reduce((sum, h) => sum + h.netARecevoir, 0);

  const result: NetPerHeirResult[] = provisional.map(h => ({
    ...h,
    percentage: netTotal > 0 ? Number(((h.netARecevoir / netTotal) * 100).toFixed(1)) : 0
  }));

  return {
    heirs: result,
    totals: {
      droitsDMTG: result.reduce((sum, h) => sum + h.droitsDMTG, 0),
      fraisNotaire: result.reduce((sum, h) => sum + h.fraisNotaire, 0),
      droitPartage: result.reduce((sum, h) => sum + h.droitPartage, 0),
      netTotal
    }
  };
}
