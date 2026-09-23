/**
 * Répartition nette par héritier — source unique de vérité.
 *
 * Comble le champ `netARecevoir` déjà prévu (mais jamais rempli) dans
 * dmtg/types.ts::DMTGBeneficiaryResult. Remplace le calcul dupliqué et
 * incohérent qui existait dans Synthese.tsx (heritiersData d'un côté,
 * bloc "Coûts de la succession" de l'autre), chacun avec sa propre
 * définition erronée de la quote-part.
 *
 * Couvre le net de succession (droits DMTG + frais de notaire + droit de
 * partage) ET le capital net d'assurance-vie hors succession (capitalBrut −
 * prélèvement 990 I, cf. dmtg/assurance-vie.ts::capitalBrut et
 * DMTGBeneficiaryResult.capitalAVNet), additionné à `netARecevoir` sans
 * entrer dans l'assiette du droit de partage (l'AV n'est jamais dans
 * l'indivision successorale, art. L132-12 C. assur.).
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
  /** DMTGBeneficiaryResult.droitsHorsAV : droits de succession sur la part hors AV
   *  uniquement (PAS droitsTotaux, qui inclut le prélèvement 990I — une taxe sur le
   *  capital AV, hors assiette de `baseApresFrais` ci-dessus ; le mélanger ici
   *  soustrairait le 990I une seconde fois, en plus de la soustraction déjà faite
   *  dans `capitalAVNet` ci-dessous). */
  droitsTotaux: number;
  /** HeirShare.typeQuotePart : présence d'un usufruit ou d'une nue-propriété sur CET
   *  héritier suffit à écarter le droit de partage pour TOUTE la succession (un
   *  usufruitier et un nu-propriétaire ne sont jamais en indivision l'un avec l'autre). */
  typeQuotePart?: 'pleine_propriete' | 'usufruit' | 'nue_propriete';
  /** DMTGBeneficiaryResult.capitalAVNet : capital d'assurance-vie net hors succession
   *  (capitalBrut - prélèvement 990I) revenant à cet héritier. Hors indivision
   *  successorale (art. L132-12 C. assur.) : n'entre jamais dans l'assiette du droit
   *  de partage, seulement ajouté au net final. Défaut 0 (héritier sans contrat AV). */
  capitalAVNet?: number;
  /** Légataire d'un bien ou d'une somme déterminés, qui n'hérite pas : jamais en
   *  indivision avec les héritiers, donc exclu du droit de partage (ni compté dans
   *  le nombre de copartageants, ni débiteur d'une quote-part). Défaut false. */
  horsIndivision?: boolean;
  /** Montant légué, sorti de l'actif partagé entre héritiers (pertinent seulement si
   *  horsIndivision). Défaut : baseApresFrais. */
  montantHorsIndivision?: number;
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
  /** Capital AV net hors succession déjà additionné à `netARecevoir` (cf. NetPerHeirInput). */
  capitalAVNet: number;
  netARecevoir: number;
  /** Part de ce net dans le total net réparti entre héritiers, en %, arrondie à 1 décimale.
   *  Par construction, la somme des percentage de tous les héritiers vaut 100 (±0.1 d'arrondi). */
  percentage: number;
}

export interface NetBreakdownTotals {
  droitsDMTG: number;
  fraisNotaire: number;
  droitPartage: number;
  capitalAVNet: number;
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
  /** Taux du droit de partage applicable : ce module ne modélise que le partage
   *  successoral (indivision entre héritiers après décès, art. 746/748 CGI),
   *  toujours à 2,5 % — les licitations restent également à 2,5 % même en cas
   *  de divorce (art. 750-II CGI). Le taux réduit de 1,10 % (art. 746 CGI) pour
   *  les partages consécutifs à un divorce, une séparation de corps ou une
   *  rupture de PACS est hors périmètre : Transmission ne simule aucun scénario
   *  de ce type (diagnostic du 2026-07-26). Par défaut 0.025 ; ce paramètre
   *  reste configurable si le périmètre du module évolue un jour vers ces cas. */
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
  // Seuls les héritiers en indivision partagent : les légataires hors
  // indivision (cf. NetPerHeirInput.horsIndivision) sortent de l'assiette et du
  // décompte des copartageants.
  const copartageants = heirs.filter(h => !h.horsIndivision);
  const baseHorsIndivision = heirs
    .filter(h => h.horsIndivision)
    .reduce((sum, h) => sum + (h.montantHorsIndivision ?? h.baseApresFrais), 0);
  const actifNetPartage = Math.max(0, params.actifBrut - params.passif - baseHorsIndivision);
  const droitPartageTotal =
    copartageants.length > 1 && !hasDemembrement && params.partageEnvisage
      ? Math.round(actifNetPartage * taux)
      : 0;

  const totalBase = heirs.reduce((sum, h) => sum + h.baseApresFrais, 0);
  const totalBaseCopartageants = copartageants.reduce((sum, h) => sum + h.baseApresFrais, 0);

  const provisional = heirs.map(h => {
    const quotePart = totalBase > 0 ? h.baseApresFrais / totalBase : 1 / heirs.length;
    const fraisNotaire = Math.round(params.fraisNotaireTotal * quotePart);
    const quotePartPartage = h.horsIndivision || totalBaseCopartageants <= 0
      ? 0
      : h.baseApresFrais / totalBaseCopartageants;
    const droitPartage = Math.round(droitPartageTotal * quotePartPartage);
    const totalCouts = h.droitsTotaux + fraisNotaire + droitPartage;
    const capitalAVNet = h.capitalAVNet || 0;
    const netARecevoir = Math.max(0, h.baseApresFrais - totalCouts) + capitalAVNet;

    return {
      personId: h.personId,
      nom: h.nom,
      lien: h.lien,
      baseApresFrais: h.baseApresFrais,
      droitsDMTG: h.droitsTotaux,
      fraisNotaire,
      droitPartage,
      totalCouts,
      capitalAVNet,
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
      capitalAVNet: result.reduce((sum, h) => sum + h.capitalAVNet, 0),
      netTotal
    }
  };
}
