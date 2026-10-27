import { describe, expect, it } from 'vitest';
import { calculerDeclarationIFI, impotIFI, montantDeductibleInFine, type DeclarationIFIInput } from './calculerDeclarationIFI';

function decl(overrides: Partial<DeclarationIFIInput> = {}): DeclarationIFIInput {
  return { annee: 2026, biens: [], biensIndirects: [], dettes: [], ...overrides };
}

describe('calculerDeclarationIFI — cas de référence TEST-4 (IFI 2026)', () => {
  // Résidence principale 4 000 000 €, IFI théorique en 9GH, IR 2025 de 28 866 €, revenus 123 280 €.
  const r = calculerDeclarationIFI(decl({
    biens: [{ categorie: 'residencePrincipale', valeur: 4_000_000 }],
    deduireIFITheorique: true,
    impotsRevenusN1: 28_866,
    revenusN1: 128_280 - 12_000 + 10_000 - 3_000,
  }));

  it('cases de la déclaration', () => {
    expect(r.case9AA).toBe(2_800_000);
    expect(r.ifiTheorique).toBe(13_690);
    expect(r.case9GH).toBe(13_690);
    expect(r.case9PR).toBe(28_866);
    expect(r.case9PX).toBe(123_280);
  });

  it('liquidation : barème sur 2 786 310 €, sans décote ni plafonnement', () => {
    expect(r.patrimoineNet).toBe(2_786_310);
    expect(r.impotBareme).toBe(13_553);
    expect(r.decote).toBe(0);
    expect(r.seuilPlafonnement).toBe(92_460);
    expect(r.reductionPlafonnement).toBe(0);
    expect(r.ifiNet).toBe(13_553);
  });
});

describe('calculerDeclarationIFI — assujettissement et décote', () => {
  it('non assujetti à 1 300 000 € de patrimoine net', () => {
    const r = calculerDeclarationIFI(decl({ biens: [{ categorie: 'autreBati', valeur: 1_300_000 }], deduireIFITheorique: false }));
    expect(r.assujetti).toBe(false);
    expect(r.ifiNet).toBe(0);
  });

  it('décote entre 1,3 et 1,4 M€ : 17 500 − 1,25 % × 1 350 000', () => {
    const r = calculerDeclarationIFI(decl({ biens: [{ categorie: 'autreBati', valeur: 1_350_000 }], deduireIFITheorique: false }));
    expect(r.impotBareme).toBe(2_500 + 350);
    expect(r.decote).toBe(625);
    expect(r.ifiNet).toBe(2_225);
  });

  it("la déduction de l'IFI théorique peut faire repasser sous le seuil", () => {
    expect(impotIFI(1_310_000)).toBe(Math.round(2_570 - (17_500 - 0.0125 * 1_310_000)));
    const r = calculerDeclarationIFI(decl({ biens: [{ categorie: 'autreBati', valeur: 1_301_000 }] }));
    expect(r.ifiTheorique).toBeGreaterThan(0);
    expect(r.assujetti).toBe(false);
  });
});

describe('calculerDeclarationIFI — actif', () => {
  it('bois et forêts exonérés à 75 %, déclarés avant exonération en 9AC', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'boisForets', valeur: 400_000 }, { categorie: 'autreBati', valeur: 2_000_000 }],
      deduireIFITheorique: false,
    }));
    expect(r.case9AC).toBe(400_000);
    expect(r.exonerationsPartielles).toBe(300_000);
    expect(r.actifBrut).toBe(2_100_000);
  });

  it('biens ruraux loués à long terme : 75 % jusqu\'à 101 897 €, 50 % au-delà', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'biensRurauxBailLongTerme', valeur: 301_897 }],
      deduireIFITheorique: false,
    }));
    expect(r.case9AD).toBe(301_897);
    expect(r.actifBrut).toBe(Math.round(101_897 * 0.25 + 200_000 * 0.5));
  });

  it('bien mixte : fraction taxable, parts de société en 9CA', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'autreBati', valeur: 1_000_000, fractionTaxable: 60 }],
      biensIndirects: [250_000, 150_000],
      deduireIFITheorique: false,
    }));
    expect(r.case9AB).toBe(600_000);
    expect(r.case9CA).toBe(400_000);
    expect(r.actifBrut).toBe(1_000_000);
  });
});

