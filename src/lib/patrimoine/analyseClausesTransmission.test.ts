import { describe, it, expect } from 'vitest';
import {
  getFractionExclueSuccession,
  computeValeurExclueClause,
  ClauseAssetInput,
} from './analyseClausesTransmission';

const bienCommun = (id: string, valeur: number, nature = 'Résidence principale'): ClauseAssetInput => ({
  id,
  nature,
  valeur_estimee: valeur,
  qualification_bien: 'Bien commun',
});

describe('getFractionExclueSuccession', () => {
  it('exclut la totalité du bien en pleine propriété', () => {
    expect(getFractionExclueSuccession('pleine_propriete', 0.6)).toBe(1);
  });

  it("n'exclut que l'usufruit en modalité usufruit (barème art. 669 CGI)", () => {
    // Conjoint de 65 ans : nue-propriété 60 %, usufruit 40 %.
    expect(getFractionExclueSuccession('usufruit', 0.6)).toBeCloseTo(0.4);
  });

  it('exclut 0 en usufruit si la date de naissance du conjoint est inconnue', () => {
    expect(getFractionExclueSuccession('usufruit', null)).toBe(0);
  });
});

describe('computeValeurExclueClause', () => {
  const assets = [bienCommun('a', 300000), bienCommun('b', 200000)];

  it('somme la valeur brute des biens désignés en pleine propriété', () => {
    expect(computeValeurExclueClause(assets, ['a', 'b'], 'pleine_propriete', 0.6)).toBe(500000);
  });

  it("ne retient que la valeur de l'usufruit en modalité usufruit", () => {
    // Régression : la valeur brute (300 000 €) était annoncée exclue alors que
    // la nue-propriété (60 %) reste dans la succession.
    expect(computeValeurExclueClause(assets, ['a'], 'usufruit', 0.6)).toBeCloseTo(120000);
  });

  it('renvoie 0 en usufruit sans date de naissance du conjoint', () => {
    expect(computeValeurExclueClause(assets, ['a'], 'usufruit', null)).toBe(0);
  });

  it("renvoie 0 si aucune modalité n'est cochée", () => {
    expect(computeValeurExclueClause(assets, ['a'], null, 0.6)).toBe(0);
  });

  it('ignore les biens qui ne sont pas des biens communs', () => {
    const mixte: ClauseAssetInput[] = [
      bienCommun('a', 300000),
      { id: 'b', nature: 'Résidence secondaire', valeur_estimee: 200000, qualification_bien: 'Bien propre' },
      { id: 'c', nature: 'Résidence secondaire', valeur_estimee: 100000, qualification_bien: 'Indivision' },
    ];
    expect(computeValeurExclueClause(mixte, ['a', 'b', 'c'], 'pleine_propriete', 0.6)).toBe(300000);
  });

  it("écarte les actifs d'épargne et d'assurance-vie, comme le calcul de transmission", () => {
    const avecEpargne = [...assets, bienCommun('c', 150000, "Contrat d'assurance-vie")];
    expect(computeValeurExclueClause(avecEpargne, ['a', 'b', 'c'], 'pleine_propriete', 0.6)).toBe(500000);
  });

  it('renvoie 0 sans bien désigné', () => {
    expect(computeValeurExclueClause(assets, [], 'pleine_propriete', 0.6)).toBe(0);
  });
});
