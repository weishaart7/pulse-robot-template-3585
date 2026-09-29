/**
 * Imputation « en assiette » des libéralités en usufruit (Cass. civ. 1, 22 juin
 * 2022, n° 20-23.215 ; référentiel Successions §8.6.2), règles R21 à R24
 * validées le 2026-09-29.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite, Person } from './index';

const REF = '2026-09-29';

function famille(extra: Person[] = []): FamilyGraph {
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      { id: 'E1', nom: 'E1', prenom: 'E1', lienFamilial: 'Enfant', dateNaissance: '1985-01-01' },
      ...extra,
    ],
    links: [{ from: 'D', to: 'E1', relation: 'child' }],
    marriages: [], decedentId: 'D', hasSurvivingSpouse: false,
    childrenOfDecedent: ['E1'], childrenCommonWithSpouse: [], hasDDV: false,
  };
}
// 45 ans au décès : usufruit à 60 % (barème art. 669 CGI).
const COUSIN: Person = { id: 'K', nom: 'K', prenom: 'Karim', lienFamilial: 'Cousin/Cousine', dateNaissance: '1981-01-01' };

function run(family: FamilyGraph, biens: number, liberalites: Liberalite[]) {
  return computeTransmission({
    family, patrimony: { date: REF, biensExistants: biens, passifs: 0 }, liberalites, params: {} as any,
    referenceDate: REF,
    rawAssets: [{ id: 'c', denomination: 'Patrimoine', valeur_estimee: biens, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }],
  });
}
const legsUsufruit = (beneficiaireId: string, assiette: number): Liberalite => ({
  id: 'lu', type: 'legs', beneficiaireId, valeur: assiette, date: '2026-01-01', typeImputation: 'hors_part',
  droitTransmis: 'usufruit', beneficiaireName: 'Légataire',
});
const recu = (r: ReturnType<typeof run>, id: string) =>
  Math.round(r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h.recuSuccession || 0), 0));

describe('Imputation en assiette des libéralités en usufruit', () => {
  it('exemple du référentiel : legs de l\'usufruit d\'une maison de 240 k€, QD 191 500 € → réduction de 29 100 €', () => {
    const r = run(famille([COUSIN]), 383000, [legsUsufruit('K', 240000)]);
    // Assiette 240 000 > QD 191 500 : 48 500 € d'assiette réduite, soit 29 100 € en usufruit.
    expect(Math.round(r.details.reductions[0].montantReduit)).toBe(48500);
    const legataire = r.legataires.find(l => l.personId === 'K')!;
    expect(legataire.montant).toBe(114900); // usufruit de la QD : 191 500 × 60 %
    expect(recu(r, 'E1')).toBe(268100);   // 383 000 − 114 900 (nue-propriété comprise)
  });

  it('en valeur, le legs (144 000 €) aurait été maintenu : la méthode en assiette réduit bien', () => {
    const r = run(famille([COUSIN]), 383000, [legsUsufruit('K', 240000)]);
    expect(r.details.reductions.length).toBe(1);
  });

  it('assiette dans la QD : aucune réduction, légataire taxé sur son usufruit', () => {
    const r = run(famille([COUSIN]), 383000, [legsUsufruit('K', 150000)]);
    expect(r.details.reductions).toEqual([]);
    expect(r.legataires.find(l => l.personId === 'K')!.montant).toBe(90000); // 150 000 × 60 %
    expect(r.dmtg.perBeneficiary['K'].droitsHorsAV).toBeGreaterThan(0);
  });

  it('donation en pleine propriété antérieure puis legs d\'usufruit : la donation consomme d\'abord la QD', () => {
    const don: Liberalite = { id: 'd', type: 'donation', beneficiaireId: 'K', valeur: 100000, valeurFiscaleActe: 100000, date: '2020-01-01', typeImputation: 'hors_part' };
    // Masse 483 000, QD 241 500 ; donation 100 000 → reste 141 500 d'assiette pour l'usufruit de 200 000.
    const r = run(famille([COUSIN]), 383000, [don, legsUsufruit('K', 200000)]);
    const reductionLegs = r.details.reductions.find(x => x.liberaliteId === 'lu')!;
    expect(Math.round(reductionLegs.montantReduit)).toBe(58500);
    expect(r.details.reductions.find(x => x.liberaliteId === 'd')).toBeUndefined();
  });

  it('usufruit valorisé à l\'âge du bénéficiaire : petit-enfant de 20 ans, usufruit à 90 %', () => {
    const PE: Person = { id: 'PE', nom: 'PE', prenom: 'PE', lienFamilial: 'Petit-enfant', dateNaissance: '2006-01-01' };
    const g = famille([PE]);
    g.links.push({ from: 'E1', to: 'PE', relation: 'child' });
    const r = run(g, 400000, [legsUsufruit('PE', 100000)]);
    expect(r.legataires.find(l => l.personId === 'PE')!.montant).toBe(90000);
  });

  it('bénéficiaire sans date de naissance : calcul bloqué, jamais deviné', () => {
    const sansDate: Person = { ...COUSIN, dateNaissance: undefined };
    expect(() => run(famille([sansDate]), 383000, [legsUsufruit('K', 100000)])).toThrow(/date de naissance/);
  });
});
