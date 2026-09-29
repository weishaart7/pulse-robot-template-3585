/**
 * Phase 3 de l'audit « résultat notaire » du 2026-09-29 : net à recevoir
 * calculé sur la valeur civile reçue (R8), soulte signée et assurance-vie
 * comptée une seule fois (R9), frais répartis sur la valeur reçue (R10).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite } from './index';

const REF = '2026-09-29';

function famille(nbEnfants: number): FamilyGraph {
  const ids = Array.from({ length: nbEnfants }, (_, i) => `E${i + 1}`);
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      ...ids.map(id => ({ id, nom: id, prenom: id, lienFamilial: 'Enfant', dateNaissance: '1985-01-01' })),
    ],
    links: ids.map(id => ({ from: 'D', to: id, relation: 'child' as const })),
    marriages: [],
    decedentId: 'D',
    hasSurvivingSpouse: false,
    childrenOfDecedent: ids,
    childrenCommonWithSpouse: [],
    hasDDV: false,
  };
}

const net = (r: ReturnType<typeof computeTransmission>, id: string) =>
  r.netBreakdown.heirs.find(h => h.personId === id)!.netARecevoir;

describe('Phase 3 — net à recevoir sur la valeur civile reçue', () => {
  it('maison de 500 k€ (enfant mineur : abattement 20 %) : le net part de 250 k€, pas de la base fiscale', () => {
    const family = famille(2);
    family.persons[2].dateNaissance = '2012-01-01';
    const r = computeTransmission({
      family, patrimony: { date: REF, biensExistants: 500000, passifs: 0 }, liberalites: [],
      params: {} as any, referenceDate: REF,
      rawAssets: [{ id: 'rp', denomination: 'Maison', valeur_estimee: 500000, nature: 'Résidence principale', qualification_bien: 'Bien propre', detenteur: 'user' }],
    });
    const h = r.netBreakdown.heirs.find(x => x.personId === 'E1')!;
    expect(h.valeurRecue).toBe(250000);
    expect(h.netARecevoir).toBe(250000 - h.totalCouts); // droits + frais de notaire + partage + frais funéraires
  });

  it('assurance-vie de 200 k€ versée après 70 ans : capital compté une seule fois', () => {
    const r = computeTransmission({
      family: famille(1), patrimony: { date: REF, biensExistants: 0, passifs: 0 }, liberalites: [],
      params: {} as any, referenceDate: REF, rawAssets: [],
      avContracts: [{ id: 'av', niveaux: [{ beneficiaires: [{ beneficiaryId: 'E1', quotePart: 1 }] }], capitalDeces: 200000, primesAvant70: 0, primesApres70: 200000, detenteur: 'user' }],
    });
    // Droits 757 B : 169 500 − 100 000 = 69 500 taxables → 12 094 €.
    expect(r.dmtg.perBeneficiary['E1'].droitsHorsAV).toBe(12094);
    // Seuls s'y ajoutent les frais de l'acte de notoriété (68 € TTC), dus même sans actif.
    const e1 = r.netBreakdown.heirs.find(x => x.personId === 'E1')!;
    expect(e1.netARecevoir).toBe(200000 - 12094 - e1.fraisNotaire);
    expect(e1.fraisNotaire).toBe(68);
  });

  it('soulte signée : le débiteur a un net négatif, le créancier la reçoit', () => {
    const don: Liberalite = { id: 'd1', type: 'donation', beneficiaireId: 'E1', valeur: 200000, valeurFiscaleActe: 200000, date: '2020-01-01', typeImputation: 'avance_part' };
    const r = computeTransmission({
      family: famille(2), patrimony: { date: REF, biensExistants: 100000, passifs: 0 }, liberalites: [don],
      params: {} as any, referenceDate: REF,
      rawAssets: [{ id: 'cpt', denomination: 'Compte', valeur_estimee: 100000, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user' }],
    });
    expect(net(r, 'E1')).toBe(-50000);
    const e2 = r.netBreakdown.heirs.find(x => x.personId === 'E2')!;
    expect(e2.soulte).toBe(50000);
    expect(e2.netARecevoir).toBe(100000 - e2.totalCouts + 50000);
    expect(r.netBreakdown.heirs.find(x => x.personId === 'E1')!.percentage).toBe(0);
  });
});
