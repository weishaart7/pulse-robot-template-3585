/**
 * Correctifs de la phase 3 de l'audit Transmission (2026-09), donations :
 * 5. rappel fiscal sur la valeur déclarée dans l'acte (art. 784 CGI) ;
 * 6. exonération 790 G = plafond unique de 31 865€ sur 15 ans par donataire.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite } from './index';
import { buildPatrimonySnapshot, buildTransmissionLiberalites } from '../../utils/transmissionHelpers';
import { computeRecallAndAllowances, DEFAULT_DMTG_PARAMS, Donation } from '../dmtg';

const REF = '2026-09-23';

const family: FamilyGraph = {
  persons: [
    { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
    { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' }
  ],
  links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
  marriages: [],
  decedentId: 'defunt',
  hasSurvivingSpouse: false,
  childrenOfDecedent: ['enfant1'],
  childrenCommonWithSpouse: [],
  hasDDV: false
} as FamilyGraph;

const rawAssets = [
  { id: 'a', denomination: 'Portefeuille', valeur_estimee: 300000, nature: 'valeur_mobiliere', qualification_bien: 'Bien propre' }
] as any;

function run(liberalites: Liberalite[]) {
  const patrimony = buildPatrimonySnapshot(rawAssets, [], 0);
  return computeTransmission({ family, patrimony, liberalites, params: {} as any, referenceDate: REF, rawAssets });
}

const donation = (over: Partial<Liberalite>): Liberalite => ({
  id: 'd1', type: 'donation', beneficiaireId: 'enfant1', valeur: 150000, date: '2020-01-01',
  typeImputation: 'avance_part', ...over
});

describe('Phase 3 — rappel fiscal sur la valeur à l\'acte', () => {
  it('valeur à l\'acte 80 k€, valeur actuelle 150 k€ : 80 000€ d\'abattement consommé', () => {
    const r = run([donation({ valeurFiscaleActe: 80000 })]);
    expect(r.dmtg.perBeneficiary.enfant1.allowanceGeneralResidual).toBe(20000);
    expect(r.explicationsTexte.some(t => t.includes('sans valeur déclarée'))).toBe(false);
  });

  it('valeur à l\'acte absente : repli sur la valeur actuelle, avec avertissement', () => {
    const r = run([donation({})]);
    expect(r.dmtg.perBeneficiary.enfant1.allowanceGeneralResidual).toBe(0);
    expect(r.dmtg.perBeneficiary.enfant1.consumedBracketsAmount).toBe(50000);
    expect(r.explicationsTexte.some(t => t.includes('sans valeur déclarée'))).toBe(true);
  });

  it('buildTransmissionLiberalites lit valeur_fiscale_acte', () => {
    const { liberalites } = buildTransmissionLiberalites([
      { id: 'd1', type: 'donation', beneficiaire_nom: 'Léo', denomination: 'Don', montant: 150000, valeur_fiscale_acte: 80000 }
    ], []);
    expect(liberalites[0].valeurFiscaleActe).toBe(80000);
    expect(liberalites[0].valeur).toBe(150000);
  });
});

const don790G = (id: string, date: string, valeur: number): Donation => ({
  id, date, donorId: 'defunt', doneeId: 'e1', valeurDon: valeur, type: 'familiale_790G'
});

describe('Phase 3 — plafond 790 G unique', () => {
  it('deux dons de 20 000€ : 8 135€ consomment l\'abattement général', () => {
    const r = computeRecallAndAllowances({
      beneficiary: { id: 'e1', lien: 'enfant' } as any,
      donations15y: [don790G('a', '2020-01-01', 20000), don790G('b', '2022-01-01', 20000)],
      params: DEFAULT_DMTG_PARAMS
    });
    expect(r.details.abattementConsomme).toBe(8135);
    expect(r.allowanceGeneralResidual).toBe(100000 - 8135);
  });

  it('don hors fenêtre de 15 ans : ne consomme plus le plafond', () => {
    // Le filtrage 15 ans est fait en amont (filterDonations15Years) : seul le
    // don récent arrive ici, il bénéficie du plafond entier.
    const r = computeRecallAndAllowances({
      beneficiary: { id: 'e1', lien: 'enfant' } as any,
      donations15y: [don790G('b', '2022-01-01', 31865)],
      params: DEFAULT_DMTG_PARAMS
    });
    expect(r.details.abattementConsomme).toBe(0);
  });

  it('bout en bout : un don 790 G de plus de 15 ans est ignoré', () => {
    const r = run([
      donation({ id: 'vieux', date: '2005-01-01', valeur: 31865, valeurFiscaleActe: 31865, nature: "Dons familiaux de sommes d'argent" }),
      donation({ id: 'recent', date: '2022-01-01', valeur: 31865, valeurFiscaleActe: 31865, nature: "Dons familiaux de sommes d'argent" })
    ]);
    expect(r.dmtg.perBeneficiary.enfant1.allowanceGeneralResidual).toBe(100000);
  });
});
