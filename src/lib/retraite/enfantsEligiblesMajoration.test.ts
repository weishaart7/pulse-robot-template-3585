import { describe, it, expect } from 'vitest';
import {
  nombreEnfantsEligiblesMajorationTroisEnfants,
  nombreEnfantsAChargeAgircArrco,
  enfantsAgircArrco,
} from './enfantsEligiblesMajoration';
import { FamilyLink } from '@/services/familyService';

const enfant = (overrides: Partial<FamilyLink> = {}): FamilyLink => ({
  lien_familial: 'Enfant',
  nom: 'Test',
  ...overrides,
});

describe('nombreEnfantsEligiblesMajorationTroisEnfants — cas courant uniquement (référentiel §3.8)', () => {
  it('compte les enfants en filiation directe (enfant_adopte non renseigné ou "Non")', () => {
    const liens = [enfant(), enfant({ enfant_adopte: 'Non' }), enfant({ enfant_adopte: undefined })];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(3);
  });

  it('compte les enfants adoptés plénièrement', () => {
    const liens = [enfant({ enfant_adopte: 'Adoption plénière' })];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(1);
  });

  it("exclut l'adoption simple — branche « recueilli sans filiation », pas le cas courant", () => {
    const liens = [
      enfant({ enfant_adopte: 'Non' }),
      enfant({ enfant_adopte: 'Adoption plénière' }),
      enfant({ enfant_adopte: 'Adoption simple' }),
    ];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(2);
  });

  it('ignore les liens familiaux qui ne sont pas des enfants directs', () => {
    const liens = [
      enfant(),
      { lien_familial: 'Petit-enfant', nom: 'Test' } as FamilyLink,
      { lien_familial: 'Parent', nom: 'Test' } as FamilyLink,
    ];
    expect(nombreEnfantsEligiblesMajorationTroisEnfants(liens)).toBe(1);
  });

  it('liste vide → 0', () => {
    expect(nombreEnfantsEligiblesMajorationTroisEnfants([])).toBe(0);
  });
});

describe('nombreEnfantsAChargeAgircArrco — Fidroit Agirc-Arrco §5.5.1.2', () => {
  const dateEffet = new Date(2030, 0, 1);
  const enfant = (dateNaissance: string | null, invalide = false, aChargeApres18Ans = false) => ({
    dateNaissance,
    invalide,
    aChargeApres18Ans,
  });
  it('moins de 18 ans : à charge ; 18 ans révolus : seulement si encore à charge', () => {
    expect(nombreEnfantsAChargeAgircArrco([enfant('2012-01-02')], dateEffet)).toBe(1);
    expect(nombreEnfantsAChargeAgircArrco([enfant('2012-01-01')], dateEffet)).toBe(0);
    expect(nombreEnfantsAChargeAgircArrco([enfant('2012-01-01', false, true)], dateEffet)).toBe(1);
  });
  it('au-delà de 25 ans : plus à charge, sauf invalidité', () => {
    expect(nombreEnfantsAChargeAgircArrco([enfant('2004-01-02', false, true)], dateEffet)).toBe(1);
    expect(nombreEnfantsAChargeAgircArrco([enfant('2004-01-01', false, true)], dateEffet)).toBe(0);
    expect(nombreEnfantsAChargeAgircArrco([enfant('1990-05-01', true)], dateEffet)).toBe(1);
  });
  it('né après la date d\'effet ou sans date de naissance : non compté', () => {
    expect(nombreEnfantsAChargeAgircArrco([enfant('2031-01-01'), enfant(null)], dateEffet)).toBe(0);
  });
  it('enfantsAgircArrco : enfants vivants seulement, champs handicap et enfant_a_charge', () => {
    const r = enfantsAgircArrco([
      { lien_familial: 'Enfant', nom: 'A', date_naissance: '2015-03-01', handicap: true, enfant_a_charge: false },
      { lien_familial: 'Enfant', nom: 'B', est_decede: true },
      { lien_familial: 'Conjoint', nom: 'C' },
    ]);
    expect(r).toEqual([{ dateNaissance: '2015-03-01', invalide: true, aChargeApres18Ans: false }]);
  });
});
