import { describe, expect, it } from 'vitest';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput } from './types';

function makeInput(overrides: Partial<FoyerFiscalInput> = {}): FoyerFiscalInput {
  return {
    situationFamille: 'celibataire',
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
    ...overrides,
  };
}

function enfant(overrides: Partial<FoyerFiscalInput['enfantsCharge'][number]> = {}) {
  return { anneeNaissance: 2015, invalide: false, residenceAlternee: false, ...overrides };
}

describe('calculerPartsFiscales — parts de base', () => {
  it('célibataire sans charge : 1 part', () => {
    expect(calculerPartsFiscales(makeInput({ situationFamille: 'celibataire' })).partsBase).toBe(1);
  });

  it('divorcé sans charge : 1 part', () => {
    expect(calculerPartsFiscales(makeInput({ situationFamille: 'divorce' })).partsBase).toBe(1);
  });

  it('veuf sans enfant à charge : 1 part', () => {
    expect(calculerPartsFiscales(makeInput({ situationFamille: 'veuf' })).partsBase).toBe(1);
  });

  it('marié : 2 parts', () => {
    expect(calculerPartsFiscales(makeInput({ situationFamille: 'marie' })).partsBase).toBe(2);
  });

  it('pacsé : 2 parts', () => {
    expect(calculerPartsFiscales(makeInput({ situationFamille: 'pacse' })).partsBase).toBe(2);
  });

  it('veuf avec enfant à charge : 2 parts (identique couple)', () => {
    const result = calculerPartsFiscales(makeInput({ situationFamille: 'veuf', enfantsCharge: [enfant()] }));
    expect(result.partsBase).toBe(2);
  });

  it('veuf avec enfant majeur rattaché uniquement : 2 parts', () => {
    const result = calculerPartsFiscales(makeInput({ situationFamille: 'veuf', enfantsMajeursRattaches: 1 }));
    expect(result.partsBase).toBe(2);
  });
});

describe('calculerPartsFiscales — enfants à charge (progression 0,5 / 1)', () => {
  it('1 enfant : +0,5, plafond 1807€', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant()] }));
    expect(result.majorations).toEqual([
      { type: 'enfant_rang_1', libelle: '1er enfant à charge', parts: 0.5, plafondUnitaire: 1807 },
    ]);
    expect(result.nombreParts).toBe(1.5);
  });

  it('2 enfants : +0,5 chacun (1 part au total)', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant(), enfant()] }));
    expect(result.majorations.map(m => m.type)).toEqual(['enfant_rang_1', 'enfant_rang_2']);
    expect(result.majorations.every(m => m.parts === 0.5)).toBe(true);
    expect(result.nombreParts).toBe(2);
  });

  it('3 enfants : +0,5 / +0,5 / +1 (3e enfant à part entière)', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant(), enfant(), enfant()] }));
    expect(result.majorations.map(m => m.parts)).toEqual([0.5, 0.5, 1]);
    expect(result.majorations[2]).toMatchObject({ type: 'enfant_rang_3', plafondUnitaire: undefined });
    expect(result.nombreParts).toBe(3);
  });

  it('4 enfants : +0,5 / +0,5 / +1 / +1', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant(), enfant(), enfant(), enfant()] }));
    expect(result.majorations.map(m => m.parts)).toEqual([0.5, 0.5, 1, 1]);
    expect(result.nombreParts).toBe(4);
  });

  it('enfant majeur rattaché : suit la même progression que les enfants à charge, en fin de séquence', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant(), enfant()],
      enfantsMajeursRattaches: 1,
    }));
    expect(result.majorations.map(m => ({ type: m.type, parts: m.parts }))).toEqual([
      { type: 'enfant_rang_1', parts: 0.5 },
      { type: 'enfant_rang_2', parts: 0.5 },
      { type: 'enfant_rang_3', parts: 1 },
    ]);
    expect(result.majorations[2].libelle).toContain('enfant majeur rattaché');
  });

  it('2 enfants majeurs rattachés, aucun enfant à charge : rangs 1 et 2', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsMajeursRattaches: 2 }));
    expect(result.majorations.map(m => m.parts)).toEqual([0.5, 0.5]);
  });
});

