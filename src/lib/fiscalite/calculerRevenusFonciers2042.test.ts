import { describe, expect, it } from 'vitest';
import { calculerRevenusFonciers2042 } from './calculerRevenusFonciers2042';
import { RevenusFonciers2042Input } from './types';

const VIDE: RevenusFonciers2042Input = {
  case4be: null, case4bk: null, case4bl: null, case4bn: false, case4bz: false,
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
});
