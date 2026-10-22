import { computeRecallAndAllowances, filterDonations15Years, DEFAULT_DMTG_PARAMS } from '@/lib/dmtg';
import type { Beneficiary, Donation } from '@/lib/dmtg/types';
import { liberalitesDuDefunt, NATURE_790G, NATURES_790A_BIS } from './index';
import type { Liberalite } from './types';

export interface AbattementParentSurvivant {
  base: number;
  consommeDonations: number;
  nbDonations: number;
  restant: number;
}

/**
 * Abattement en ligne directe (art. 779 I CGI) d'un enfant commun vis-à-vis du parent SURVIVANT,
 * à la date de la simulation : 100 000 € (+ abattement handicap), moins ce qu'ont consommé les
 * donations de ce parent rappelées sur 15 ans (donations de biens communs comptées pour moitié,
 * cf. liberalitesDuDefunt). Restant disponible pour ses donations futures ou sa propre succession.
 *
 * Même calcul de rappel que le moteur (dmtg/recall.ts). Exonérations 790 G et 790 A bis retenues
 * sur la seule nature du don : les conditions d'âge et de lien sont vérifiées par le moteur pour le
 * défunt simulé, pas ici (affichage seulement, aucun calcul de droits).
 */
export function abattementParentSurvivant(input: {
  liberalites: Liberalite[];
  parent: 'user' | 'spouse';
  beneficiaireId: string;
  isHandicapped?: boolean;
  referenceDate: string;
}): AbattementParentSurvivant {
  const donations: Donation[] = liberalitesDuDefunt(input.liberalites, input.parent)
    .filter(l => l.type === 'donation' && l.beneficiaireId === input.beneficiaireId)
    .map(l => {
      const periode = NATURES_790A_BIS[l.nature || ''];
      return {
        id: l.id,
        date: l.date,
        donorId: input.parent,
        doneeId: l.beneficiaireId,
        valeurDon: l.valeurFiscaleActe ?? l.valeur,
        type: l.nature === NATURE_790G ? 'familiale_790G'
          : periode && l.date >= periode.debut && l.date <= periode.fin ? 'exonere_790A_bis'
          : undefined,
      };
    });
  const donations15y = filterDonations15Years(donations, input.referenceDate, input.beneficiaireId);
  const beneficiary = { id: input.beneficiaireId, lien: 'enfant', isHandicapped: !!input.isHandicapped } as Beneficiary;
  const recall = computeRecallAndAllowances({ beneficiary, donations15y, params: DEFAULT_DMTG_PARAMS });
  return {
    base: recall.details.abattementBase,
    consommeDonations: recall.details.abattementConsomme,
    nbDonations: donations15y.length,
    restant: recall.allowanceGeneralResidual,
  };
}
