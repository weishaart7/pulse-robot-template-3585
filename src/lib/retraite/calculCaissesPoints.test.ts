import { describe, it, expect } from 'vitest';
import {
  caisseDuRegime,
  caissesDuLiberal,
  pointsAnnuelsCaisse,
  coefficientAgeCaisse,
  calculerCaissesPoints,
  reversionCaissesPoints,
  abattementParTrimestres,
  EntreeCaissesPoints,
  majorationEnfantsPct,
  tauxDecoteAge,
} from './calculCaissesPoints';
import { MILLESIME_COURANT, PARAMETRES_CAISSES_POINTS } from './parametres';

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
      { nom: 'RAAP', type: 'points', points: 100, valeurPoint: 0.5 },
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
    expect(r.regimesNonReconnus.map((x) => x.nom)).toEqual(['RAAP']);
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

describe('CAVEC 2026', () => {
  const { cavec } = PARAMETRES_CAISSES_POINTS;
  const base: EntreeCaissesPoints = {
    regimesPoints: [{ nom: 'CAVEC', type: 'points', points: 20000 }],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2035, 3, 1)), // 65 ans
    nombreEnfantsEligibles: 3,
    caisseLiberale: null,
    conventionne: false,
    revenuAnnuel: null,
    trimestresProjetes: 0,
    trimestresManquants: 0,
  };

  it('classe selon le revenu : 50 000 € → classe D, 498 points ; au-delà de 181 208 € → 1 841', () => {
    expect(pointsAnnuelsCaisse(cavec, 50000)).toBe(498);
    expect(pointsAnnuelsCaisse(cavec, 14919)).toBe(54);
    expect(pointsAnnuelsCaisse(cavec, 250000)).toBe(1841);
  });
  it('taux plein à 65 ans, sans majoration pour enfants', () => {
    const r = calculerCaissesPoints(base);
    expect(r.details[0].coefficientAge).toBe(1);
    expect(r.total).toBeCloseTo(20000 * 1.385, 6);
  });
  it('départ à 64 ans : minoration de 4 trimestres (−5 %)', () => {
    const r = calculerCaissesPoints({ ...base, dateEffet: new Date(Date.UTC(2034, 3, 1)) });
    expect(r.details[0].coefficientAge).toBeCloseTo(0.95, 10);
  });
  it('surcote après 65 ans : 1,25 %/trimestre, 20 trimestres au plus', () => {
    expect(calculerCaissesPoints({ ...base, dateEffet: new Date(Date.UTC(2036, 3, 1)) }).details[0].coefficientAge).toBeCloseTo(1.05, 10);
    expect(calculerCaissesPoints({ ...base, dateEffet: new Date(Date.UTC(2042, 3, 1)) }).details[0].coefficientAge).toBeCloseTo(1.25, 10);
  });
  it('moins de 500 points : versement unique de 15 annuités, pas de rente ni de réversion', () => {
    const r = calculerCaissesPoints({ ...base, regimesPoints: [{ nom: 'CAVEC', type: 'points', points: 400 }] });
    expect(r.details[0].pensionAnnuelle).toBe(0);
    expect(r.details[0].capital).toBeCloseTo(400 * 1.385 * 15, 6);
    expect(r.total).toBe(0);
    expect(reversionCaissesPoints(r.details)).toBe(0);
  });
});

