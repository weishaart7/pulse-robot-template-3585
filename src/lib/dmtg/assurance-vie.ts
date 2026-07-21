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
  const perBeneficiary: Record<string, { prelev990I: number; reintegration757B: number }> = {};
  const notes: string[] = [];

  // Initialiser pour chaque bénéficiaire
  beneficiaries.forEach(ben => {
    perBeneficiary[ben.id] = { prelev990I: 0, reintegration757B: 0 };
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

      // Réintégration 757B (prorata des quotes-parts effectives)
      const reintegration757B = exces757BContrat * share.quotePart;
      perBeneficiary[benef.id].reintegration757B += reintegration757B;

      // Prélèvement 990I
      let prelev990I = 0;

      // Vérifier les exonérations
      const isConjointPacsExonere = (benef.lien === 'conjoint' || benef.lien === 'pacs') && contract.isExonereBeneficiaireConjointPacs;
      const isFraterieExonere = benef.lien === 'frere_soeur' && contract.isSiblingExonEligible;

      if (!isConjointPacsExonere && !isFraterieExonere) {
        // Capital soumis au prélèvement (primes avant 70 ans)
        const capitalSoumis = contract.primesAvant70 * share.quotePart;

        // Abattement 990I par bénéficiaire
        const baseImposable990I = Math.max(0, capitalSoumis - params.abattements.av_990I_allowance);

        if (baseImposable990I > 0) {
          // Appliquer le barème 990I
          prelev990I = computeBareme990I(baseImposable990I, params);
        }
      }

      perBeneficiary[benef.id].prelev990I += prelev990I;

      if (prelev990I > 0 || reintegration757B > 0) {
        notes.push(`${benef.id} - Contrat ${contract.id} : 990I=${Math.round(prelev990I)}€, 757B=${Math.round(reintegration757B)}€`);
      }
    });
  });

  // Arrondir les résultats
  Object.keys(perBeneficiary).forEach(benId => {
    perBeneficiary[benId].prelev990I = Math.round(perBeneficiary[benId].prelev990I);
    perBeneficiary[benId].reintegration757B = Math.round(perBeneficiary[benId].reintegration757B);
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
