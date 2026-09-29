import { describe, it, expect } from 'vitest';
import {
  agesCarriereLongue,
  debutActiviteRempli,
  evaluerCarriereLongue,
  carriereLongueOuverteA,
} from './calculCarriereLongue';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';
import { indexTrimestreCivil } from './calcul';

// Carrière continue de 1987 à 2025 (4 trimestres cotisés par an).
const carriere = (maladie = 0): ResultatTrimestresCotisesEtAssimiles => {
  const parAnnee = Array.from({ length: 2025 - 1987 + 1 }, (_, i) => ({
    annee: 1987 + i,
    cotises: 4,
    assimiles: 0,
    revenuCotise: 30000,
  }));
  return {
    cotises: parAnnee.length * 4,
    assimiles: maladie,
    total: parAnnee.length * 4 + maladie,
    parAnnee,
    anneesSansBaremeConnu: [],
    assimilesParNature: { maternite: 0, maladie, chomageIndemnise: 0, chomageNonIndemnise: 0 },
  };
};

const aujourdHui = new Date(Date.UTC(2026, 8, 29)); // 29/09/2026
// Trimestres civils du trimestre en cours au trimestre précédant la date d'effet.
const projection = (dateEffet: Date) => indexTrimestreCivil(dateEffet) - indexTrimestreCivil(aujourdHui);

describe('agesCarriereLongue — annexe 2 de la circulaire Cnav 2026-29', () => {
  it('génération 1970 : 58 / 60 / 61 ans 9 mois / 63 ans', () => {
    expect(agesCarriereLongue({ annee: 1970, mois: 3 })).toEqual([
      { debutAvant: 16, ans: 58, mois: 0 },
      { debutAvant: 18, ans: 60, mois: 0 },
      { debutAvant: 20, ans: 61, mois: 9 },
      { debutAvant: 21, ans: 63, mois: 0 },
    ]);
  });
  it('décembre 1965 : 60 ans 8 mois (début avant 20 ans)', () => {
    expect(agesCarriereLongue({ annee: 1965, mois: 12 })).toEqual([{ debutAvant: 20, ans: 60, mois: 8 }]);
  });
  it('avant septembre 1963 : hors barème', () => {
    expect(agesCarriereLongue({ annee: 1962, mois: 5 })).toEqual([]);
  });
});

describe('debutActiviteRempli', () => {
  const c = carriere();
  it('5 trimestres à la fin de l\'année des 18 ans (début à 17 ans)', () => {
    expect(debutActiviteRempli({ annee: 1970, mois: 3 }, c.parAnnee, 18)).toBe(true);
    expect(debutActiviteRempli({ annee: 1970, mois: 3 }, c.parAnnee, 16)).toBe(false);
  });
  it('né au 4e trimestre : 4 trimestres suffisent', () => {
    const uneAnnee = [{ annee: 1988, cotises: 4, assimiles: 0, revenuCotise: 0 }];
    expect(debutActiviteRempli({ annee: 1970, mois: 11 }, uneAnnee, 18)).toBe(true);
    expect(debutActiviteRempli({ annee: 1970, mois: 3 }, uneAnnee, 18)).toBe(false);
  });
});

describe('evaluerCarriereLongue — scénario CL1 (docs/Golden_Scenarios_Retraite.md)', () => {
  it('début à 17 ans : 171 trimestres cotisés à 60 ans (< 172), départ anticipé ouvert à 61 ans 9 mois', () => {
    const r = evaluerCarriereLongue({
      dateNaissance: { annee: 1970, mois: 3 },
      trimestres: carriere(),
      trimestresAutresRegimes: 0,
      trimestresProjetesJusqua: projection,
      aujourdHui,
    });
    const a60 = r.options.find((o) => o.debutAvant === 18)!;
    expect(a60.dateEffet.toISOString().slice(0, 10)).toBe('2030-04-01');
    expect(a60.dureeCotisee).toBe(171);
    expect(a60.eligible).toBe(false);
    expect(r.premiereDateEligible?.toISOString().slice(0, 10)).toBe('2032-01-01');
    expect(carriereLongueOuverteA(r, new Date(Date.UTC(2031, 0, 1)))).toBe(false);
    expect(carriereLongueOuverteA(r, new Date(Date.UTC(2032, 0, 1)))).toBe(true);
  });

  it('2 trimestres maladie réputés cotisés : départ ouvert dès 60 ans', () => {
    const r = evaluerCarriereLongue({
      dateNaissance: { annee: 1970, mois: 3 },
      trimestres: carriere(2),
      trimestresAutresRegimes: 0,
      trimestresProjetesJusqua: projection,
      aujourdHui,
    });
    expect(r.premiereDateEligible?.toISOString().slice(0, 10)).toBe('2030-04-01');
  });

  it('plafond de 4 trimestres maladie réputés cotisés', () => {
    const avec4 = evaluerCarriereLongue({
      dateNaissance: { annee: 1970, mois: 3 },
      trimestres: carriere(4),
      trimestresAutresRegimes: 0,
      trimestresProjetesJusqua: () => 0,
      aujourdHui,
    });
    const avec10 = evaluerCarriereLongue({
      dateNaissance: { annee: 1970, mois: 3 },
      trimestres: carriere(10),
      trimestresAutresRegimes: 0,
      trimestresProjetesJusqua: () => 0,
      aujourdHui,
    });
    expect(avec10.options[1].dureeCotisee).toBe(avec4.options[1].dureeCotisee);
  });
});
