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

  it('veuf avec enfant à charge : 2,5 parts comme un couple, base 1 + part de veuvage plafonnée 3614€', () => {
    const result = calculerPartsFiscales(makeInput({ situationFamille: 'veuf', enfantsCharge: [enfant()] }));
    expect(result.partsBase).toBe(1);
    expect(result.majorations[0]).toEqual({
      type: 'veuf_quotient_conjugal',
      libelle: 'Maintien du quotient conjugal (veuf avec personne à charge)',
      parts: 1,
      plafondUnitaire: 3614,
    });
    expect(result.nombreParts).toBe(2.5);
  });

  it('veuf avec enfant majeur rattaché uniquement : part de veuvage accordée', () => {
    const result = calculerPartsFiscales(makeInput({ situationFamille: 'veuf', enfantsMajeursRattaches: 1 }));
    expect(result.partsBase).toBe(1);
    expect(result.nombreParts).toBe(2.5);
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
    expect(result.majorations[2]).toMatchObject({ type: 'enfant_rang_3', plafondUnitaire: 3614 });
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

  it('enfants alternés décomptés après les exclusifs, quel que soit l\'ordre de saisie : 1,5 part', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant({ residenceAlternee: true }), enfant(), enfant()],
    }));
    expect(result.majorations.map(m => m.parts)).toEqual([0.5, 0.5, 0.5]);
    expect(result.majorations[2].libelle).toContain('résidence alternée');
    expect(result.nombreParts).toBe(2.5);
  });

  it('enfants alternés décomptés après les majeurs rattachés', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant({ residenceAlternee: true })],
      enfantsMajeursRattaches: 2,
    }));
    expect(result.majorations.map(m => m.libelle)).toEqual([
      '1er enfant majeur rattaché',
      '2e enfant majeur rattaché',
      '3e enfant à charge (résidence alternée)',
    ]);
    expect(result.majorations.map(m => m.parts)).toEqual([0.5, 0.5, 0.5]);
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
  it('1 personne invalide à charge : +1 part au total, scindée en 2 demi-parts plafonnées (art. 196 A bis)', () => {
    const result = calculerPartsFiscales(makeInput({ personnesInvalidesCharge: [{ anneeNaissance: 1950 }] }));
    expect(result.majorations).toEqual([
      {
        type: 'personne_invalide_charge_1',
        libelle: 'Personne invalide à charge (1er)',
        parts: 0.5,
        plafondUnitaire: 1807,
      },
      {
        type: 'personne_invalide_charge_1_invalidite',
        libelle: 'Majoration invalidité — personne invalide à charge (1er)',
        parts: 0.5,
        plafondUnitaire: 1807,
        plafondComplementaire: 1801,
      },
    ]);
    expect(result.nombreParts).toBe(2);
  });

  it('2 personnes invalides à charge : +1 chacune, 4 lignes distinctes (2 demi-parts par personne)', () => {
    const result = calculerPartsFiscales(makeInput({
      personnesInvalidesCharge: [{ anneeNaissance: 1950 }, { anneeNaissance: 1948 }],
    }));
    expect(result.majorations.map(m => m.type)).toEqual([
      'personne_invalide_charge_1',
      'personne_invalide_charge_1_invalidite',
      'personne_invalide_charge_2',
      'personne_invalide_charge_2_invalidite',
    ]);
    expect(result.nombreParts).toBe(3);
  });
});

