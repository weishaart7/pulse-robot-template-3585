import { describe, it, expect } from 'vitest';
import { pensionBaseCNBF } from './calculCNBF';
import { appliquerProjectionStatut } from './projectionStatut';

const base = {
  trimestresCNBF: 172,
  trimestresRequis: 172,
  trimestresTousRegimes: 172,
  ageDepartAnnees: 64,
  nombreEnfantsEligibles: 0,
};

describe('pensionBaseCNBF — barème 2026', () => {
  it('carrière complète : forfait de 19 154 €', () => {
    expect(pensionBaseCNBF(base).pensionFinale).toBeCloseTo(19154, 6);
  });
  it('au prorata des trimestres CNBF, plafonné à la durée requise', () => {
    expect(pensionBaseCNBF({ ...base, trimestresCNBF: 86 }).pensionBrute).toBeCloseTo(19154 / 2, 6);
    expect(pensionBaseCNBF({ ...base, trimestresCNBF: 200 }).pensionBrute).toBeCloseTo(19154, 6);
  });
  it('moins de 60 trimestres : fraction de l’AVTS (4 059,72 € pour 60)', () => {
    expect(pensionBaseCNBF({ ...base, trimestresCNBF: 30 }).pensionBrute).toBeCloseTo(4059.72 / 2, 6);
  });
  it('décote tous régimes : 8 trimestres manquants à 64 ans → −10 %', () => {
    const r = pensionBaseCNBF({ ...base, trimestresTousRegimes: 164 });
    expect(r.decotePct).toBeCloseTo(-10, 6);
    expect(r.pensionFinale).toBeCloseTo(19154 * 0.9, 6);
  });
  it('3 enfants : +10 % après décote, hors assiette de réversion', () => {
    const r = pensionBaseCNBF({ ...base, nombreEnfantsEligibles: 3 });
    expect(r.pensionFinale).toBeCloseTo(19154 * 1.1, 6);
    expect(r.pensionHorsMajorationEnfants).toBeCloseTo(19154, 6);
  });
  it('aucun trimestre CNBF : 0', () => {
    expect(pensionBaseCNBF({ ...base, trimestresCNBF: 0 }).pensionFinale).toBe(0);
  });
});

describe('appliquerProjectionStatut — avocat', () => {
  const entree = {
    statut: 'avocat_cnbf' as const,
    trimestresProjetes: 40,
    revenuAnnuel: 60000,
    primesAnnuellesFP: null,
    trimestresValidesRG: 20,
    salaireAnnuelMoyenRIS: 20000,
    salaireAnnuelMoyenProjete: 25000,
    fonctionPublique: null,
    cnavpl: null,
  };
  it('trimestres projetés à la CNBF, régime général figé', () => {
    const r = appliquerProjectionStatut({ ...entree, cnbf: { trimestresCNBF: 80, classe: 'C1' } });
    expect(r.cnbf?.trimestresCNBF).toBe(120);
    expect(r.trimestresValidesRG).toBe(20);
    expect(r.trimestresCaisseProjetes).toBe(40);
  });
  it('CNBF non renseignée : rien de projeté, avertissement', () => {
    const r = appliquerProjectionStatut(entree);
    expect(r.cnbf).toBeNull();
    expect(r.avertissement).not.toBeNull();
  });
});
