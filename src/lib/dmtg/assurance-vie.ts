import { AVContract, Beneficiary, DmtgParams, AssuranceVieResult, AVDetailBeneficiaire } from './types';

interface ResolvedAVShare {
  beneficiaryId: string;
  quotePart: number;
  // Fraction de l'abattement 990 I attachée à cette part (art. 990 I al. 3) :
  // 1 en pleine propriété, usufruitPct pour l'usufruitier, 1 − usufruitPct
  // pour le nu-propriétaire d'une clause démembrée.
  coefAbattement990I: number;
}

/**
 * Résout les bénéficiaires effectifs d'un contrat AV à partir de ses niveaux
 * (cascade de renonciation) puis de leur démembrement éventuel :
 * - Renonciation partielle (un ou plusieurs bénéficiaires 'renoncant' dans un
 *   niveau où d'autres acceptent) : la part du renonçant est redistribuée
 *   aux acceptants du même niveau, au prorata de leurs parts respectives —
 *   pas de bascule vers le niveau suivant tant qu'il reste un acceptant.
 * - Renonciation totale (aucun acceptant dans le niveau) : bascule
 *   entièrement sur le niveau suivant, avec la même logique.
 * - Prédécès ('decede') : même effet qu'une renonciation — accroissement aux
 *   bénéficiaires vivants du même rang, puis rang suivant (décision actée,
 *   applicable à tous les calculs, 1er comme 2nd décès).
 * - Si aucun niveau ne laisse de bénéficiaire (tous renoncés ou prédécédés),
 *   aucun bénéficiaire n'est résolu : la clause est caduque et le capital
 *   entre dans la succession du souscripteur (art. L132-11 C. assur.) —
 *   cf. getPartCaduque, repris par computeTransmission.
 * - Démembrement : un bénéficiaire acceptant en usufruit voit sa part
 *   effective scindée entre lui (part × usufruitPct, déjà résolu par
 *   buildAVContracts selon le barème art. 669 CGI) et son nu-propriétaire
 *   désigné (part × (1 − usufruitPct)) — potentiellement une personne
 *   absente du niveau lui-même.
 */
export function resolveEffectiveAVBeneficiaires(niveaux: AVContract['niveaux']): ResolvedAVShare[] {
  for (const niveau of niveaux) {
    const acceptants = niveau.beneficiaires.filter(b => b.statut !== 'renoncant' && b.statut !== 'decede');
    const totalAcceptantsPct = acceptants.reduce((sum, b) => sum + b.quotePart, 0);

    if (acceptants.length === 0 || totalAcceptantsPct <= 0) {
      continue; // niveau intégralement renoncé : cascade vers le niveau suivant
    }

    const totalNiveau = niveau.beneficiaires.reduce((sum, b) => sum + b.quotePart, 0);
    const shares: ResolvedAVShare[] = [];

    acceptants.forEach(b => {
      const effectiveQuotePart = totalNiveau * (b.quotePart / totalAcceptantsPct);

      if (b.typeDetention === 'usufruit' && b.nuProprietaireId && b.usufruitPct !== undefined) {
        shares.push({ beneficiaryId: b.beneficiaryId, quotePart: effectiveQuotePart * b.usufruitPct, coefAbattement990I: b.usufruitPct });
        shares.push({ beneficiaryId: b.nuProprietaireId, quotePart: effectiveQuotePart * (1 - b.usufruitPct), coefAbattement990I: 1 - b.usufruitPct });
      } else {
        shares.push({ beneficiaryId: b.beneficiaryId, quotePart: effectiveQuotePart, coefAbattement990I: 1 });
      }
    });

    return shares;
  }

  return [];
}

/**
 * Part (0 à 1) du capital d'un contrat qu'aucun bénéficiaire ne recueille
 * (tous les niveaux renoncés ou prédécédés) : caduque, elle entre dans la
 * succession du souscripteur (art. L132-11 C. assur.). 0 pour une clause
 * sans aucun bénéficiaire saisi — donnée manquante, jamais assimilée à une
 * absence de désignation.
 */
export function getPartCaduque(niveaux: AVContract['niveaux']): number {
  const aDesBeneficiaires = niveaux.some(n => n.beneficiaires.length > 0);
  if (!aDesBeneficiaires) return 0;
  return resolveEffectiveAVBeneficiaires(niveaux).length === 0 ? 1 : 0;
}

