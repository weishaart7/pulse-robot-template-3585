import { describe, it, expect } from 'vitest';
import { BAREME_669_CGI, computeAge } from './bareme669CGI';
import { DEFAULT_DMTG_PARAMS } from '../dmtg';

describe('BAREME_669_CGI vs demembrementViager (params-dmtg.json) — cohérence croisée', () => {
  // Bornes de chaque tranche + un âge interne, sur la plage d'âges réaliste
  // (0-130). Au-delà, BAREME_669_CGI utilise Infinity et demembrementViager
  // s'arrête à 999 : les deux représentent "dernière tranche" mais ne sont
  // pas comparables terme à terme hors de toute plage réaliste — non testé.
  const agesToCheck = [
    0, 10, 20, 21, 25, 30, 31, 35, 40, 41, 45, 50, 51, 55,
    60, 61, 65, 70, 71, 75, 80, 81, 85, 90, 91, 95, 100, 110, 130
  ];

  it.each(agesToCheck)('âge %i : usufruit/nue-propriété identiques dans les deux sources', (age) => {
    const trancheBareme = BAREME_669_CGI.find((t) => age < t.ageMax)
      ?? BAREME_669_CGI[BAREME_669_CGI.length - 1];

    const trancheDmtg = DEFAULT_DMTG_PARAMS.demembrementViager.find(
      (e) => age >= e.minAge && age <= e.maxAge
    );

    expect(trancheDmtg).toBeDefined();
    expect(trancheBareme.usufruit).toBeCloseTo(trancheDmtg!.usufruitPct, 10);
    expect(trancheBareme.nuePropriete).toBeCloseTo(trancheDmtg!.nuePropPct, 10);
  });

  it('les deux tables ont le même nombre de tranches', () => {
    expect(BAREME_669_CGI.length).toBe(DEFAULT_DMTG_PARAMS.demembrementViager.length);
  });
});

describe('computeAge — date de référence paramétrable', () => {
  it("calcule un âge différent à une date de référence passée qu'à aujourd'hui pour la même date de naissance", () => {
    const dateNaissance = '1990-06-15';
    const ageAujourdHui = computeAge(dateNaissance);
    const ageEnDix2010 = computeAge(dateNaissance, new Date('2010-06-14'));

    expect(ageEnDix2010).toBe(19);
    expect(ageEnDix2010).not.toBe(ageAujourdHui);
  });
});
