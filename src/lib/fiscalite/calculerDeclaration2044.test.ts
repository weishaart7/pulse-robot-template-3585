import { describe, expect, it } from 'vitest';
import { calculerDeclaration2044, revenusFonciersPour2042, type Declaration2044Input } from './calculerDeclaration2044';

function decl(overrides: Partial<Declaration2044Input> = {}): Declaration2044Input {
  return { annee: 2025, immeubles: [], parts: [], deficitsAnterieurs: [], ...overrides };
}

describe('calculerDeclaration2044 — lignes par immeuble', () => {
  it('bénéfice simple : 215 − 240 − 250, reporté en 4BA', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 12_000, nombreLocaux: 1, primesAssurance: 300, taxesFoncieres: 1_200, interetsEmprunt: 2_000 }],
    }));
    const i = r.immeubles[0];
    expect(i.ligne215).toBe(12_000);
    expect(i.ligne222).toBe(20);
    expect(i.ligne240).toBe(1_520);
    expect(i.ligne263).toBe(8_480);
    expect(r.ligne420).toBe(8_480);
    expect(r.case4BA).toBe(8_480);
    expect(r.case4BB).toBe(0);
    expect(r.case4BC).toBe(0);
    expect(r.casRepartition).toBeNull();
  });

  it('recettes 212 à 214, déduction spécifique 228 sur la ligne 215, régularisation 230 retranchée, réintégration 262', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{
        loyersBruts: 9_000, depensesChargeLocataires: 500, recettesDiverses: 300, valeurLocativeReservee: 200,
        tauxDeductionSpecifique: 30, provisionsCharges: 1_000, regularisationProvisions: 400,
        reintegrationSupplementDeduction: 150,
      }],
    }));
    const i = r.immeubles[0];
    expect(i.ligne215).toBe(10_000);
    expect(i.ligne228).toBe(3_000);
    expect(i.ligne240).toBe(20 + 3_000 + 1_000 - 400);
    expect(i.ligne261).toBe(6_380);
    expect(i.ligne263).toBe(6_530);
  });

  it('forfait 222 : 20 € par local, au moins un local par immeuble même sans saisie', () => {
    const r = calculerDeclaration2044(decl({ immeubles: [{ loyersBruts: 1_000 }, { loyersBruts: 1_000, nombreLocaux: 3 }, { loyersBruts: 1_000, nombreLocaux: 0 }] }));
    expect(r.immeubles.map((i) => i.ligne222)).toEqual([20, 60, 20]);
  });

  it('arrondit chaque ligne à l\'euro (pas de centimes sur le formulaire)', () => {
    const r = calculerDeclaration2044(decl({ immeubles: [{ loyersBruts: 1_000.6, taxesFoncieres: 100.4 }] }));
    expect(r.immeubles[0].ligne211).toBe(1_001);
    expect(r.immeubles[0].ligne227).toBe(100);
    expect(r.ligne420).toBe(881);
  });

  it('parts de sociétés : ligne 114 = 111 − 112 − 113, ajoutée au résultat via la case D', () => {
    const r = calculerDeclaration2044(decl({
      parts: [{ revenusBruts: 3_000, fraisEtCharges: 500, interetsEmprunt: 200 }],
      immeubles: [{ loyersBruts: 1_000 }],
    }));
    expect(r.parts[0].ligne114).toBe(2_300);
    expect(r.caseD).toBe(2_300);
    expect(r.ligne420).toBe(3_280);
    expect(r.case4BA).toBe(3_280);
  });
});

