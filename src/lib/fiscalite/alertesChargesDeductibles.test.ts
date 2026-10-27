import { describe, expect, it } from 'vitest';
import { alertesChargesDeductibles } from './alertesChargesDeductibles';
import { ChargesDeductiblesInput, FoyerFiscalInput } from './types';

const FOYER: FoyerFiscalInput = {
  situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};
const charges = (patch: Partial<ChargesDeductiblesInput>) => patch as ChargesDeductiblesInput;

describe('alertesChargesDeductibles', () => {
  it('aucune alerte sans pension', () => {
    expect(alertesChargesDeductibles(charges({}), { ...FOYER, enfantsMajeursRattaches: 1 })).toEqual([]);
  });

  it('pension à un enfant majeur avec un enfant majeur rattaché', () => {
    expect(alertesChargesDeductibles(charges({ case6el: 3000 }), { ...FOYER, enfantsMajeursRattaches: 1 })).toHaveLength(1);
  });

  it('6GU avec enfant mineur à charge, en résidence alternée ou non', () => {
    const alterne = { ...FOYER, enfantsCharge: [{ anneeNaissance: 2015, invalide: false, residenceAlternee: true }] };
    expect(alertesChargesDeductibles(charges({ case6gu: 2000 }), alterne)).toHaveLength(2);
    const garde = { ...FOYER, enfantsCharge: [{ anneeNaissance: 2015, invalide: false, residenceAlternee: false }] };
    expect(alertesChargesDeductibles(charges({ case6gu: 2000 }), garde)).toHaveLength(1);
    const majeur = { ...FOYER, enfantsCharge: [{ anneeNaissance: 2004, invalide: false, residenceAlternee: false }] };
    expect(alertesChargesDeductibles(charges({ case6gu: 2000 }), majeur)).toEqual([]);
  });
});
