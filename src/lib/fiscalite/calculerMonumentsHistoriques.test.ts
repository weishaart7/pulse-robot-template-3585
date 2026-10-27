import { describe, expect, it } from 'vitest';
import { montantDeductibleLigneMonumentHistorique, montantDeductibleMonumentsHistoriques } from './calculerMonumentsHistoriques';

const ligne = (situation: Parameters<typeof montantDeductibleLigneMonumentHistorique>[0]['situation'], montant: number, subvention: number | null = null) =>
  montantDeductibleLigneMonumentHistorique({ situation, montant, subvention });

describe('montantDeductibleMonumentsHistoriques', () => {
  it('droits de visite : 100 % pour un classé ou inscrit, 50 % pour un agréé', () => {
    expect(ligne('visites_classe_inscrit', 4000)).toBe(4000);
    expect(ligne('visites_agree', 4000)).toBe(2000);
  });

  it('sans recettes : versements et travaux subventionnés nets, autres charges selon l\'ouverture au public', () => {
    expect(ligne('sans_recettes_versements_culture', 3000)).toBe(3000);
    expect(ligne('sans_recettes_travaux_subventionnes', 10000, 4000)).toBe(6000);
    expect(ligne('sans_recettes_autres_ouvert', 5000)).toBe(5000);
    expect(ligne('sans_recettes_autres_ferme_ou_agree', 5000)).toBe(2500);
  });

  it('label Fondation du patrimoine : 50 %, 100 % si la subvention atteint 20 % des travaux', () => {
    expect(ligne('label_fondation', 10000, 1000)).toBe(4500);
    expect(ligne('label_fondation', 10000, 2000)).toBe(8000);
    expect(ligne('label_fondation', 10000)).toBe(5000);
  });

  it('somme des lignes, subvention limitée au montant', () => {
    expect(montantDeductibleMonumentsHistoriques([
      { situation: 'visites_agree', montant: 3000, subvention: null },
      { situation: 'sans_recettes_travaux_subventionnes', montant: 2000, subvention: 5000 },
    ])).toBe(1500);
  });
});
