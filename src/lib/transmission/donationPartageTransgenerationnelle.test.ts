/**
 * Donation-partage transgénérationnelle (art. 1078-8, référentiel §8.6.2) —
 * couverture de bout en bout via computeTransmission, pas seulement de
 * l'imputation isolée (cf. reserve.test.ts). L'imputation sur la réserve du
 * parent (reserve.ts::imputeLiberalites) ne suffit pas à elle seule : sans
 * branchement de generationIntermediaireId dans index.ts::liberalitesMaintenues,
 * la valeur de la donation n'était créditée nulle part (ni au parent, dont le
 * personId ne correspond pas à beneficiaireId, ni au petit-enfant, absent de
 * `heirs`) — sur-créditant la souche du parent du montant total de la donation.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams } from './index';
import { Liberalite } from './types';
import transmissionParamsData from '../../data/transmission-params.json';

function buildParams(): TransmissionParams {
  return {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I
  };
}

// Défunt sans conjoint, 2 enfants (enfant1, enfant2). enfant1 a un enfant
// (petit-enfant1) : simple lien de filiation, sans conséquence sur la
// dévolution légale tant qu'enfant1 est vivant (pas de représentation).
const family: FamilyGraph = {
  persons: [
    { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
    { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' },
    { id: 'enfant2', nom: 'Dupont', prenom: 'Alice', lienFamilial: 'Enfant' },
    { id: 'petit-enfant1', nom: 'Dupont', prenom: 'Noa', lienFamilial: 'Petit-enfant' }
  ],
  links: [
    { from: 'defunt', to: 'enfant1', relation: 'child' },
    { from: 'defunt', to: 'enfant2', relation: 'child' },
    { from: 'enfant1', to: 'petit-enfant1', relation: 'child' }
  ],
  marriages: [],
  decedentId: 'defunt',
  hasSurvivingSpouse: false,
  childrenOfDecedent: ['enfant1', 'enfant2'],
  childrenCommonWithSpouse: [],
  hasDDV: false
};

const patrimony: PatrimonySnapshot = { date: '2026-08-06', biensExistants: 300000, passifs: 0 };

describe('Branchement réel — donation-partage transgénérationnelle dans computeTransmission', () => {
  it("crédite la valeur de la donation au PARENT (generationIntermediaireId), pas nulle part : partFinale d'enfant1 reflète les 60 000 € déjà reçus par sa lignée", () => {
    const liberalites: Liberalite[] = [
      {
        id: 'don-transgen',
        type: 'donation',
        beneficiaireId: 'petit-enfant1',
        valeur: 60000,
        date: '2020-01-01',
        typeImputation: 'partage',
        generationIntermediaireId: 'enfant1'
      }
    ];

    const result = computeTransmission({
      family,
      patrimony,
      liberalites,
      params: buildParams(),
      referenceDate: '2026-08-06'
    });

    const enfant1 = result.heirs.find(h => h.personId === 'enfant1');
    const enfant2 = result.heirs.find(h => h.personId === 'enfant2');

    // Réserve enfants (2/3 de 360 000 masse de calcul) = 240 000, réserve
    // personnelle par enfant = 120 000 : la donation de 60 000 € reste sous
    // ce plafond, imputée intégralement sur la réserve d'enfant1, aucun
    // impact sur la QD ni réduction déclenchée.
    // partFinale attendue : enfant1 = part du résiduel (150 000) + valeur
    // déjà reçue par sa lignée (60 000) = 210 000 ; enfant2 = 150 000 (inchangé).
    expect(enfant1?.partFinale).toBeCloseTo(210000, 0);
    expect(enfant2?.partFinale).toBeCloseTo(150000, 0);

    // Aucun héritier n'est sur-crédité ou sous-crédité globalement : la somme
    // des partFinale doit correspondre à la masse de calcul totale (résiduel
    // 300 000 + donation 60 000), pas seulement au résiduel réel.
    const total = result.heirs.reduce((sum, h) => sum + h.partFinale, 0);
    expect(total).toBeCloseTo(360000, 0);
  });

  it("régression : sans generationIntermediaireId, la donation-partage à un petit-enfant reste traitée comme une donation ordinaire (art. 847) — imputée sur la QD, aucun impact sur partFinale des enfants", () => {
    const liberalites: Liberalite[] = [
      {
        id: 'don-ordinaire',
        type: 'donation',
        beneficiaireId: 'petit-enfant1',
        valeur: 60000,
        date: '2020-01-01',
        typeImputation: 'partage'
      }
    ];

    const result = computeTransmission({
      family,
      patrimony,
      liberalites,
      params: buildParams(),
      referenceDate: '2026-08-06'
    });

    const enfant1 = result.heirs.find(h => h.personId === 'enfant1');
    const enfant2 = result.heirs.find(h => h.personId === 'enfant2');

    // Sans generationIntermediaireId : ni enfant1 ni enfant2 ne sont crédités
    // de cette donation (le petit-enfant, non-héritier ici, n'apparaît pas
    // dans `heirs`) — comportement inchangé par ce correctif.
    expect(enfant1?.partFinale).toBeCloseTo(150000, 0);
    expect(enfant2?.partFinale).toBeCloseTo(150000, 0);
  });
});