describe('CNBF 2026', () => {
  const { cnbf } = PARAMETRES_CAISSES_POINTS;
  it('complémentaire : taux de la classe sur 5 tranches ÷ 12,5229 €', () => {
    const cotisationC1 = 42507 * 0.07 + (60000 - 42507) * 0.104;
    expect(pointsAnnuelsCaisse(cnbf, 60000, 'C1')).toBeCloseTo(cotisationC1 / 12.5229, 6);
    const cotisationC2 = 42507 * 0.07 + (60000 - 42507) * 0.116;
    expect(pointsAnnuelsCaisse(cnbf, 60000, 'C2')).toBeCloseTo(cotisationC2 / 12.5229, 6);
  });
  it('classe inconnue : C1 ; rien au-delà de 212 535 €', () => {
    expect(pointsAnnuelsCaisse(cnbf, 60000, null)).toBeCloseTo(pointsAnnuelsCaisse(cnbf, 60000, 'C1'), 10);
    expect(pointsAnnuelsCaisse(cnbf, 400000, 'C2+')).toBeCloseTo(pointsAnnuelsCaisse(cnbf, 212535, 'C2+'), 10);
  });
  it('avocat : complémentaire projetée et valorisée à 1,0262 €', () => {
    const r = calculerCaissesPoints({
      regimesPoints: [{ nom: 'CNBF', type: 'points', points: 10000 }],
      dateNaissance: { annee: 1970, mois: 3 },
      dateEffet: new Date(Date.UTC(2034, 3, 1)),
      nombreEnfantsEligibles: 0,
      caisseLiberale: 'CNBF',
      conventionne: false,
      revenuAnnuel: 60000,
      trimestresProjetes: 40,
      trimestresManquants: 0,
      classe: 'C1',
    });
    expect(r.details[0].pointsProjetes).toBeCloseTo(10 * pointsAnnuelsCaisse(cnbf, 60000, 'C1'), 6);
    expect(r.total).toBeCloseTo((10000 + r.details[0].pointsProjetes) * 1.0262, 6);
  });
});

describe('RCI 2026', () => {
  const { rci } = PARAMETRES_CAISSES_POINTS;
  const bareme = rci.abattementTrimestres!;
  const base: EntreeCaissesPoints = {
    regimesPoints: [{ nom: 'RCI', type: 'points', points: 5000 }],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2034, 3, 1)), // 64 ans
    nombreEnfantsEligibles: 3,
    caisseLiberale: null,
    conventionne: false,
    revenuAnnuel: null,
    trimestresProjetes: 0,
    trimestresManquants: 0,
  };

  it('reconnue au libellé du RIS (RCI, anciens RCO)', () => {
    expect(caisseDuRegime('RCI')).toBe('rci');
    expect(caisseDuRegime('Retraite complémentaire des indépendants')).toBe('rci');
    expect(caisseDuRegime('RCO artisans')).toBe('rci');
  });
  it('points : 8,1 % jusqu’au PASS, 9,1 % de 1 à 4 PASS ÷ 21,726 €', () => {
    expect(pointsAnnuelsCaisse(rci, 50000)).toBeCloseTo((48060 * 0.081 + 1940 * 0.091) / 21.726, 6);
    expect(pointsAnnuelsCaisse(rci, 10 * 48060)).toBeCloseTo((48060 * 0.081 + 3 * 48060 * 0.091) / 21.726, 6);
  });
  it('taux plein : 5 000 × 1,347 €, sans majoration pour enfants', () => {
    expect(calculerCaissesPoints(base).total).toBeCloseTo(5000 * 1.347, 6);
  });
  it('abattement : 1 %/trimestre jusqu’à 12, puis 1,25 %, 22 % au plus (grille Fidroit)', () => {
    expect(abattementParTrimestres(bareme, 3, 60)).toBeCloseTo(0.03, 10);
    expect(abattementParTrimestres(bareme, 12, 60)).toBeCloseTo(0.12, 10);
    expect(abattementParTrimestres(bareme, 13, 60)).toBeCloseTo(0.1325, 10);
    expect(abattementParTrimestres(bareme, 30, 60)).toBeCloseTo(0.22, 10);
  });
  it('trimestres retenus bornés par l’âge de 67 ans (64 ans : 12 au plus)', () => {
    expect(abattementParTrimestres(bareme, 20, 64)).toBeCloseTo(0.12, 10);
    expect(abattementParTrimestres(bareme, 20, 67)).toBe(0);
    expect(abattementParTrimestres(bareme, 0, 62)).toBe(0);
  });
  it('appliqué à la pension : 4 trimestres manquants à 64 ans → −4 %', () => {
    const r = calculerCaissesPoints({ ...base, trimestresManquants: 4 });
    expect(r.details[0].coefficientAge).toBeCloseTo(0.96, 10);
  });
  it('indépendant : points RCI projetés sur le revenu futur', () => {
    const r = calculerCaissesPoints({ ...base, caisseLiberale: 'RCI', revenuAnnuel: 50000, trimestresProjetes: 40 });
    expect(r.details[0].pointsProjetes).toBeCloseTo(10 * pointsAnnuelsCaisse(rci, 50000), 6);
  });
});

