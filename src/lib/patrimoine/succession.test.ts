import { describe, it, expect } from 'vitest';
import { getPartSuccessorale, BienNonQualifieError } from './succession';

describe('getPartSuccessorale', () => {
  it("'À qualifier' bloque avec une erreur explicite dédiée (BienNonQualifieError), ne devine jamais", () => {
    expect(() => getPartSuccessorale({ qualification_bien: 'À qualifier' }, 'Bien test')).toThrow(
      /Bien non qualifié : Bien test/
    );
    try {
      getPartSuccessorale({ qualification_bien: 'À qualifier' }, 'Bien test');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BienNonQualifieError);
    }
  });

  it("'Bien commun' → 50%, quel que soit le détenteur", () => {
    expect(getPartSuccessorale({ qualification_bien: 'Bien commun' })).toBe(0.5);
    expect(getPartSuccessorale({ qualification_bien: 'Bien commun', detenteur: 'spouse' })).toBe(0.5);
  });

  it("'Indivision' → part réellement détenue par le défunt (pourcentage_utilisateur)", () => {
    expect(
      getPartSuccessorale({ qualification_bien: 'Indivision', pourcentage_utilisateur: 30, pourcentage_conjoint: 70 })
    ).toBeCloseTo(0.3);
  });

  it("'Indivision' sans pourcentage renseigné → défaut 50/50 (convention existante de lib/patrimoine/utils.ts)", () => {
    expect(getPartSuccessorale({ qualification_bien: 'Indivision' })).toBeCloseTo(0.5);
  });

  it("'Bien propre' détenu par le défunt (user) → 100%", () => {
    expect(getPartSuccessorale({ qualification_bien: 'Bien propre', detenteur: 'user' })).toBe(1);
  });

  it("'Bien propre' détenu par le conjoint (spouse) → 0%", () => {
    expect(getPartSuccessorale({ qualification_bien: 'Bien propre', detenteur: 'spouse' })).toBe(0);
  });

  it("'Bien personnel' (pas de conjoint) → 100%", () => {
    expect(getPartSuccessorale({ qualification_bien: 'Bien personnel' })).toBe(1);
  });

  it("qualification_bien absente/NULL (ex. bien créé via le chemin société, qui ne renseigne jamais ce champ) bloque avec BienNonQualifieError, comme 'À qualifier'", () => {
    expect(() => getPartSuccessorale({}, 'Bien sans qualification')).toThrow(
      /Bien non qualifié : Bien sans qualification/
    );
    expect(() => getPartSuccessorale({ qualification_bien: null })).toThrow(BienNonQualifieError);
    try {
      getPartSuccessorale({});
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BienNonQualifieError);
    }
  });
});
