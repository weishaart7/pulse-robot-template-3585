import { describe, it, expect } from 'vitest';
import { calculerPensionConsolidee, EntreePensionConsolidee } from './pensionConsolidee';

// Scénarios de référence calculés à la main : docs/Golden_Scenarios_Retraite.md.
// Personne née en mars 1970, départ à l'âge légal (64 ans) le 01/04/2034.
const base: EntreePensionConsolidee = {
  salaireAnnuelMoyen: 0,
  trimestresValides: 0,
  trimestresRequis: 172,
  dateNaissance: { annee: 1970, mois: 3 },
  dateEffet: new Date(Date.UTC(2034, 3, 1)),
  regimesPoints: [],
  detailCarriere: [],
  familyLinks: [],
  auMoinsUnTrimestreMajorationEnfant: false,
  autresPensionsMensuelles: 0,
  fonctionPublique: null,
  cnavpl: null,
};

describe('Golden scenarios — Retraite', () => {
  it('S1 : salarié à taux plein avec Agirc-Arrco', () => {
    const r = calculerPensionConsolidee({
      ...base,
      salaireAnnuelMoyen: 40000,
      trimestresValides: 172,
      regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 10000, valeurPoint: 1.4386 }],
    });
    expect(r.detailRegimeGeneral.decote).toBe(0);
    expect(r.repartitionParRegime.baseRegimeGeneral).toBeCloseTo(20000, 2);
    expect(r.pensionTotaleConsolidee).toBeCloseTo(34386, 2);
  });

  it('S2 : salarié décoté (-15 %), MICO exclu', () => {
    const r = calculerPensionConsolidee({ ...base, salaireAnnuelMoyen: 30000, trimestresValides: 160 });
    expect(r.detailRegimeGeneral.decote).toBe(-15);
    expect(r.detailRegimeGeneral.majorationMicoApresEcretement).toBe(0);
    expect(r.pensionTotaleConsolidee).toBeCloseTo(11860.47, 2);
  });

  it('S3 : petite carrière portée au MICO, majoration 3 enfants', () => {
    const r = calculerPensionConsolidee({
      ...base,
      salaireAnnuelMoyen: 12000,
      trimestresValides: 172,
      familyLinks: [
        { lien_familial: 'Enfant', enfant_adopte: undefined },
        { lien_familial: 'Enfant', enfant_adopte: undefined },
        { lien_familial: 'Enfant', enfant_adopte: undefined },
      ] as EntreePensionConsolidee['familyLinks'],
    });
    expect(r.detailRegimeGeneral.majorationPalier1).toBeCloseTo(3075.48, 2);
    expect(r.detailRegimeGeneral.majorationEnfantsPct).toBe(10);
    expect(r.pensionTotaleConsolidee).toBeCloseTo(9983.03, 2);
  });

  it('S4 : polypensionné RG + fonction publique, pension FP portée au MIGA', () => {
    const r = calculerPensionConsolidee({
      ...base,
      salaireAnnuelMoyen: 30000,
      trimestresValides: 60,
      fonctionPublique: {
        traitementIndiciaireBrut: 30000,
        trimestresLiquidables: 112,
        pointsRAFP: 3000,
        departAnticipeCategorieActive: false,
        departPourInvalidite: false,
        regimeAffiliation: 'SRE',
        moyenneAnnuelleNBI: 0,
        trimestresLiquidablesNBI: 0,
      },
    });
    expect(r.repartitionParRegime.baseRegimeGeneral).toBeCloseTo(5232.56, 2);
    expect(r.repartitionParRegime.fonctionPublique).toBeCloseTo(14756.57, 2);
    expect(r.repartitionParRegime.rafp).toBeCloseTo(170.13, 2);
    expect(r.pensionTotaleConsolidee).toBeCloseTo(20159.26, 2);
  });
});
