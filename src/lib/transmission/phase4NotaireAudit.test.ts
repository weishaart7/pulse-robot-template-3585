/**
 * Phase 4 de l'audit « résultat notaire » du 2026-09-29 :
 * R11 réduction pour charges de famille (art. 780 CGI), R12 Dutreil
 * (art. 787 B), R13 demi-frères et demi-sœurs (art. 752 C. civ.), R14 rappel
 * des donations reçues par le représenté (art. 784), R15 frais funéraires
 * retranchés du net.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, calculateSuccessionLegale, FamilyGraph, Person, Liberalite, RawAssetInput } from './index';

const REF = '2026-09-29';
const compte = (valeur: number, extra: Partial<RawAssetInput> = {}): RawAssetInput =>
  ({ id: 'cpt', denomination: 'Compte', valeur_estimee: valeur, nature: 'Compte courant', qualification_bien: 'Bien propre', detenteur: 'user', ...extra });

function run(family: FamilyGraph, rawAssets: RawAssetInput[], liberalites: Liberalite[] = [], societesDutreil: string[] = []) {
  const biens = rawAssets.reduce((s, a) => s + (a.valeur_estimee || 0), 0);
  return computeTransmission({
    family, patrimony: { date: REF, biensExistants: biens, passifs: 0 }, liberalites,
    params: {} as any, referenceDate: REF, rawAssets, societesDutreil,
  });
}

function familleEnfants(petitsEnfantsDeE1: number): FamilyGraph {
  const pe = Array.from({ length: petitsEnfantsDeE1 }, (_, i) => `PE${i + 1}`);
  return {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      { id: 'E1', nom: 'E1', prenom: 'E1', lienFamilial: 'Enfant', dateNaissance: '1975-01-01' },
      { id: 'E2', nom: 'E2', prenom: 'E2', lienFamilial: 'Enfant', dateNaissance: '1977-01-01' },
      ...pe.map(id => ({ id, nom: id, prenom: id, lienFamilial: 'Petit-enfant', dateNaissance: '2005-01-01' })),
    ],
    links: [
      { from: 'D', to: 'E1', relation: 'child' as const },
      { from: 'D', to: 'E2', relation: 'child' as const },
      ...pe.map(id => ({ from: 'E1', to: id, relation: 'child' as const })),
    ],
    marriages: [], decedentId: 'D', hasSurvivingSpouse: false,
    childrenOfDecedent: ['E1', 'E2'], childrenCommonWithSpouse: [], hasDDV: false,
  };
}

describe('R11 — réduction pour charges de famille (art. 780 CGI)', () => {
  it('enfant ayant 4 enfants : 2 × 610 € de moins que son frère', () => {
    const r = run(familleEnfants(4), [compte(800000)]);
    const e1 = r.dmtg.perBeneficiary['E1'];
    const e2 = r.dmtg.perBeneficiary['E2'];
    expect(e1.reductionChargesFamille).toBe(1220);
    expect(e2.droitsHorsAV - e1.droitsHorsAV).toBe(1220);
  });
  it('2 enfants : aucune réduction', () => {
    expect(run(familleEnfants(2), [compte(800000)]).dmtg.perBeneficiary['E1'].reductionChargesFamille).toBe(0);
  });
  it('jamais au-delà des droits dus', () => {
    const r = run(familleEnfants(4), [compte(210000)]);
    expect(r.dmtg.perBeneficiary['E1'].droitsHorsAV).toBeGreaterThanOrEqual(0);
    expect(r.dmtg.perBeneficiary['E1'].reductionChargesFamille).toBeLessThanOrEqual(1220);
  });
});

describe('R12 — pacte Dutreil (art. 787 B CGI)', () => {
  it('titres d\'une société sous pacte validé : exonérés à 75 %', () => {
    const titres = compte(400000, { id: 'titres', denomination: 'Parts SAS', nature: 'Parts sociales', societe_id: 'soc1' });
    const avec = run(familleEnfants(0), [titres], [], ['soc1']);
    const sans = run(familleEnfants(0), [titres]);
    // 200 000 € par enfant : base 50 000 € + forfait mobilier sous l'abattement → 0 € avec Dutreil.
    expect(avec.dmtg.perBeneficiary['E1'].droitsHorsAV).toBe(0);
    expect(sans.dmtg.perBeneficiary['E1'].droitsHorsAV).toBeGreaterThan(20000);
    expect(avec.explicationsTexte?.some(t => t.startsWith('Pacte Dutreil'))).toBe(true);
    // Le net reste calculé sur la valeur pleine reçue.
    expect(avec.netBreakdown.heirs.find(h => h.personId === 'E1')!.valeurRecue).toBe(200000);
  });
});

describe('R13 — demi-frères et demi-sœurs (art. 752 C. civ.)', () => {
  const fratrie = (lits: Person['lienFratrie'][]): FamilyGraph => ({
    persons: [
      { id: 'D', nom: 'D', prenom: 'D' },
      ...lits.map((l, i) => ({ id: `F${i + 1}`, nom: `F${i + 1}`, prenom: '', lienFamilial: 'Frère/Sœur', lienFratrie: l })),
    ],
    links: lits.map((_, i) => ({ from: 'D', to: `F${i + 1}`, relation: 'sibling' as const })),
    marriages: [], decedentId: 'D', hasSurvivingSpouse: false,
    childrenOfDecedent: [], childrenCommonWithSpouse: [], hasDDV: false,
  });
  const parts = (g: FamilyGraph) => Object.fromEntries(calculateSuccessionLegale(g).heritiers.map(h => [h.personId, h.quotePart]));

  it('1 germain + 1 consanguin + 1 utérin : 1/2, 1/4, 1/4', () => {
    const p = parts(fratrie(['germain', 'consanguin', 'uterin']));
    expect(p.F1).toBeCloseTo(0.5);
    expect(p.F2).toBeCloseTo(0.25);
    expect(p.F3).toBeCloseTo(0.25);
  });
  it('1 germain + 2 utérins : germain 1/2 + 1/6, utérins 1/6 chacun', () => {
    const p = parts(fratrie(['germain', 'uterin', 'uterin']));
    expect(p.F1).toBeCloseTo(0.5 + 1 / 6);
    expect(p.F2).toBeCloseTo(1 / 6);
  });
  it('uniquement des consanguins : tout pour eux, à parts égales', () => {
    const p = parts(fratrie(['consanguin', 'consanguin']));
    expect(p.F1).toBeCloseTo(0.5);
    expect(p.F2).toBeCloseTo(0.5);
  });
  it('lit non renseigné : traité comme germain (parts égales)', () => {
    const p = parts(fratrie([undefined, 'uterin']));
    expect(p.F1).toBeCloseTo(0.75);
    expect(p.F2).toBeCloseTo(0.25);
  });
});

describe('R14 — rappel des donations reçues par le représenté (art. 784 CGI)', () => {
  it('donation de 100 k€ à un enfant prédécédé : consomme l\'abattement partagé de ses 2 enfants', () => {
    const g = familleEnfants(2);
    g.persons.find(p => p.id === 'E1')!.estDecede = true;
    const don: Liberalite = { id: 'd1', type: 'donation', beneficiaireId: 'E1', valeur: 100000, valeurFiscaleActe: 100000, date: '2020-01-01', typeImputation: 'hors_part' };
    const avec = run(g, [compte(400000)], [don]);
    // Abattement de la souche (100 000 €) entièrement consommé par la donation rappelée.
    expect(avec.dmtg.perBeneficiary['PE1'].allowanceGeneralResidual).toBe(0);
    expect(avec.dmtg.perBeneficiary['PE2'].allowanceGeneralResidual).toBe(0);
    expect(avec.dmtg.perBeneficiary['E2'].allowanceGeneralResidual).toBe(100000);
  });
});

describe('R15 — frais funéraires retranchés du net', () => {
  it('le net intègre la quote-part des 1 500 €', () => {
    const r = run(familleEnfants(0), [compte(100000)]);
    const e1 = r.netBreakdown.heirs.find(h => h.personId === 'E1')!;
    expect(e1.netARecevoir).toBe(50000 - e1.droitsDMTG - e1.fraisNotaire - e1.droitPartage - 750);
  });
});