describe('calculerDeclarationIFI — passif', () => {
  it('dette sur la résidence principale déductible en totalité malgré l\'abattement', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'residencePrincipale', valeur: 3_000_000 }],
      dettes: [{ ligne: '9GH', montant: 500_000, categorieBien: 'residencePrincipale' }],
      deduireIFITheorique: false,
    }));
    expect(r.case9GH).toBe(500_000);
    expect(r.patrimoineNet).toBe(1_600_000);
  });

  it('dette sur des bois exonérés : déductible au quart', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'boisForets', valeur: 400_000 }, { categorie: 'autreBati', valeur: 2_000_000 }],
      dettes: [{ ligne: '9GF', montant: 100_000, categorieBien: 'boisForets' }],
      deduireIFITheorique: false,
    }));
    expect(r.case9GF).toBe(25_000);
  });

  it('prêt in fine : 1 000 000 € sur 10 ans, 3 années écoulées → 700 000 €', () => {
    expect(montantDeductibleInFine({ montantEmprunte: 1_000_000, anneesEcoulees: 3, dureeAnnees: 10 })).toBe(700_000);
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'autreBati', valeur: 3_000_000 }],
      dettes: [{ ligne: '9GH', montant: 1_000_000, inFine: { montantEmprunte: 1_000_000, anneesEcoulees: 3, dureeAnnees: 10 } }],
      deduireIFITheorique: false,
    }));
    expect(r.case9GH).toBe(700_000);
  });

  it('plafonnement des dettes : actif 6 M€, dettes 4,2 M€ → 3 600 000 + 600 000 / 2', () => {
    const r = calculerDeclarationIFI(decl({
      biens: [{ categorie: 'autreBati', valeur: 6_000_000 }],
      dettes: [{ ligne: '9GH', montant: 4_200_000 }],
      deduireIFITheorique: false,
    }));
    expect(r.plafonnementDettes).toBe(300_000);
    expect(r.case9GH).toBe(3_900_000);
    expect(r.patrimoineNet).toBe(2_100_000);
  });
});

describe('calculerDeclarationIFI — réductions et plafonnement', () => {
  const base = { biens: [{ categorie: 'autreBati' as const, valeur: 3_000_000 }], deduireIFITheorique: false };

  it('dons : 75 % du don, plafonné à 50 000 € et à l\'impôt', () => {
    const r = calculerDeclarationIFI(decl({ ...base, donsFrance: 4_000 }));
    expect(r.impotBareme).toBe(2_500 + 8_890 + 4_300);
    expect(r.reductionDons).toBe(3_000);
    expect(r.ifiNet).toBe(12_690);
    expect(calculerDeclarationIFI(decl({ ...base, donsFrance: 100_000 })).ifiNet).toBe(0);
  });

  it('plafonnement : IFI + impôts N−1 limités à 75 % des revenus', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotsRevenusN1: 10_000, revenusN1: 30_000 }));
    expect(r.seuilPlafonnement).toBe(22_500);
    expect(r.reductionPlafonnement).toBe(15_690 + 10_000 - 22_500);
    expect(r.ifiNet).toBe(22_500 - 10_000);
  });

  it('sans revenus renseignés, pas de plafonnement', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotsRevenusN1: 50_000 }));
    expect(r.case9PX).toBeNull();
    expect(r.ifiNet).toBe(15_690);
  });

  it('9RS : impôt étranger imputé en entier sous la limite', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotEtranger: 3_000, valeurBiensEtranger: 1_000_000 }));
    expect(r.limiteImputationEtranger).toBe(5_230);
    expect(r.imputationEtranger).toBe(3_000);
    expect(r.ifiNet).toBe(15_690 - 3_000);
  });

  it('9RS : imputation limitée à l\'IFI afférent aux biens étrangers', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotEtranger: 9_000, valeurBiensEtranger: 1_000_000 }));
    expect(r.case9RS).toBe(9_000);
    expect(r.imputationEtranger).toBe(5_230);
    expect(r.ifiNet).toBe(10_460);
  });

  it('9RS : sans valeur des biens étrangers, rien n\'est imputé', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotEtranger: 3_000 }));
    expect(r.imputationEtranger).toBe(0);
    expect(r.ifiNet).toBe(15_690);
  });

  it('9RS : limite calculée sur l\'IFI après plafonnement', () => {
    const r = calculerDeclarationIFI(decl({ ...base, impotsRevenusN1: 10_000, revenusN1: 30_000, impotEtranger: 9_000, valeurBiensEtranger: 1_000_000 }));
    expect(r.limiteImputationEtranger).toBe(Math.round(12_500 / 3));
    expect(r.ifiNet).toBe(12_500 - 4_167);
  });
});