describe('calculerDeclaration2044 — répartition du déficit (rubrique 430)', () => {
  it('intérêts couverts par les revenus (440) : 441 plafonné à 10 700 € en 4BC, 442 en 4BB', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 10_000, travaux: 25_000, interetsEmprunt: 3_000 }],
    }));
    expect(r.ligne420).toBe(-18_020);
    expect(r.casRepartition).toBe('interets_couverts');
    expect(r.ligne441).toBe(10_700);
    expect(r.ligne442).toBe(7_320);
    expect(r.case4BA).toBe(0);
    expect(r.case4BC).toBe(10_700);
    expect(r.case4BB).toBe(7_320);
  });

  it('intérêts supérieurs aux revenus (435) : charges en 436/437, intérêts non couverts en 438', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 2_000, taxesFoncieres: 1_000, interetsEmprunt: 5_000 }],
    }));
    expect(r.ligne420).toBe(-4_020);
    expect(r.casRepartition).toBe('interets_superieurs');
    expect(r.ligne431).toBe(2_000);
    expect(r.ligne432).toBe(5_000);
    expect(r.ligne433).toBe(1_020);
    expect(r.ligne436).toBe(1_020);
    expect(r.ligne437).toBe(0);
    expect(r.ligne438).toBe(3_000);
    expect(r.case4BC).toBe(1_020);
    expect(r.case4BB).toBe(3_000);
  });

  it('intérêts supérieurs aux revenus : charges au-delà du plafond reportées en 437', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 1_000, travaux: 15_000, interetsEmprunt: 2_000 }],
    }));
    expect(r.ligne436).toBe(10_700);
    expect(r.ligne437).toBe(4_320);
    expect(r.ligne438).toBe(1_000);
    expect(r.case4BB).toBe(5_320);
  });

  it('plafond majoré des seules dépenses de rénovation énergétique (434), au plus 21 400 €', () => {
    const partiel = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 5_000, travaux: 20_000, travauxRenovationEnergetique: 3_000 }],
    }));
    expect(partiel.ligne434).toBe(3_000);
    expect(partiel.plafondImputation).toBe(13_700);
    expect(partiel.case4BC).toBe(13_700);
    expect(partiel.case4BB).toBe(18_020 - 13_700);

    const plafonne = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 5_000, travaux: 20_000, travauxRenovationEnergetique: 15_000 }],
      parts: [{ revenusBruts: 0, fraisEtCharges: 1_000, dontRenovationEnergetique: 1_000 }],
    }));
    expect(plafonne.ligne434).toBe(16_000);
    expect(plafonne.plafondImputation).toBe(21_400);
    expect(plafonne.case4BC).toBe(21_400);
  });
});

describe('calculerDeclaration2044 — déficits antérieurs (rubrique 450)', () => {
  it('imputés du plus ancien au plus récent sur le bénéfice, fenêtre de 10 ans, total en 4BD', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 4_000 }],
      deficitsAnterieurs: [
        { anneeOrigine: 2020, montantNonImpute: 5_000 },
        { anneeOrigine: 2014, montantNonImpute: 1_000 },
        { anneeOrigine: 2015, montantNonImpute: 2_000 },
        { anneeOrigine: 2025, montantNonImpute: 999 },
      ],
    }));
    expect(r.deficitsAnterieurs.map((d) => d.anneeOrigine)).toEqual([2015, 2020]);
    expect(r.deficitsAnterieurs[0]).toMatchObject({ nonImpute: 2_000, impute: 2_000, restant: 0 });
    expect(r.deficitsAnterieurs[1]).toMatchObject({ nonImpute: 5_000, impute: 1_980, restant: 3_020 });
    expect(r.ligne451).toBe(7_000);
    expect(r.case4BA).toBe(3_980);
    expect(r.case4BD).toBe(7_000);
    expect(r.revenuFoncierNetImposable).toBe(0);
  });

  it('année déficitaire : rien n\'est imputé, le stock reste entier en 4BD', () => {
    const r = calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 1_000, travaux: 3_000 }],
      deficitsAnterieurs: [{ anneeOrigine: 2022, montantNonImpute: 4_000 }],
    }));
    expect(r.deficitsAnterieurs[0]).toMatchObject({ impute: 0, restant: 4_000 });
    expect(r.case4BD).toBe(4_000);
    expect(r.case4BC).toBe(2_020);
  });
});

describe('revenusFonciersPour2042', () => {
  it('bénéfice après déficits antérieurs ajouté au revenu, PS à 17,2 %', () => {
    const r = revenusFonciersPour2042(calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 10_000 }],
      deficitsAnterieurs: [{ anneeOrigine: 2022, montantNonImpute: 4_000 }],
    })));
    expect(r).toEqual({ revenuFoncierNetImposable: 5_980, deficitImputableRevenuGlobal: 0, incidenceRevenuImposable: 5_980, prelevementsSociaux: 1_029 });
  });

  it('déficit : 4BC retranché du revenu, 4BB sans effet, pas de PS', () => {
    const r = revenusFonciersPour2042(calculerDeclaration2044(decl({
      immeubles: [{ loyersBruts: 10_000, travaux: 25_000, interetsEmprunt: 3_000 }],
    })));
    expect(r).toEqual({ revenuFoncierNetImposable: 0, deficitImputableRevenuGlobal: 10_700, incidenceRevenuImposable: -10_700, prelevementsSociaux: 0 });
  });
});