describe('Ircantec (contractuels publics)', () => {
  const { ircantec } = PARAMETRES_CAISSES_POINTS;
  const pass = MILLESIME_COURANT.pass;
  const base: EntreeCaissesPoints = {
    regimesPoints: [{ nom: 'IRCANTEC', type: 'points', points: 2000, valeurPoint: 0.5 }],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2034, 3, 1)), // 64 ans
    nombreEnfantsEligibles: 0,
    caisseLiberale: null,
    conventionne: false,
    revenuAnnuel: null,
    trimestresProjetes: 0,
    trimestresManquants: 0,
  };

  it('reconnue au RIS, valeur du point 2026', () => {
    expect(caisseDuRegime('Ircantec')).toBe('ircantec');
    const r = calculerCaissesPoints(base);
    expect(r.regimesNonReconnus).toHaveLength(0);
    expect(r.total).toBeCloseTo(2000 * 0.56053, 6);
  });
  it('points : 5,60 % jusqu’au PASS, 15,60 % de 1 à 8 PASS ÷ salaire de référence', () => {
    expect(pointsAnnuelsCaisse(ircantec, 50000)).toBeCloseTo((pass * 0.056 + (50000 - pass) * 0.156) / 5.787, 6);
    expect(pointsAnnuelsCaisse(ircantec, 20 * pass)).toBeCloseTo((pass * 0.056 + 7 * pass * 0.156) / 5.787, 6);
    // Exemple Fidroit 2025 (PASS 47 100 €, salaire de référence 5,735 €) : 539 points.
    expect(Math.round((47100 * 0.056 + 2900 * 0.156) / 5.735)).toBe(539);
  });
  it('minoration Agirc-Arrco seulement si la base est minorée, la plus favorable', () => {
    expect(calculerCaissesPoints(base).details[0].coefficientAge).toBe(1);
    // 64 ans, 4 trimestres manquants : âge 0,88, trimestres 0,96 → 0,96.
    expect(calculerCaissesPoints({ ...base, trimestresManquants: 4 }).details[0].coefficientAge).toBeCloseTo(0.96, 6);
    // Plus de 20 trimestres manquants : grille par âge seule.
    expect(calculerCaissesPoints({ ...base, trimestresManquants: 30 }).details[0].coefficientAge).toBeCloseTo(0.88, 6);
  });
  it('surcote plafonnée aux trimestres en excédent, puis 0,75 % après 67 ans', () => {
    expect(coefficientAgeCaisse(ircantec, 66, 64, 3)).toBeCloseTo(1 + 3 * 0.00625, 6);
    expect(coefficientAgeCaisse(ircantec, 66, 64, 40)).toBeCloseTo(1 + 8 * 0.00625, 6);
    expect(coefficientAgeCaisse(ircantec, 68, 64, 40)).toBeCloseTo(1 + 12 * 0.00625 + 4 * 0.0075, 6);
    expect(coefficientAgeCaisse(ircantec, 68, 64, 0)).toBeCloseTo(1 + 4 * 0.0075, 6);
  });
  it('majoration enfants : 10 % à 3, +5 % par enfant, 30 % au plus', () => {
    expect(majorationEnfantsPct(ircantec, 2)).toBe(0);
    expect(majorationEnfantsPct(ircantec, 4)).toBe(15);
    expect(majorationEnfantsPct(ircantec, 9)).toBe(30);
    const r = calculerCaissesPoints({ ...base, nombreEnfantsEligibles: 4 });
    expect(r.details[0].majorationEnfants).toBeCloseTo(2000 * 0.56053 * 0.15, 6);
  });
  it('sous 300 points : capital = points × salaire de référence, hors rente', () => {
    const r = calculerCaissesPoints({ ...base, regimesPoints: [{ nom: 'IRCANTEC', type: 'points', points: 250 }] });
    expect(r.details[0].pensionAnnuelle).toBe(0);
    expect(r.details[0].capital).toBeCloseTo(250 * 5.787, 6);
  });
  it('contractuel : points projetés sur le revenu futur, réversion 50 %', () => {
    const r = calculerCaissesPoints({ ...base, caisseLiberale: 'IRCANTEC', revenuAnnuel: 40000, trimestresProjetes: 40 });
    expect(r.details[0].pointsProjetes).toBeCloseTo(10 * pointsAnnuelsCaisse(ircantec, 40000), 6);
    expect(reversionCaissesPoints(r.details)).toBeCloseTo(r.total * 0.5, 6);
  });
});