describe('calculerPartsFiscales — parent isolé (case T)', () => {
  it('parent isolé avec 1 enfant à charge : 2 parts, enfant n°1 + case T plafonnés ensemble à 4262€', () => {
    const result = calculerPartsFiscales(makeInput({ parentIsole: true, enfantsCharge: [enfant()] }));
    expect(result.majorations).toContainEqual({
      type: 'parent_isole',
      libelle: 'Parent isolé (case T)',
      parts: 0.5,
      plafondUnitaire: 2455,
    });
    expect(result.nombreParts).toBe(2);
    expect(result.majorations.reduce((t, m) => t + (m.plafondUnitaire ?? 0), 0)).toBe(4262);
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

describe('calculerPartsFiscales — couple : cases P, F et S', () => {
  const couple = (o: Partial<FoyerFiscalInput>) => makeInput({ situationFamille: 'marie', ...o });

  it('P seule : +0,5, plafond 1807€ + complément 1801€', () => {
    const result = calculerPartsFiscales(couple({ invaliditeDeclarant1: true }));
    expect(result.majorations).toEqual([{
      type: 'invalidite_declarant1',
      libelle: 'Invalidité — déclarant 1 (case P)',
      parts: 0.5,
      plafondUnitaire: 1807,
      plafondComplementaire: 1801,
    }]);
  });

  it('P et F se cumulent : deux lignes, +1 part', () => {
    const result = calculerPartsFiscales(couple({ invaliditeDeclarant1: true, invaliditeDeclarant2: true }));
    expect(result.majorations.map(m => m.type)).toEqual(['invalidite_declarant1', 'invalidite_declarant2']);
    expect(result.nombreParts).toBe(3);
  });

  it('les deux anciens combattants : une seule demi-part S pour le couple', () => {
    const result = calculerPartsFiscales(couple({ ancienCombattantDeclarant1: true, ancienCombattantDeclarant2: true }));
    expect(result.majorations).toEqual([{
      type: 'ancien_combattant_couple',
      libelle: 'Ancien combattant +74 ans (case S)',
      parts: 0.5,
      plafondUnitaire: 1807,
      plafondComplementaire: 1801,
    }]);
    expect(result.nombreParts).toBe(2.5);
  });

  it('S ne se cumule pas avec P ou F : écartée avec motif', () => {
    const result = calculerPartsFiscales(couple({ ancienCombattantDeclarant2: true, invaliditeDeclarant1: true }));
    expect(result.majorations.map(m => m.type)).toEqual(['invalidite_declarant1']);
    expect(result.majorationsNonRetenues).toEqual([{
      type: 'ancien_combattant_couple',
      libelle: 'Ancien combattant +74 ans (case S)',
      motif: 'ne se cumule pas avec les cases P ou F',
    }]);
  });

  it('cases L, W veuf et G écartées en couple', () => {
    const result = calculerPartsFiscales(couple({ ancienParentIsole: true, veufAncienCombattant: true, veuveDeGuerre: true }));
    expect(result.majorations).toEqual([]);
    expect(result.majorationsNonRetenues.map(m => m.motif)).toEqual(Array(3).fill('réservée aux personnes seules'));
  });
});

describe('calculerPartsFiscales — personne seule : une seule demi-part P, L, W, G', () => {
  it('W veuf : +0,5, plafond 1807€ + complément 1801€', () => {
    const result = calculerPartsFiscales(makeInput({ situationFamille: 'veuf', veufAncienCombattant: true }));
    expect(result.majorations).toEqual([{
      type: 'veuf_ancien_combattant',
      libelle: "Veuf/veuve d'ancien combattant +74 ans (case W)",
      parts: 0.5,
      plafondUnitaire: 1807,
      plafondComplementaire: 1801,
    }]);
  });

  it('G seule : +0,5, plafond 1807€ + complément 1801€', () => {
    const result = calculerPartsFiscales(makeInput({ veuveDeGuerre: true }));
    expect(result.majorations).toEqual([{
      type: 'veuve_de_guerre',
      libelle: 'Veuve de guerre (case G)',
      parts: 0.5,
      plafondUnitaire: 1807,
      plafondComplementaire: 1801,
    }]);
  });

  it('P et L : seule P retenue (plus avantageuse), L écartée pour non-cumul', () => {
    const result = calculerPartsFiscales(makeInput({ invaliditeDeclarant1: true, ancienParentIsole: true }));
    expect(result.majorations.map(m => m.type)).toEqual(['invalidite_declarant1']);
    expect(result.majorationsNonRetenues).toEqual([{
      type: 'ancien_parent_isole',
      libelle: 'Ancien parent isolé, 5 ans seul (case L)',
      motif: 'une seule demi-part parmi les cases P, L, W et G pour une personne seule',
    }]);
    expect(result.nombreParts).toBe(1.5);
  });

  it('W et G : seule W retenue', () => {
    const result = calculerPartsFiscales(makeInput({ ancienCombattantDeclarant1: true, veuveDeGuerre: true }));
    expect(result.majorations.map(m => m.type)).toEqual(['ancien_combattant_declarant1']);
    expect(result.majorationsNonRetenues.map(m => m.type)).toEqual(['veuve_de_guerre']);
  });

  it('W et G exclues avec un enfant à charge ; P reste cumulable', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant()],
      ancienCombattantDeclarant1: true,
      veuveDeGuerre: true,
      invaliditeDeclarant1: true,
    }));
    expect(result.majorations.map(m => m.type)).toEqual(['enfant_rang_1', 'invalidite_declarant1']);
    expect(result.majorationsNonRetenues.map(m => m.motif)).toEqual([
      'exclue avec un enfant à charge ou rattaché',
      'exclue avec un enfant à charge ou rattaché',
    ]);
  });

  it('L exclue avec une personne invalide à charge', () => {
    const result = calculerPartsFiscales(makeInput({ ancienParentIsole: true, personnesInvalidesCharge: [{ anneeNaissance: 1950 }] }));
    expect(result.majorations.find(m => m.type === 'ancien_parent_isole')).toBeUndefined();
    expect(result.majorationsNonRetenues[0].motif).toBe('suppose de vivre seul sans personne à charge');
  });

  it('cases F et S du conjoint ignorées hors couple', () => {
    const result = calculerPartsFiscales(makeInput({ invaliditeDeclarant2: true, ancienCombattantDeclarant2: true }));
    expect(result.majorations).toEqual([]);
    expect(result.majorationsNonRetenues.map(m => m.motif)).toEqual(Array(2).fill('réservée aux couples mariés ou pacsés'));
  });
});

