import { describe, it, expect } from 'vitest';
import { calculerPartsFiscales, FoyerFiscalInput } from '@/lib/fiscalite';
import {
  trancheCSGPension,
  prelevementsSociauxPension,
  calculerNetRetraiteFoyer,
  tauxRemplacementBrut,
} from './calculNetRetraite';

const foyer = (situationFamille: FoyerFiscalInput['situationFamille']): FoyerFiscalInput => ({
  situationFamille,
  lieuResidence: 'metropole',
  enfantsCharge: [],
  personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0,
  parentIsole: false,
  ancienParentIsole: false,
  invaliditeDeclarant1: false,
  invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false,
  ancienCombattantDeclarant2: false,
  veufAncienCombattant: false,
  veuveDeGuerre: false,
});

describe('trancheCSGPension — seuils 2026 (l\'Assurance retraite)', () => {
  it('1 part : bornes 13 048 / 17 057 / 26 471 €', () => {
    expect(trancheCSGPension(13048, 1)).toBe('exoneration');
    expect(trancheCSGPension(13049, 1)).toBe('tauxReduit');
    expect(trancheCSGPension(17058, 1)).toBe('tauxMedian');
    expect(trancheCSGPension(26472, 1)).toBe('tauxNormal');
  });
  it('2 parts : + 2 demi-parts (seuil médian 26 471 + 2 × 7 066 = 40 603 €)', () => {
    expect(trancheCSGPension(40603, 2)).toBe('tauxMedian');
    expect(trancheCSGPension(40604, 2)).toBe('tauxNormal');
  });
});

describe('prelevementsSociauxPension', () => {
  it('taux normal : CSG 8,3 %, CRDS 0,5 %, CASA 0,3 %, maladie 1 % sur les complémentaires', () => {
    const ps = prelevementsSociauxPension({ base: 20000, complementaires: 10000 }, 'tauxNormal');
    expect(ps.csg).toBeCloseTo(2490, 6);
    expect(ps.csgDeductible).toBeCloseTo(1770, 6);
    expect(ps.total).toBeCloseTo(2490 + 150 + 90 + 100, 6);
  });
  it('exonération : aucun prélèvement', () => {
    expect(prelevementsSociauxPension({ base: 10000, complementaires: 2000 }, 'exoneration').total).toBe(0);
  });
});

describe('calculerNetRetraiteFoyer — scénario de référence couple marié (docs/Golden_Scenarios_Retraite.md, N1)', () => {
  it('45 000 € de pensions : taux médian après point fixe, impôt après décote 1 009 €', () => {
    const r = calculerNetRetraiteFoyer(
      [
        { base: 20000, complementaires: 10000 },
        { base: 12000, complementaires: 3000 },
      ],
      calculerPartsFiscales(foyer('marie')),
      'marie'
    );
    expect(r.tranche).toBe('tauxMedian');
    expect(r.revenuImposable).toBeCloseTo(38799, 2);
    expect(r.prelevementsSociaux).toBeCloseTo(3460, 2);
    expect(r.impot).toBe(1009);
    expect(r.netAnnuel).toBeCloseTo(40531, 2);
  });

  it('oscillation au seuil médian/normal : la tranche la plus élevée est retenue', () => {
    // 31 001,60 € brut, 1 part : au taux médian le RFR dépasse 26 471 €, au taux normal il repasse dessous.
    const r = calculerNetRetraiteFoyer(
      [{ base: 22001.6, complementaires: 9000 }],
      calculerPartsFiscales(foyer('veuf')),
      'veuf'
    );
    expect(r.tranche).toBe('tauxNormal');
  });

  it('petite pension isolée : exonérée de CSG et non imposable', () => {
    const r = calculerNetRetraiteFoyer([{ base: 11000, complementaires: 0 }], calculerPartsFiscales(foyer('celibataire')), 'celibataire');
    expect(r.tranche).toBe('exoneration');
    expect(r.prelevementsSociaux).toBe(0);
    expect(r.impot).toBe(0);
    expect(r.netAnnuel).toBe(11000);
  });
});

describe('tauxRemplacementBrut', () => {
  it('pension ÷ dernier revenu brut, null sans revenu', () => {
    expect(tauxRemplacementBrut(30000, 60000)).toBe(0.5);
    expect(tauxRemplacementBrut(30000, null)).toBeNull();
  });
});