describe('CARPIMKO (auxiliaires médicaux) et ASV', () => {
  const { carpimko, carpimkoAsv } = PARAMETRES_CAISSES_POINTS;
  const pass = MILLESIME_COURANT.pass;
  const base: EntreeCaissesPoints = {
    regimesPoints: [],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2037, 3, 1)), // 67 ans
    nombreEnfantsEligibles: 0,
    caisseLiberale: 'CARPIMKO',
    conventionne: false,
    revenuAnnuel: 60000,
    trimestresProjetes: 40,
    trimestresManquants: 0,
  };

  it('reconnaissance au RIS : complémentaire et ASV distinguées, pas confondues avec la CARMF', () => {
    expect(caisseDuRegime('CARPIMKO')).toBe('carpimko');
    expect(caisseDuRegime('CARPIMKO - ASV')).toBe('carpimkoAsv');
    expect(caisseDuRegime('CARMF - ASV')).toBe('carmfAsv');
  });
  it('points 2026 : 8,70 % du revenu ramené entre 0,5 et 3 PASS ÷ 391 €', () => {
    expect(pointsAnnuelsCaisse(carpimko, 0)).toBeCloseTo((0.5 * pass * 0.087) / 391, 6);
    expect(pointsAnnuelsCaisse(carpimko, 60000)).toBeCloseTo((60000 * 0.087) / 391, 6);
    expect(pointsAnnuelsCaisse(carpimko, 10 * pass)).toBeCloseTo((3 * pass * 0.087) / 391, 6);
  });
  it('ASV : 24,5 points + 0,40 % du revenu (5 PASS) ÷ 27,43 €', () => {
    expect(pointsAnnuelsCaisse(carpimkoAsv, 50000)).toBeCloseTo(24.5 + (50000 * 0.004) / 27.43, 6);
    expect(pointsAnnuelsCaisse(carpimkoAsv, 10 * pass)).toBeCloseTo(24.5 + (5 * pass * 0.004) / 27.43, 6);
  });
  it('ASV ajoutée seulement si conventionné', () => {
    expect(caissesDuLiberal('CARPIMKO', false)).toEqual(['carpimko']);
    expect(caissesDuLiberal('CARPIMKO', true)).toEqual(['carpimko', 'carpimkoAsv']);
  });
  it('surcote 1,25 % par trimestre au-delà de la durée, 20 trimestres au plus', () => {
    expect(coefficientAgeCaisse(carpimko, 66, 64, 4)).toBeCloseTo(1.05, 6);
    expect(coefficientAgeCaisse(carpimko, 70, 64, 40)).toBeCloseTo(1.25, 6);
  });
  it('réversion 60 % (complémentaire) et 50 % (ASV)', () => {
    const r = calculerCaissesPoints({ ...base, conventionne: true });
    const [c, a] = r.details;
    expect(reversionCaissesPoints(r.details)).toBeCloseTo(c.pensionAnnuelle * 0.6 + a.pensionAnnuelle * 0.5, 6);
  });
});