export function computeAssuranceVie(
  contracts: AVContract[],
  beneficiaries: Beneficiary[],
  params: DmtgParams,
  deathDate: string
): AssuranceVieResult {
  const perBeneficiary: Record<string, { prelev990I: number; reintegration757B: number; capitalBrut: number }> = {};
  const notes: string[] = [];
  // Assiette 990I cumulée par bénéficiaire, tous contrats confondus.
  const assiette990IParBenef: Record<string, number> = {};
  const detailParBeneficiaire: Record<string, AVDetailBeneficiaire> = {};
  const detail = (benId: string): AVDetailBeneficiaire => {
    if (!detailParBeneficiaire[benId]) {
      detailParBeneficiaire[benId] = { assiette990I: 0, abattement990I: 0, base990I: 0, primes757B: 0, abattement757B: 0, exonere757B: false };
    }
    return detailParBeneficiaire[benId];
  };

  // Initialiser pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = { prelev990I: 0, reintegration757B: 0, capitalBrut: 0 };
  });

  // Assiettes cumulées par bénéficiaire, tous contrats confondus :
  // - primes757BParBenef : primes versées après 70 ans revenant à chacun ;
  // - coefAbattementParBenef : somme des coefficients d'abattement 990 I de
  //   ses parts (plafonnée à 1 plus bas, cf. art. 990 I al. 3).
  const primes757BParBenef: Record<string, number> = {};
  const coefAbattementParBenef: Record<string, number> = {};

  // Exonérés au titre du 757 B : conjoint/PACS (exonération de la
  // succession, art. 796-0 bis) et frère/sœur remplissant l'art. 796-0 ter.
  const isExonere757B = (benef: Beneficiary) =>
    benef.lien === 'conjoint' || benef.lien === 'pacs' ||
    (benef.lien === 'frere_soeur' && !!benef.exonerationSuccession);

  contracts.forEach(contract => {
    // Bénéficiaires effectifs : cascade de renonciation + démembrement déjà
    // résolus (cf. resolveEffectiveAVBeneficiaires ci-dessus) — le calcul
    // fiscal qui suit n'a plus à connaître la structure en niveaux.
    const effectiveShares = resolveEffectiveAVBeneficiaires(contract.niveaux);

    // Capital décès rattaché aux primes versées avant 70 ans (assiette 990 I :
    // sommes dues, plus-values comprises), au prorata des primes — approximation
    // faute de valeur acquise suivie versement par versement.
    const totalPrimes = contract.primesAvant70 + contract.primesApres70;
    const capital990I = totalPrimes > 0
      ? contract.capitalDeces * (contract.primesAvant70 / totalPrimes)
      : 0;

    // Assiette 757 B du contrat : primes versées après 70 ans, jamais
    // diminuées des rachats partiels (BOI-ENR-DMTG-10-10-20-20 § 190), mais
    // plafonnées au capital décès qui leur correspond quand le contrat est en
    // moins-value (les sommes versées sont alors inférieures aux primes).
    const capital757B = totalPrimes > 0
      ? contract.capitalDeces * (contract.primesApres70 / totalPrimes)
      : 0;
    const assiette757BContrat = Math.min(contract.primesApres70, capital757B);

    effectiveShares.forEach(share => {
      const benef = beneficiaries.find(b => b.id === share.beneficiaryId);
      if (!benef) return;

      // Capital brut transmis à ce bénéficiaire sur ce contrat (quote-part
      // effective de la valeur réelle du contrat) — sert à exposer le net hors
      // succession (capitalBrut - prelev990I) à netBreakdown.ts.
      perBeneficiary[benef.id].capitalBrut += contract.capitalDeces * share.quotePart;

      // 757 B : primes après 70 ans (jamais les gains), prorata des parts.
      primes757BParBenef[benef.id] = (primes757BParBenef[benef.id] || 0) + assiette757BContrat * share.quotePart;

      const isConjointPacsExonere = (benef.lien === 'conjoint' || benef.lien === 'pacs') && contract.isExonereBeneficiaireConjointPacs;
      const isFraterieExonere = benef.lien === 'frere_soeur' && contract.isSiblingExonEligible;

      if (!isConjointPacsExonere && !isFraterieExonere) {
        const capitalSoumis = capital990I * share.quotePart;

        // "Contrat vie-génération" (art. 990 I bis CGI) : abattement de 20%
        // propre à chaque contrat concerné, appliqué AVANT l'abattement de
        // 152 500€ — uniquement sur l'assiette 990 I, jamais sur le 757 B.
        const capitalApresAbattement20 = contract.nature === 'Contrat vie-génération'
          ? capitalSoumis * 0.8
          : capitalSoumis;

        assiette990IParBenef[benef.id] = (assiette990IParBenef[benef.id] || 0) + capitalApresAbattement20;
        coefAbattementParBenef[benef.id] = (coefAbattementParBenef[benef.id] || 0) + share.coefAbattement990I;
      }
    });
  });

  // 757 B : abattement global de 30 500€ réparti entre les seuls bénéficiaires
  // non exonérés, au prorata de leurs primes (BOI-TCAS-AUT-60). Un exonéré
  // réintègre sa part sans abattement — sans effet fiscal, ses droits étant nuls.
  const totalPrimes757BNonExoneres = Object.entries(primes757BParBenef)
    .filter(([benId]) => !isExonere757B(beneficiaries.find(b => b.id === benId)!))
    .reduce((sum, [, primes]) => sum + primes, 0);

  Object.entries(primes757BParBenef).forEach(([benId, primes]) => {
    const benef = beneficiaries.find(b => b.id === benId)!;
    const abattement = isExonere757B(benef) || totalPrimes757BNonExoneres <= 0
      ? 0
      : params.abattements.apres70_AV_global * (primes / totalPrimes757BNonExoneres);
    const reintegration757B = Math.max(0, primes - abattement);
    perBeneficiary[benId].reintegration757B += reintegration757B;
    const d = detail(benId);
    d.primes757B = Math.round(primes);
    d.abattement757B = Math.round(Math.min(primes, abattement));
    d.exonere757B = isExonere757B(benef);
    if (reintegration757B > 0) {
      notes.push(`${benId} : 757B=${Math.round(reintegration757B)}€ (primes ${Math.round(primes)}€, abattement ${Math.round(abattement)}€)`);
    }
  });

  // 990 I : abattement et barème une seule fois par bénéficiaire sur le cumul
  // de ses contrats. En clause démembrée, l'abattement est réparti entre
  // usufruitier et nu-propriétaire dans les proportions du barème 669 (art.
  // 990 I al. 3) ; une personne cumulant plusieurs parts ne dépasse jamais
  // l'abattement plein.
  Object.entries(assiette990IParBenef).forEach(([benId, assiette]) => {
    const coef = Math.min(1, coefAbattementParBenef[benId] || 0);
    const abattement = params.abattements.av_990I_allowance * coef;
    const baseImposable990I = Math.max(0, assiette - abattement);
    const d = detail(benId);
    d.assiette990I = Math.round(assiette);
    d.abattement990I = Math.round(Math.min(assiette, abattement));
    d.base990I = Math.round(baseImposable990I);
    if (baseImposable990I > 0) {
      const prelev990I = computeBareme990I(baseImposable990I, params);
      perBeneficiary[benId].prelev990I += prelev990I;
      notes.push(`${benId} : 990I=${Math.round(prelev990I)}€ (assiette cumulée ${Math.round(assiette)}€, abattement ${Math.round(abattement)}€)`);
    }
  });

  // Arrondir les résultats
  Object.keys(perBeneficiary).forEach(benId => {
    perBeneficiary[benId].prelev990I = Math.round(perBeneficiary[benId].prelev990I);
    perBeneficiary[benId].reintegration757B = Math.round(perBeneficiary[benId].reintegration757B);
    perBeneficiary[benId].capitalBrut = Math.round(perBeneficiary[benId].capitalBrut);
  });

  return { perBeneficiary, detailParBeneficiaire, notes };
}

function computeBareme990I(baseImposable: number, params: DmtgParams): number {
  let totalTax = 0;
  let currentBase = 0;
  let remainingAmount = baseImposable;

  for (const tranche of params.av_990I_rates) {
    const trancheMax = tranche.upTo || Infinity;
    const trancheSize = trancheMax - currentBase;

    if (remainingAmount > 0) {
      const baseForThisTranche = Math.min(remainingAmount, trancheSize);
      const taxForThisTranche = baseForThisTranche * tranche.rate;

      totalTax += taxForThisTranche;
      remainingAmount -= baseForThisTranche;
    }

    currentBase = trancheMax;
    if (remainingAmount <= 0 || trancheMax === Infinity) break;
  }

  return totalTax;
}
