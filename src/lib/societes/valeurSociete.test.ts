import { describe, it, expect } from 'vitest';
import { calculerValeurSociete, doublonsProbables, estBienDeSociete, valeurSocieteRetenue } from './valeurSociete';

describe('calculerValeurSociete', () => {
  it('biens + trésorerie − emprunts − comptes courants', () => {
    const d = calculerValeurSociete({
      biens: [{ valeur_estimee: 400_000 }, { valeur_estimee: 100_000 }],
      emprunts: [{ capital_restant_du: 150_000 }],
      compteCourantAssocies: 50_000,
      tresorerie: 10_000,
    });
    expect(d.valeur).toBe(310_000);
  });
  it('jamais négative', () => {
    expect(calculerValeurSociete({ biens: [{ valeur_estimee: 100 }], emprunts: [{ capital_restant_du: 500 }] }).valeur).toBe(0);
  });
});

describe('valeurSocieteRetenue', () => {
  const d = calculerValeurSociete({ biens: [{ valeur_estimee: 200_000 }], emprunts: [] });
  it('calculée si auto et biens détenus', () => expect(valeurSocieteRetenue(50_000, true, d, 1)).toBe(200_000));
  it('saisie si manuelle', () => expect(valeurSocieteRetenue(50_000, false, d, 1)).toBe(50_000));
  it('saisie si aucun bien détenu', () => expect(valeurSocieteRetenue(50_000, true, d, 0)).toBe(50_000));
});

describe('estBienDeSociete', () => {
  it('détecte un bien détenu par une société', () => {
    expect(estBienDeSociete({ societe_proprietaire_id: 's1' })).toBe(true);
    expect(estBienDeSociete({ societe_proprietaire_id: null })).toBe(false);
  });
});

describe('doublonsProbables', () => {
  const sci = [{ nature: 'Immeubles locatifs (loués nus)', valeur_estimee: 300_000 }];
  it('même nature et valeur à ± 5 % : signalé', () => {
    expect(doublonsProbables([{ id: 'a', nature: 'Immeubles locatifs (loués nus)', valeur_estimee: 310_000 }], sci)).toHaveLength(1);
  });
  it('valeur trop éloignée ou autre nature : non signalé', () => {
    expect(doublonsProbables([
      { id: 'b', nature: 'Immeubles locatifs (loués nus)', valeur_estimee: 400_000 },
      { id: 'c', nature: 'Résidence principale', valeur_estimee: 300_000 },
    ], sci)).toHaveLength(0);
  });
});
