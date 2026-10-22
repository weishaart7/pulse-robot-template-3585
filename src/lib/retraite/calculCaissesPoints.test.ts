import { describe, it, expect } from 'vitest';
import {
  caisseDuRegime,
  caissesDuLiberal,
  pointsAnnuelsCaisse,
  coefficientAgeCaisse,
  calculerCaissesPoints,
  reversionCaissesPoints,
  EntreeCaissesPoints,
} from './calculCaissesPoints';
import { PARAMETRES_CAISSES_POINTS } from './parametres';

const { carmf, carmfAsv, cipav } = PARAMETRES_CAISSES_POINTS;

describe('caisseDuRegime — reconnaissance au libellé du RIS', () => {
  it('CARMF complémentaire et ASV distinguées', () => {
    expect(caisseDuRegime('CARMF')).toBe('carmf');
    expect(caisseDuRegime('CARMF - ASV')).toBe('carmfAsv');
    expect(caisseDuRegime('Allocations supplémentaires de vieillesse')).toBe('carmfAsv');
    expect(caisseDuRegime('Agirc-Arrco')).toBeNull();
  });
  it('ASV seulement pour un médecin conventionné', () => {
    expect(caissesDuLiberal('CARMF', false)).toEqual(['carmf']);
    expect(caissesDuLiberal('CARMF', true)).toEqual(['carmf', 'carmfAsv']);
    expect(caissesDuLiberal(null, true)).toEqual([]);
  });
});

describe('pointsAnnuelsCaisse — CARMF 2026', () => {
  it('complémentaire : 1 point par tranche de 14 602 €, 11,52 au maximum', () => {
    expect(pointsAnnuelsCaisse(carmf, 90000)).toBeCloseTo(90000 / 14602, 6);
    expect(pointsAnnuelsCaisse(carmf, 300000)).toBe(11.52);
  });
  it('ASV : 27 points forfaitaires + 1 par tranche de 8 810 €, 9 au maximum', () => {
    expect(pointsAnnuelsCaisse(carmfAsv, 44050)).toBeCloseTo(27 + 5, 6);
    expect(pointsAnnuelsCaisse(carmfAsv, 200000)).toBe(36);
  });
});

describe('coefficientAgeCaisse — surcote CARMF', () => {
  it('âge légal 64 ans : 1 à 64 ans, +5 % à 65 ans', () => {
    expect(coefficientAgeCaisse(carmf, 64, 64)).toBe(1);
    expect(coefficientAgeCaisse(carmf, 65, 64)).toBeCloseTo(1.05, 10);
  });
  it('âge légal 62 ans : +15 % à 65 ans (lettre CARMF : 77,14 € → 88,71 €)', () => {
    expect(77.14 * coefficientAgeCaisse(carmf, 65, 62)).toBeCloseTo(88.71, 2);
  });
  it('après 65 ans : pension à 65 ans majorée de 0,75 %/trimestre, jusqu’à 70 ans', () => {
    expect(coefficientAgeCaisse(carmf, 66, 64)).toBeCloseTo(1.05 * 1.03, 10);
    expect(coefficientAgeCaisse(carmf, 72, 64)).toBeCloseTo(1.05 * 1.15, 10);
  });
  it('trimestres entiers seulement : 64 ans 2 mois → 1', () => {
    expect(coefficientAgeCaisse(carmf, 64 + 2 / 12, 64)).toBe(1);
  });
});

describe('calculerCaissesPoints', () => {
  const base: EntreeCaissesPoints = {
    regimesPoints: [
      { nom: 'CARMF', type: 'points', points: 200 },
      { nom: 'IRCANTEC', type: 'points', points: 100, valeurPoint: 0.5 },
    ],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2034, 3, 1)), // 64 ans, âge légal
    nombreEnfantsEligibles: 0,
    caisseLiberale: null,
    conventionne: false,
    revenuAnnuel: null,
    trimestresProjetes: 0,
    trimestresManquants: 0,
  };

  it('points du RIS × valeur 2026, régimes non reconnus renvoyés à l’appelant', () => {
    const r = calculerCaissesPoints(base);
    expect(r.details).toHaveLength(1);
    expect(r.total).toBeCloseTo(200 * 77.14, 6);
    expect(r.regimesNonReconnus.map((x) => x.nom)).toEqual(['IRCANTEC']);
  });
  it('libéral CARMF conventionné : points projetés et ASV ajoutée', () => {
    const r = calculerCaissesPoints({
      ...base,
      caisseLiberale: 'CARMF',
      conventionne: true,
      revenuAnnuel: 90000,
      trimestresProjetes: 40,
    });
    const rc = r.details.find((d) => d.id === 'carmf')!;
    const asv = r.details.find((d) => d.id === 'carmfAsv')!;
    expect(rc.pointsProjetes).toBeCloseTo(10 * (90000 / 14602), 6);
    expect(asv.pointsAcquis).toBe(0);
    expect(asv.pointsProjetes).toBeCloseTo(10 * (27 + 9), 6);
  });
  it('3 enfants : +10 %, réversion à 60 % hors majoration', () => {
    const r = calculerCaissesPoints({ ...base, nombreEnfantsEligibles: 3 });
    expect(r.total).toBeCloseTo(200 * 77.14 * 1.1, 6);
    expect(reversionCaissesPoints(r.details)).toBeCloseTo(200 * 77.14 * 0.6, 6);
  });
});

describe('CIPAV 2026', () => {
  const base: EntreeCaissesPoints = {
    regimesPoints: [{ nom: 'CIPAV', type: 'points', points: 6000 }],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2034, 3, 1)), // 64 ans
    nombreEnfantsEligibles: 0,
    caisseLiberale: null,
    conventionne: false,
    revenuAnnuel: null,
    trimestresProjetes: 0,
    trimestresManquants: 0,
  };

  it('reconnue au libellé du RIS', () => {
    expect(caisseDuRegime('CIPAV')).toBe('cipav');
  });
  it('exemple de la fiche CIPAV : 40 000 € → 3 600 € ÷ 47,40 € = 75,9 points', () => {
    expect(pointsAnnuelsCaisse(cipav, 40000)).toBeCloseTo(3600 / 47.4, 6);
  });
  it('tranche 2 à 22 % de 1 à 3 PASS, rien au-delà', () => {
    const pass = 48060;
    expect(pointsAnnuelsCaisse(cipav, 5 * pass)).toBeCloseTo((pass * 0.09 + 2 * pass * 0.22) / 47.4, 6);
  });
  it('exemple de la fiche CIPAV : 6 000 points × 2,89 € = 17 340 € à taux plein', () => {
    expect(calculerCaissesPoints(base).total).toBeCloseTo(17340, 6);
  });
  it('minoration de la base : 4 trimestres manquants à 64 ans → −5 %', () => {
    const r = calculerCaissesPoints({ ...base, trimestresManquants: 4 });
    expect(r.details[0].coefficientAge).toBeCloseTo(0.95, 10);
  });
  it('minoration plafonnée par l’âge : 20 trimestres manquants à 66 ans → −5 % (1 an avant 67 ans)', () => {
    const r = calculerCaissesPoints({ ...base, dateEffet: new Date(Date.UTC(2036, 3, 1)), trimestresManquants: 20 });
    expect(r.details[0].coefficientAge).toBeCloseTo(0.95, 10);
  });
});