describe('CARCDSF (chirurgiens-dentistes et sages-femmes)', () => {
  const { carcdsf, carcdsfPcvCd, carcdsfPcvSf } = PARAMETRES_CAISSES_POINTS;
  const pass = MILLESIME_COURANT.pass;
  const base: EntreeCaissesPoints = {
    regimesPoints: [],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2037, 3, 1)), // 67 ans
    nombreEnfantsEligibles: 0,
    caisseLiberale: 'CARCDSF_CD',
    conventionne: true,
    revenuAnnuel: 100000,
    trimestresProjetes: 4,
    trimestresManquants: 0,
  };

  it('complémentaire : 6 points + 11,35 % du revenu entre 0,65 et 5 PASS ÷ 535,10 €', () => {
    expect(pointsAnnuelsCaisse(carcdsf, 20000)).toBeCloseTo(6, 6);
    expect(pointsAnnuelsCaisse(carcdsf, 100000)).toBeCloseTo(6 + ((100000 - 0.65 * pass) * 0.1135) / 535.1, 6);
    expect(pointsAnnuelsCaisse(carcdsf, 10 * pass)).toBeCloseTo(6 + (4.35 * pass * 0.1135) / 535.1, 6);
  });
  it('PCV dentiste : 10 points + 1,93 au prorata de 5 PASS ; sage-femme : 18 points', () => {
    expect(pointsAnnuelsCaisse(carcdsfPcvCd, 5 * pass)).toBeCloseTo(11.93, 2);
    expect(pointsAnnuelsCaisse(carcdsfPcvCd, 10 * pass)).toBeCloseTo(11.93, 6);
    expect(pointsAnnuelsCaisse(carcdsfPcvSf, 30000)).toBe(18);
  });
  it('profession déclarée : complémentaire commune, PCV propre', () => {
    expect(caissesDuLiberal('CARCDSF_CD', true)).toEqual(['carcdsf', 'carcdsfPcvCd']);
    expect(caissesDuLiberal('CARCDSF_SF', true)).toEqual(['carcdsf', 'carcdsfPcvSf']);
    expect(caissesDuLiberal('CARCDSF_SF', false)).toEqual(['carcdsf']);
  });
  it('points PCV du RIS attribués à la PCV de la profession déclarée (dentiste par défaut)', () => {
    expect(caisseDuRegime('CARCDSF')).toBe('carcdsf');
    expect(caisseDuRegime('CARCDSF - PCV')).toBe('carcdsfPcvCd');
    expect(caisseDuRegime('CARCDSF - PCV', 'CARCDSF_SF')).toBe('carcdsfPcvSf');
  });
  it('minoration 1,25 % par trimestre avant 67 ans ; PCV dentiste plafonnée à 15 %', () => {
    const a62 = { ...base, dateEffet: new Date(Date.UTC(2032, 3, 1)) }; // 62 ans, 20 trimestres
    const r = calculerCaissesPoints(a62);
    expect(r.details.find((d) => d.id === 'carcdsf')!.coefficientAge).toBeCloseTo(0.75, 6);
    expect(r.details.find((d) => d.id === 'carcdsfPcvCd')!.coefficientAge).toBeCloseTo(0.85, 6);
  });
  it('PCV sage-femme : plus favorable entre âge et durée, 15 % au plus', () => {
    const r = calculerCaissesPoints({
      ...base,
      caisseLiberale: 'CARCDSF_SF',
      dateEffet: new Date(Date.UTC(2034, 3, 1)), // 64 ans, 12 trimestres avant 67
      trimestresManquants: 2,
    });
    expect(r.details.find((d) => d.id === 'carcdsfPcvSf')!.coefficientAge).toBeCloseTo(1 - 2 * 0.0125, 6);
  });
  it('surcote 1,25 % par trimestre après 67 ans, 25 % au plus ; +10 % pour 3 enfants', () => {
    expect(coefficientAgeCaisse(carcdsf, 68, 64)).toBeCloseTo(1.05, 6);
    expect(coefficientAgeCaisse(carcdsf, 75, 64)).toBeCloseTo(1.25, 6);
    const r = calculerCaissesPoints({ ...base, nombreEnfantsEligibles: 3 });
    const c = r.details.find((d) => d.id === 'carcdsf')!;
    expect(c.majorationEnfants).toBeCloseTo((c.pensionAnnuelle * 10) / 110, 6);
    expect(r.details.find((d) => d.id === 'carcdsfPcvSf')).toBeUndefined();
  });
});

