import { describe, expect, it } from 'vitest';
import { calculerRevenusFonciers2042 } from './calculerRevenusFonciers2042';
import { RevenusFonciers2042Input } from './types';

const VIDE: RevenusFonciers2042Input = {
  case4ba: null, case4bd: null, case4be: null, case4bk: null, case4bl: null, case4bn: false, case4bz: false,
  case4by: null, case4ea: null, case4eb: null,
};

describe('calculerRevenusFonciers2042', () => {
  it('micro-foncier : 70 % de 4BE au barème, PS 17,2 % sur le net', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4be: 10000 }, null);
    expect(r.totalNetImposable).toBe(7000);
    expect(r.prelevementsSociaux).toBe(1204);
    expect(r.alertes).toEqual([]);
  });

  it('4BK : fraction de 4BE sortie du barème vers le crédit d\'impôt, toujours soumise aux PS', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4be: 10000, case4bk: 4000 }, null);
    expect(r.totalNetImposable).toBe(4200);
    expect(r.revenuCreditImpotEgalImpotFrancais).toBe(2800);
    expect(r.prelevementsSociaux).toBe(1204);
  });

  it('4BL : fraction de 4BA plafonnée à 4BA', () => {
    expect(calculerRevenusFonciers2042({ ...VIDE, case4bl: 3000 }, 2000).deductionReel4BL).toBe(2000);
    expect(calculerRevenusFonciers2042({ ...VIDE, case4bl: 3000 }, null).deductionReel4BL).toBe(0);
  });

  it('4EA + 70 % de 4EB au taux effectif ; 4BY au RFR', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4ea: 1000, case4eb: 2000, case4by: 500 }, null);
    expect(r.revenuExonereTauxEffectif).toBe(2400);
    expect(r.revenuExonereRetenuPourRFR).toBe(500);
    expect(r.totalNetImposable).toBe(0);
  });

  it('alertes : micro avec une 2044 ouverte, recettes au-delà de 15 000 €', () => {
    expect(calculerRevenusFonciers2042({ ...VIDE, case4be: 16000 }, 0).alertes)
      .toEqual(['micro_et_reel', 'micro_au_dela_du_seuil']);
  });

  it('4BD sans 2044 : imputé sur le net micro, PS après déficit', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4be: 10000, case4bd: 3000 }, null);
    expect(r.totalNetImposable).toBe(4000);
    expect(r.deficitAnterieurImpute).toBe(3000);
    expect(r.prelevementsSociaux).toBe(688);
  });

  it('4BD supérieur au foncier net : jamais négatif, puis imputé sur la fraction 4BK', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4be: 10000, case4bk: 4000, case4bd: 5000 }, null);
    expect(r.totalNetImposable).toBe(0);
    expect(r.revenuCreditImpotEgalImpotFrancais).toBe(2000);
    const excedent = calculerRevenusFonciers2042({ ...VIDE, case4be: 1000, case4bd: 5000 }, null);
    expect(excedent.totalNetImposable).toBe(0);
    expect(excedent.deficitAnterieurImpute).toBe(700);
    expect(excedent.prelevementsSociaux).toBe(0);
  });

  it('4BA saisi sans 2044 : au barème hors 4BL, PS sur le tout', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4ba: 5000, case4bl: 1000 }, null);
    expect(r.totalNetImposable).toBe(4000);
    expect(r.revenuCreditImpotEgalImpotFrancais).toBe(1000);
    expect(r.deductionReel4BL).toBe(0);
    expect(r.prelevementsSociaux).toBe(860);
  });

  it('2044 ouverte : 4BA et 4BD saisis ignorés et signalés', () => {
    const r = calculerRevenusFonciers2042({ ...VIDE, case4ba: 5000, case4bd: 3000 }, 2000);
    expect(r.totalNetImposable).toBe(0);
    expect(r.deficitAnterieurImpute).toBe(0);
    expect(r.alertes).toEqual(['4ba_ignore_2044', '4bd_ignore_2044']);
  });

  it('alerte : micro-foncier et 4BA direct (parts de SCI seulement) incompatibles', () => {
    expect(calculerRevenusFonciers2042({ ...VIDE, case4be: 5000, case4ba: 2000 }, null).alertes)
      .toEqual(['micro_et_parts_sci']);
  });
});