describe('calculerPartsFiscales — rang des enfants alternés après les personnes invalides', () => {
  it('1 enfant exclusif + 1 personne invalide + 1 enfant alterné : l\'alterné est au rang 3 (+0,5)', () => {
    const result = calculerPartsFiscales(makeInput({
      situationFamille: 'marie',
      enfantsCharge: [enfant({ residenceAlternee: true }), enfant()],
      personnesInvalidesCharge: [{ anneeNaissance: 1950 }],
    }));
    expect(result.majorations.find(m => m.libelle.includes('résidence alternée'))).toMatchObject({
      type: 'enfant_rang_3', parts: 0.5, plafondUnitaire: 1807,
    });
    // base 2 + exclusif 0,5 + alterné rang 3 0,5 + personne invalide 1
    expect(result.nombreParts).toBe(4);
  });

  it('le rang des enfants exclusifs ne dépend pas des personnes invalides', () => {
    const result = calculerPartsFiscales(makeInput({
      enfantsCharge: [enfant(), enfant()],
      personnesInvalidesCharge: [{ anneeNaissance: 1950 }],
    }));
    expect(result.majorations.filter(m => m.type.startsWith('enfant_rang')).map(m => m.parts)).toEqual([0.5, 0.5]);
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

    // Exemple brochure (3,75 parts) + invalidité déclarant 1 : base 2 + 2 exclusifs 0,5 + 0,5, puis
    // l'alterné décompté en dernier au rang 3 (0,5) + sa majoration invalidité 0,25 + 0,5
    expect(result.partsBase).toBe(2);
    expect(result.nombreParts).toBe(2 + 0.5 + 0.5 + 0.5 + 0.25 + 0.5);
  });
});
