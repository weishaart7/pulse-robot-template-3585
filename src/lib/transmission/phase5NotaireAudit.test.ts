/**
 * Phase 5 (contre-audit « résultat notaire » du 2026-09-29) : legs sur part
 * successorale, adoption simple (art. 786 CGI), abattement des représentants
 * selon la dévolution (art. 779 I), reçu du 1er décès au 2nd décès.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, computeChainedTransmission, FamilyGraph, Liberalite, RawAssetInput } from './index';
import { computeRecuAuPremierDeces } from '../../utils/transmissionHelpers';

const REF = '2026-09-29';
const compte = (valeur: number): RawAssetInput[] => valeur > 0
  ? [{ id: 'c', denomination: 'Compte', valeur_estimee: valeur, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }]
  : [];
const run = (family: FamilyGraph, biens: number, liberalites: Liberalite[] = [], conjointOption: any = 'quart_pp') => computeTransmission({
  family, patrimony: { date: REF, biensExistants: biens, passifs: 0 }, liberalites, params: {} as any,
  referenceDate: REF, conjointOption, rawAssets: compte(biens),
});

function famille(n: number, conjoint = false): FamilyGraph {
  const ids = Array.from({ length: n }, (_, i) => `E${i + 1}`);
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      ...(conjoint ? [{ id: 'C', nom: 'C', prenom: 'C', lienFamilial: 'Conjoint', dateNaissance: '1955-01-01' }] : []),
      ...ids.map(id => ({ id, nom: id, prenom: id, lienFamilial: 'Enfant', dateNaissance: '1985-01-01' })),
    ],
    links: ids.map(id => ({ from: 'D', to: id, relation: 'child' as const })),
    marriages: conjoint ? [{ spouseA: 'D', spouseB: 'C' }] : [], decedentId: 'D',
    hasSurvivingSpouse: conjoint, survivingSpouseId: conjoint ? 'C' : undefined,
    childrenOfDecedent: ids, childrenCommonWithSpouse: ids, hasDDV: false,
  };
}
const recu = (r: ReturnType<typeof run>, id: string) =>
  Math.round(r.heirs.filter(h => h.personId === id).reduce((s, h) => s + (h.recuSuccession || 0), 0));

describe('Phase 5 — contre-audit', () => {
  it('legs sur part successorale à un enfant : s\'impute sur sa part, 150 k€ / 150 k€', () => {
    const legs: Liberalite = { id: 'l', type: 'legs', beneficiaireId: 'E1', valeur: 100000, date: '2026-01-01', typeImputation: 'avance_part' };
    const r = run(famille(2), 300000, [legs]);
    expect(recu(r, 'E1')).toBe(150000);
    expect(recu(r, 'E2')).toBe(150000);
  });

  it('adoption simple sans exception : barème à 60 % (art. 786 CGI)', () => {
    const g = famille(1);
    g.persons[1].enfantAdopte = 'Adoption simple';
    // 200 000 + forfait mobilier 10 000 − frais funéraires 1 500 − abattement 1 594 = 206 906 × 60 %.
    expect(run(g, 200000).dmtg.perBeneficiary['E1'].droitsHorsAV).toBe(124144);
  });

  it('adoption simple avec exception déclarée : traitement d\'un enfant', () => {
    const g = famille(1);
    g.persons[1].enfantAdopte = 'Adoption simple';
    g.persons[1].adoptionSimpleAbattementPlein = true;
    expect(run(g, 200000).dmtg.perBeneficiary['E1'].allowanceGeneralResidual).toBe(100000);
    expect(run(g, 200000).dmtg.perBeneficiary['E1'].droitsHorsAV).toBeLessThan(30000);
  });

  it('représentation à 2 niveaux : abattement partagé 50 000 / 25 000 / 25 000 (art. 779 I)', () => {
    const g: FamilyGraph = {
      persons: [
        { id: 'D', nom: 'D', prenom: 'D' },
        { id: 'E1', nom: 'E1', prenom: 'E1', lienFamilial: 'Enfant', estDecede: true },
        { id: 'G1', nom: 'G1', prenom: 'G1', lienFamilial: 'Petit-enfant' },
        { id: 'G2', nom: 'G2', prenom: 'G2', lienFamilial: 'Petit-enfant', estDecede: true },
        { id: 'AG1', nom: 'AG1', prenom: 'AG1', lienFamilial: 'Arrière petit-enfant' },
        { id: 'AG2', nom: 'AG2', prenom: 'AG2', lienFamilial: 'Arrière petit-enfant' },
      ],
      links: [
        { from: 'D', to: 'E1', relation: 'child' }, { from: 'E1', to: 'G1', relation: 'child' },
        { from: 'E1', to: 'G2', relation: 'child' }, { from: 'G2', to: 'AG1', relation: 'child' }, { from: 'G2', to: 'AG2', relation: 'child' },
      ],
      marriages: [], decedentId: 'D', hasSurvivingSpouse: false, childrenOfDecedent: ['E1'], childrenCommonWithSpouse: [], hasDDV: false,
    };
    const r = run(g, 400000);
    expect(r.dmtg.perBeneficiary['G1'].allowanceGeneralResidual).toBe(50000);
    expect(r.dmtg.perBeneficiary['AG1'].allowanceGeneralResidual).toBe(25000);
    expect(r.dmtg.perBeneficiary['AG2'].allowanceGeneralResidual).toBe(25000);
  });

  it('2nd décès : la donation déjà détenue par le conjoint n\'est pas reçue une 2e fois', () => {
    const don: Liberalite = { id: 'd', type: 'donation', beneficiaireId: 'conjoint', valeur: 50000, valeurFiscaleActe: 50000, date: '2020-01-01', typeImputation: 'hors_part' };
    const r = run(famille(2, true), 400000, [don]);
    const recuConjoint = computeRecuAuPremierDeces(r, 'C');
    // Droits 1/4 × 400 000 = 100 000 − donation 50 000 → complément 50 000.
    expect(recuConjoint.pleinePropriete).toBe(50000);
  });

  it('usufruit total + legs au conjoint : seule la valeur d\'usufruit est réunie aux nus-propriétaires', () => {
    const legs: Liberalite = { id: 'l', type: 'legs', beneficiaireId: 'conjoint', valeur: 50000, date: '2026-01-01', typeImputation: 'hors_part' };
    const ctx = (family: FamilyGraph, liberalites: Liberalite[]) => ({
      family, patrimony: { date: REF, biensExistants: 400000, passifs: 0 }, liberalites, params: {} as any,
      referenceDate: REF, conjointOption: 'usufruit_total' as const, rawAssets: compte(400000),
    });
    const chained = computeChainedTransmission({ firstDeath: ctx(famille(2, true), [legs]), secondDeath: ctx(famille(2, false), []) });
    // Usufruit (71 ans, 30 %) sur les 350 000 € non légués.
    expect(chained.reunionUsufruit.total).toBe(105000);
    expect(computeRecuAuPremierDeces(chained.firstDeath, 'C').pleinePropriete).toBe(50000);
  });
});