describe('calculerPartsFiscales — résidence alternée', () => {
  it('1 enfant en résidence alternée au rang 1 : +0,25, plafond 904€', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant({ residenceAlternee: true })] }));
    expect(result.majorations).toEqual([
      {
        type: 'enfant_rang_1',
        libelle: '1er enfant à charge (résidence alternée)',
        parts: 0.25,
        plafondUnitaire: 904,
      },
    ]);
    expect(result.nombreParts).toBe(1.25);
  });

  it('enfant en résidence alternée au rang 3 : +0,5 (moitié du taux plein de rang 3)', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant(), enfant(), enfant({ residenceAlternee: true })],
    }));
    expect(result.majorations[2]).toMatchObject({ type: 'enfant_rang_3', parts: 0.5, plafondUnitaire: 1807 });
  });
});

describe('calculerPartsFiscales — enfant invalide', () => {
  it('enfant à charge exclusive invalide : +0,5 supplémentaire cumulable, deux lignes distinctes', () => {
    const result = calculerPartsFiscales(makeInput({ enfantsCharge: [enfant({ invalide: true })] }));
    expect(result.majorations).toEqual([
      { type: 'enfant_rang_1', libelle: '1er enfant à charge', parts: 0.5, plafondUnitaire: 1807 },
      {
        type: 'enfant_rang_1_invalidite',
        libelle: 'Majoration invalidité — 1er enfant à charge',
        parts: 0.5,
        plafondUnitaire: 1807,
        plafondComplementaire: 1801,
      },
    ]);
    expect(result.nombreParts).toBe(2);
  });

  it('enfant en résidence alternée ET invalide : les deux lignes sont divisées par deux (0,25 + 0,25 = 0,5 au total)', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant({ invalide: true, residenceAlternee: true })],
    }));
    expect(result.majorations).toEqual([
      {
        type: 'enfant_rang_1',
        libelle: '1er enfant à charge (résidence alternée)',
        parts: 0.25,
        plafondUnitaire: 904,
      },
      {
        type: 'enfant_rang_1_invalidite',
        libelle: 'Majoration invalidité — 1er enfant à charge (résidence alternée)',
        parts: 0.25,
        plafondUnitaire: 903.5,
        plafondComplementaire: 900.5,
      },
    ]);
    expect(result.nombreParts).toBe(1.5);
  });
});

describe('calculerPartsFiscales — personne invalide à charge (hors enfant)', () => {
  it('1 personne invalide à charge : +1 part entière', () => {
    const result = calculerPartsFiscales(makeInput({ personnesInvalidesCharge: [{ anneeNaissance: 1950 }] }));
    expect(result.majorations).toEqual([
      { type: 'personne_invalide_charge_1', libelle: 'Personne invalide à charge (1er)', parts: 1 },
    ]);
    expect(result.nombreParts).toBe(2);
  });

  it('2 personnes invalides à charge : +1 chacune, lignes distinctes', () => {
    const result = calculerPartsFiscales(makeInput({
      personnesInvalidesCharge: [{ anneeNaissance: 1950 }, { anneeNaissance: 1948 }],
    }));
    expect(result.majorations.map(m => m.type)).toEqual(['personne_invalide_charge_1', 'personne_invalide_charge_2']);
    expect(result.nombreParts).toBe(3);
  });
});

describe('calculerPartsFiscales — parent isolé (case T)', () => {
  it('parent isolé avec 1 enfant à charge : +1 part, plafond 4262€', () => {
    const result = calculerPartsFiscales(makeInput({ parentIsole: true, enfantsCharge: [enfant()] }));
    expect(result.majorations).toContainEqual({
      type: 'parent_isole',
      libelle: 'Parent isolé (case T)',
      parts: 1,
      plafondUnitaire: 4262,
    });
  });

  it('parent isolé sans aucun enfant à charge : pas de majoration', () => {
    const result = calculerPartsFiscales(makeInput({ parentIsole: true }));
    expect(result.majorations.find(m => m.type === 'parent_isole')).toBeUndefined();
  });
});

describe('calculerPartsFiscales — ancien parent isolé (case L)', () => {
  it('+0,5, plafond 1079€', () => {
    const result = calculerPartsFiscales(makeInput({ ancienParentIsole: true }));
    expect(result.majorations).toContainEqual({
      type: 'ancien_parent_isole',
      libelle: 'Ancien parent isolé, 5 ans seul (case L)',
      parts: 0.5,
      plafondUnitaire: 1079,
    });
  });
});

