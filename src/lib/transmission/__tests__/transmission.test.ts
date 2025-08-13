import { computeTransmission } from '../index';
import { FamilyGraph, PatrimonySnapshot, Liberalite, TransmissionParams } from '../types';

// Test case: Conjoint + enfants communs (exemple 1)
describe('Transmission Engine Tests', () => {
  const baseParams: TransmissionParams = {
    abattements: {
      enfant: 100000,
      conjoint: Infinity,
      frere_soeur: 15932,
      neveu_niece: 7967,
      autre: 1594
    },
    bareme: [
      {
        lien: "enfant",
        tranches: [
          { seuil: 0, taux: 5 },
          { seuil: 8072, taux: 10 },
          { seuil: 12109, taux: 15 },
          { seuil: 15932, taux: 20 },
          { seuil: 552324, taux: 30 },
          { seuil: 902838, taux: 40 },
          { seuil: 1805677, taux: 45 }
        ]
      }
    ]
  };

  test('Conjoint + enfants communs option 1/4 PP', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Défunt', prenom: 'Jean', estDecede: true },
        { id: 'conjoint', nom: 'Conjoint', prenom: 'Marie' },
        { id: 'enfant1', nom: 'Enfant1', prenom: 'Pierre' },
        { id: 'enfant2', nom: 'Enfant2', prenom: 'Paul' }
      ],
      links: [
        { from: 'defunt', to: 'conjoint', relation: 'spouse' },
        { from: 'defunt', to: 'enfant1', relation: 'child' },
        { from: 'defunt', to: 'enfant2', relation: 'child' }
      ],
      marriages: [{ spouseA: 'defunt', spouseB: 'conjoint' }],
      decedentId: 'defunt',
      hasSurvivingSpouse: true,
      survivingSpouseId: 'conjoint',
      childrenOfDecedent: ['enfant1', 'enfant2'],
      childrenCommonWithSpouse: ['enfant1', 'enfant2']
    };

    const patrimony: PatrimonySnapshot = {
      date: '2025-01-01',
      biensExistants: 1200,
      passifs: 0
    };

    const liberalites: Liberalite[] = [
      { id: '1', type: 'donation', beneficiaireId: 'enfant1', valeur: 1000, date: '2020-01-01' },
      { id: '2', type: 'donation', beneficiaireId: 'enfant2', valeur: 1000, date: '2021-01-01' },
      { id: '3', type: 'donation', beneficiaireId: 'conjoint', valeur: 1000, date: '2022-01-01' }
    ];

    const result = computeTransmission({
      family,
      patrimony,
      liberalites,
      params: baseParams,
      conjointOption: 'quartPP'
    });

    // Masse calcul = 1200 + 3000 = 4200
    expect(result.masseCalcul).toBe(4200);
    
    // Droits théoriques conjoint = 1/4 × 4200 = 1050
    const conjointHeir = result.heirs.find(h => h.personId === 'conjoint');
    expect(conjointHeir?.partCivile).toBe(1050);
  });

  test('Fiscalité enfant héritant 1 200 000', () => {
    const family: FamilyGraph = {
      persons: [
        { id: 'defunt', nom: 'Défunt', prenom: 'Jean', estDecede: true },
        { id: 'enfant1', nom: 'Enfant1', prenom: 'Pierre' }
      ],
      links: [
        { from: 'defunt', to: 'enfant1', relation: 'child' }
      ],
      marriages: [],
      decedentId: 'defunt',
      hasSurvivingSpouse: false,
      childrenOfDecedent: ['enfant1'],
      childrenCommonWithSpouse: []
    };

    const patrimony: PatrimonySnapshot = {
      date: '2025-01-01',
      biensExistants: 1200000,
      passifs: 0
    };

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: baseParams
    });

    const enfantHeir = result.heirs.find(h => h.personId === 'enfant1');
    // Base = 1 200 000 - 100 000 = 1 100 000
    // Droits attendus = 292 673
    expect(enfantHeir?.baseFiscale).toBe(1200000);
    expect(enfantHeir?.droitsSuccession).toBeCloseTo(292673, -2);
  });
});