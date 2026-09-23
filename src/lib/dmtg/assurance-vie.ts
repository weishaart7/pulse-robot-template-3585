import { AVContract, Beneficiary, DmtgParams, AssuranceVieResult } from './types';

interface ResolvedAVShare {
  beneficiaryId: string;
  quotePart: number;
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
 * - Prédécès ('decede') : traité exactement comme 'accepte' ici (aucune
 *   cascade, aucune redistribution) — décision actée, seule l'UI avertit
 *   l'utilisateur (cf. ClauseBeneficiaireBuilder.tsx). Ne pas ajouter de
 *   branche dédiée à ce statut dans cette fonction.
 * - Si tous les niveaux sont intégralement renoncés, la clause retombe sur
 *   "mes héritiers" — non modélisé en données structurées (cf. diagnostic) :
 *   aucun bénéficiaire résolu, ce contrat ne contribue à aucune fiscalité.
 * - Démembrement : un bénéficiaire acceptant en usufruit voit sa part
 *   effective scindée entre lui (part × usufruitPct, déjà résolu par
 *   buildAVContracts selon le barème art. 669 CGI) et son nu-propriétaire
 *   désigné (part × (1 − usufruitPct)) — potentiellement une personne
 *   absente du niveau lui-même.
 */
export function resolveEffectiveAVBeneficiaires(niveaux: AVContract['niveaux']): ResolvedAVShare[] {
  for (const niveau of niveaux) {
    const acceptants = niveau.beneficiaires.filter(b => b.statut !== 'renoncant');
    const totalAcceptantsPct = acceptants.reduce((sum, b) => sum + b.quotePart, 0);

    if (acceptants.length === 0 || totalAcceptantsPct <= 0) {
      continue; // niveau intégralement renoncé : cascade vers le niveau suivant
    }

    const totalNiveau = niveau.beneficiaires.reduce((sum, b) => sum + b.quotePart, 0);
    const shares: ResolvedAVShare[] = [];

    acceptants.forEach(b => {
      const effectiveQuotePart = totalNiveau * (b.quotePart / totalAcceptantsPct);

      if (b.typeDetention === 'usufruit' && b.nuProprietaireId && b.usufruitPct !== undefined) {
        shares.push({ beneficiaryId: b.beneficiaryId, quotePart: effectiveQuotePart * b.usufruitPct });
        shares.push({ beneficiaryId: b.nuProprietaireId, quotePart: effectiveQuotePart * (1 - b.usufruitPct) });
      } else {
        shares.push({ beneficiaryId: b.beneficiaryId, quotePart: effectiveQuotePart });
      }
    });

    return shares;
  }

  return [];
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

  // Initialiser pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = { prelev990I: 0, reintegration757B: 0, capitalBrut: 0 };
  });

  // Calculer la réintégration 757B globale
  const totalPrimesApres70 = contracts.reduce((sum, contract) => sum + contract.primesApres70, 0);
  const exces757B = Math.max(0, totalPrimesApres70 - params.abattements.apres70_AV_global);

  if (exces757B > 0) {
    notes.push(`Primes après 70 ans : ${totalPrimesApres70}€ - Plafond : ${params.abattements.apres70_AV_global}€ - Excédent à réintégrer : ${exces757B}€`);
  }

  // Traiter chaque contrat
  contracts.forEach(contract => {
    // Calculer la répartition de l'excédent 757B pour ce contrat
    const ratioContrat = totalPrimesApres70 > 0 ? contract.primesApres70 / totalPrimesApres70 : 0;
    const exces757BContrat = exces757B * ratioContrat;

    // Bénéficiaires effectifs : cascade de renonciation + démembrement déjà
    // résolus (cf. resolveEffectiveAVBeneficiaires ci-dessus) — le calcul
    // fiscal qui suit n'a plus à connaître la structure en niveaux.
    const effectiveShares = resolveEffectiveAVBeneficiaires(contract.niveaux);

    effectiveShares.forEach(share => {
      const benef = beneficiaries.find(b => b.id === share.beneficiaryId);
      if (!benef) return;

      // Capital brut transmis à ce bénéficiaire sur ce contrat (quote-part
      // effective de la valeur réelle du contrat, pas seulement des primes
      // servant d'assiette 990I/757B) — sert à exposer le net hors succession
      // (capitalBrut - prelev990I) à netBreakdown.ts, cf. décision du
      // 2026-07-17 (AV absente de la transmission nette globale).
      perBeneficiary[benef.id].capitalBrut += contract.capitalDeces * share.quotePart;

      // Réintégration 757B (prorata des quotes-parts effectives)
      const reintegration757B = exces757BContrat * share.quotePart;
      perBeneficiary[benef.id].reintegration757B += reintegration757B;

      // Prélèvement 990I : on ne cumule ici que l'assiette de ce contrat.
      // L'abattement de 152 500€ et le barème s'appliquent une seule fois
      // par bénéficiaire, tous contrats confondus (art. 990 I CGI), cf.
      // boucle après le traitement des contrats.
      const isConjointPacsExonere = (benef.lien === 'conjoint' || benef.lien === 'pacs') && contract.isExonereBeneficiaireConjointPacs;
      const isFraterieExonere = benef.lien === 'frere_soeur' && contract.isSiblingExonEligible;

      if (!isConjointPacsExonere && !isFraterieExonere) {
        // Capital soumis au prélèvement (primes avant 70 ans)
        const capitalSoumis = contract.primesAvant70 * share.quotePart;

        // "Contrat vie-génération" (art. 990 I bis CGI) : abattement de 20%
        // propre à chaque contrat concerné, appliqué AVANT l'abattement de
        // 152 500€ — uniquement sur les primes avant 70 ans ; les primes
        // après 70 ans (757B, ci-dessus) ne sont jamais concernées.
        const capitalApresAbattement20 = contract.nature === 'Contrat vie-génération'
          ? capitalSoumis * 0.8
          : capitalSoumis;

        assiette990IParBenef[benef.id] = (assiette990IParBenef[benef.id] || 0) + capitalApresAbattement20;
      }

      if (reintegration757B > 0) {
        notes.push(`${benef.id} - Contrat ${contract.id} : 757B=${Math.round(reintegration757B)}€`);
      }
    });
  });

  // Abattement 990I et barème, une seule fois par bénéficiaire sur le cumul
  // de ses contrats.
  Object.entries(assiette990IParBenef).forEach(([benId, assiette]) => {
    const baseImposable990I = Math.max(0, assiette - params.abattements.av_990I_allowance);
    if (baseImposable990I > 0) {
      const prelev990I = computeBareme990I(baseImposable990I, params);
      perBeneficiary[benId].prelev990I += prelev990I;
      notes.push(`${benId} : 990I=${Math.round(prelev990I)}€ (assiette cumulée ${Math.round(assiette)}€)`);
    }
  });

  // Arrondir les résultats
  Object.keys(perBeneficiary).forEach(benId => {
    perBeneficiary[benId].prelev990I = Math.round(perBeneficiary[benId].prelev990I);
    perBeneficiary[benId].reintegration757B = Math.round(perBeneficiary[benId].reintegration757B);
    perBeneficiary[benId].capitalBrut = Math.round(perBeneficiary[benId].capitalBrut);
  });

  return { perBeneficiary, notes };
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