describe('CAVP (pharmaciens)', () => {
  const { cavp, cavpPcv } = PARAMETRES_CAISSES_POINTS;
  const base: EntreeCaissesPoints = {
    regimesPoints: [{ nom: 'CAVP', type: 'points', points: 20 }],
    dateNaissance: { annee: 1970, mois: 3 },
    dateEffet: new Date(Date.UTC(2037, 3, 1)), // 67 ans
    nombreEnfantsEligibles: 0,
    caisseLiberale: 'CAVP',
    conventionne: false,
    revenuAnnuel: 90000,
    trimestresProjetes: 40,
    trimestresManquants: 0,
    trimestresRequis: 172,
  };
  const repartition = (r: ReturnType<typeof calculerCaissesPoints>) => r.details.find((d) => d.id === 'cavp')!;

  it('reconnaissance au RIS : répartition et PCV distinguées', () => {
    expect(caisseDuRegime('CAVP')).toBe('cavp');
    expect(caisseDuRegime('CAVP - PCV biologistes')).toBe('cavpPcv');
    expect(caisseDuRegime('CARCDSF - PCV')).toBe('carcdsfPcvCd');
  });
  it('1 annuité par année cotisée × 328,80 €, quel que soit le revenu', () => {
    expect(pointsAnnuelsCaisse(cavp, 30000)).toBe(1);
    expect(pointsAnnuelsCaisse(cavp, 300000)).toBe(1);
    const d = repartition(calculerCaissesPoints(base));
    expect(d.pointsProjetes).toBe(10);
    expect(d.pensionAnnuelle).toBeCloseTo(30 * 328.8, 6);
  });
  it('annuités plafonnées à la retraite entière (durée requise ÷ 4)', () => {
    const d = repartition(calculerCaissesPoints({ ...base, regimesPoints: [{ nom: 'CAVP', type: 'points', points: 40 }] }));
    expect(d.pointsProjetes).toBe(3);
    expect(d.pointsAcquis + d.pointsProjetes).toBe(43);
  });
  it('minoration : 1,25 % par trimestre avant 65 ans, 0,5 % de 65 à 67 ans', () => {
    expect(tauxDecoteAge(cavp.decoteAge!, 64)).toBeCloseTo(4 * 0.0125 + 8 * 0.005, 6);
    expect(tauxDecoteAge(cavp.decoteAge!, 66)).toBeCloseTo(4 * 0.005, 6);
    expect(tauxDecoteAge(cavp.decoteAge!, 67)).toBe(0);
  });
  it('surcote 0,5 % par trimestre de 67 à 70 ans', () => {
    expect(coefficientAgeCaisse(cavp, 68, 64)).toBeCloseTo(1.02, 6);
    expect(coefficientAgeCaisse(cavp, 72, 64)).toBeCloseTo(1.06, 6);
  });
  it('PCV des biologistes conventionnés : 262 points + 50 au prorata de 5 PASS', () => {
    const pass = MILLESIME_COURANT.pass;
    expect(pointsAnnuelsCaisse(cavpPcv, 5 * pass)).toBeCloseTo(312, 0);
    expect(pointsAnnuelsCaisse(cavpPcv, 0)).toBe(262);
    expect(caissesDuLiberal('CAVP', true)).toEqual(['cavp', 'cavpPcv']);
    expect(tauxDecoteAge(cavpPcv.decoteAge!, 60)).toBeCloseTo(20 * 0.0125, 6);
  });
  it('capitalisation : rente estimée ajoutée, sans réversion', () => {
    const r = calculerCaissesPoints({ ...base, capitalCAVP: 100000 });
    const c = r.details.find((d) => d.id === 'cavpCapitalisation')!;
    expect(c.pensionAnnuelle).toBeGreaterThan(0);
    expect(c.tauxReversion).toBe(0);
    expect(r.total).toBeCloseTo(repartition(r).pensionAnnuelle + c.pensionAnnuelle, 6);
  });
});