describe('calculerPartsFiscales — invalidité déclarant 1 / déclarant 2', () => {
  it('déclarant 1 seul : +0,5, plafond 1807€ + complément 1801€', () => {
    const result = calculerPartsFiscales(makeInput({ invaliditeDeclarant1: true }));
    expect(result.majorations).toEqual([
      {
        type: 'invalidite_declarant1',
        libelle: 'Invalidité — déclarant 1',
        parts: 0.5,
        plafondUnitaire: 1807,
        plafondComplementaire: 1801,
      },
    ]);
  });

  it('déclarant 1 et déclarant 2 invalides : deux lignes distinctes jamais fusionnées, +1 part au total', () => {
    const result = calculerPartsFiscales(makeInput({ invaliditeDeclarant1: true, invaliditeDeclarant2: true }));
    expect(result.majorations.map(m => m.type)).toEqual(['invalidite_declarant1', 'invalidite_declarant2']);
    expect(result.majorations[0]).not.toBe(result.majorations[1]);
    expect(result.nombreParts).toBe(2);
  });
});

describe('calculerPartsFiscales — ancien combattant déclarant 1 / déclarant 2', () => {
  it('les deux déclarants anciens combattants : deux lignes distinctes, +0,5 chacune', () => {
    const result = calculerPartsFiscales(makeInput({
      ancienCombattantDeclarant1: true,
      ancienCombattantDeclarant2: true,
    }));
    expect(result.majorations.map(m => m.type)).toEqual([
      'ancien_combattant_declarant1',
      'ancien_combattant_declarant2',
    ]);
    expect(result.majorations.every(m => m.parts === 0.5 && m.plafondUnitaire === 1807 && m.plafondComplementaire === 1801)).toBe(true);
  });
});

describe('calculerPartsFiscales — veuf/veuve d\'ancien combattant +74 ans', () => {
  it('+0,5, plafond 1807€ SANS complément (à la différence de l\'ancien combattant lui-même)', () => {
    const result = calculerPartsFiscales(makeInput({ veufAncienCombattant: true }));
    expect(result.majorations).toEqual([
      {
        type: 'veuf_ancien_combattant',
        libelle: "Veuf/veuve d'un ancien combattant +74 ans",
        parts: 0.5,
        plafondUnitaire: 1807,
      },
    ]);
    expect(result.majorations[0].plafondComplementaire).toBeUndefined();
  });
});

describe('calculerPartsFiscales — veuve de guerre (art. 195-1-c)', () => {
  it('+0,5, plafond 1807€ + complément 1801€ (distinct du veuf ancien combattant)', () => {
    const result = calculerPartsFiscales(makeInput({ veuveDeGuerre: true }));
    expect(result.majorations).toEqual([
      {
        type: 'veuve_de_guerre',
        libelle: 'Veuve de guerre (art. 195-1-c CGI)',
        parts: 0.5,
        plafondUnitaire: 1807,
        plafondComplementaire: 1801,
      },
    ]);
  });
});

describe('calculerPartsFiscales — ordre du détail des majorations', () => {
  it('respecte l\'ordre du formulaire : enfants, personnes invalides, parent isolé, ancien parent isolé, invalidité 1/2, ancien combattant 1/2, veuf ancien combattant, veuve de guerre', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant()],
      personnesInvalidesCharge: [{ anneeNaissance: 1950 }],
      parentIsole: true,
      ancienParentIsole: true,
      invaliditeDeclarant1: true,
      invaliditeDeclarant2: true,
      ancienCombattantDeclarant1: true,
      ancienCombattantDeclarant2: true,
      veufAncienCombattant: true,
      veuveDeGuerre: true,
    }));

    expect(result.majorations.map(m => m.type)).toEqual([
      'enfant_rang_1',
      'personne_invalide_charge_1',
      'parent_isole',
      'ancien_parent_isole',
      'invalidite_declarant1',
      'invalidite_declarant2',
      'ancien_combattant_declarant1',
      'ancien_combattant_declarant2',
      'veuf_ancien_combattant',
      'veuve_de_guerre',
    ]);
  });
});

describe('calculerPartsFiscales — cas combiné complet', () => {
  it('marié, 3 enfants dont 1 invalide en résidence alternée, + toutes les majorations déclarant', () => {
    const result = calculerPartsFiscales(makeInput({
      situationFamille: 'marie',
      enfantsCharge: [
        enfant(),
        enfant({ invalide: true, residenceAlternee: true }),
        enfant(),
      ],
      invaliditeDeclarant1: true,
    }));

    // base 2 + enfant1 0,5 + enfant2 0,25 + enfant2_invalidite 0,25 + enfant3 (rang3) 1 + invalidite_declarant1 0,5
    expect(result.partsBase).toBe(2);
    expect(result.nombreParts).toBe(2 + 0.5 + 0.25 + 0.25 + 1 + 0.5);
  });
});
