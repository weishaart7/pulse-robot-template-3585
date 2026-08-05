import { describe, it, expect } from 'vitest';
import { getPartSuccessorale, getPartConjointSuccession, BienNonQualifieError } from './succession';
import { getPartUtilisateurIndivisionTiers } from './utils';

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

  it("'Indivision' en saisie partielle → la part manquante est le complément à 100%, pas un second défaut de 50%", () => {
    const asset = { qualification_bien: 'Indivision', pourcentage_utilisateur: 30 };

    expect(getPartSuccessorale(asset)).toBeCloseTo(0.3);
    expect(getPartConjointSuccession(asset)).toBeCloseTo(0.7);
    expect(getPartSuccessorale(asset) + getPartConjointSuccession(asset)).toBeCloseTo(1);
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

  it("Indivision avec un tiers (P14) : la part utilisateur vient de asset_indivisaires, pas d'un 50/50 figé — Maison de famille 300 000 €, utilisateur 70% / sœur 30%", () => {
    const pourcentageUtilisateur = getPartUtilisateurIndivisionTiers([{ pourcentage: 30 }]);
    expect(pourcentageUtilisateur).toBe(70);

    const asset = { qualification_bien: 'Indivision', pourcentage_utilisateur: pourcentageUtilisateur, pourcentage_conjoint: 0 };
    const part = getPartSuccessorale(asset);

    expect(part).toBeCloseTo(0.7);
    expect(part * 300_000).toBeCloseTo(210_000);
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
