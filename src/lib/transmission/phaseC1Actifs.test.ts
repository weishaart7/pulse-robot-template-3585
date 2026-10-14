/**
 * Audit des classes d'actifs du 2026-10-14, phase C1 :
 * - N7 biens d'une entreprise individuelle (art. 787 C CGI) ;
 * - N8 bijoux, objets d'art et de collection : plancher de 60 % de la valeur
 *   d'assurance (art. 764 II CGI) ;
 * - N11 assurance-vie dont l'assuré n'est pas le souscripteur.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, RawAssetInput } from './index';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { isContratHorsSuccession } from '@/constants/assetTypes';
import { assetSchema, getDefaultAssetValues } from '@/schemas/assetSchema';
import { buildPatrimonySnapshot } from '@/utils/transmissionHelpers';

const REF = '2026-10-14';
const famille: FamilyGraph = {
  persons: [
    { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
    { id: 'E1', nom: 'E1', prenom: 'E1', lienFamilial: 'Enfant', dateNaissance: '1975-01-01' }
  ],
  links: [{ from: 'D', to: 'E1', relation: 'child' }],
  marriages: [], decedentId: 'D', hasSurvivingSpouse: false, childrenOfDecedent: ['E1'], childrenCommonWithSpouse: [], hasDDV: false
};
const bien = (valeur: number, nature: string, extra: Partial<RawAssetInput> = {}): RawAssetInput => ({
  id: 'b', denomination: nature, valeur_estimee: valeur, nature, qualification_bien: 'Bien propre', detenteur: 'user', ...extra
});
// Actif civil : part du défunt de la valeur estimée (50 % d'un bien commun).
const run = (assets: RawAssetInput[]) => computeTransmission({
  family: famille,
  patrimony: {
    date: REF, passifs: 0,
    biensExistants: assets.reduce((sum, a) => sum + (a.valeur_estimee || 0) * (a.qualification_bien === 'Bien commun' ? 0.5 : 1), 0)
  },
  liberalites: [],
  params: { inventaireNotarieProduit: true } as never, referenceDate: REF, rawAssets: assets
});

describe('N7 — entreprise individuelle (art. 787 C CGI)', () => {
  it('conditions non renseignées : calcul et formulaire bloqués', () => {
    expect(() => run([bien(800000, 'Entreprise individuelle')])).toThrow(BienNonQualifieError);
    const r = assetSchema.safeParse({ ...getDefaultAssetValues(), nature: 'Autres biens professionnels', denomination: 'Fonds' });
    expect(JSON.stringify(r.error?.issues)).toContain('conditions_787c');
  });

  it('conditions remplies : 75 % exonérés ; non remplies : pleine valeur', () => {
    expect(run([bien(800000, 'Entreprise individuelle', { conditions_787c: true })]).dmtg.perBeneficiary.E1.baseHorsAV).toBe(198500);
    expect(run([bien(800000, 'Entreprise individuelle', { conditions_787c: false })]).dmtg.perBeneficiary.E1.baseHorsAV).toBe(798500);
  });
});

describe('N8 — plancher de 60 % de la valeur d\'assurance (art. 764 II CGI)', () => {
  it('valeur estimée inférieure au plancher : 60 % de la valeur assurée retenus', () => {
    const r = run([bien(20000, 'Bijoux et pierres précieuses', { valeur_assuree: 50000 })]);
    expect(r.dmtg.perBeneficiary.E1.baseHorsAV).toBe(28500);
    expect((r.explicationsTexte || []).join(' ')).toContain('764');
  });

  it('valeur estimée supérieure, ou sans valeur assurée : valeur estimée', () => {
    expect(run([bien(40000, "Objets d'art et antiquités", { valeur_assuree: 50000 })]).dmtg.perBeneficiary.E1.baseHorsAV).toBe(38500);
    expect(run([bien(20000, 'Objets de collection')]).dmtg.perBeneficiary.E1.baseHorsAV).toBe(18500);
  });

  it('bien commun : plancher sur la part du défunt', () => {
    const r = run([bien(20000, 'Montres', { valeur_assuree: 50000, qualification_bien: 'Bien commun', detenteur: 'common' })]);
    // 50 % × 60 % × 50 000 = 15 000 > 50 % × 20 000.
    expect(r.dmtg.perBeneficiary.E1.baseHorsAV).toBe(13500);
  });
});

describe('N11 — assurance-vie dont l\'assuré n\'est pas le souscripteur', () => {
  it('contrat non dénoué : valeur de rachat dans l\'actif successoral', () => {
    expect(isContratHorsSuccession({ nature: "Contrat d'assurance-vie", assure_tiers: true })).toBe(false);
    expect(isContratHorsSuccession({ nature: "Contrat d'assurance-vie", assure_tiers: false })).toBe(true);
    const av = { ...bien(120000, "Contrat d'assurance-vie", { assure_tiers: true }), mode_detention: 'Pleine propriété' };
    expect(buildPatrimonySnapshot([av] as never, []).biensExistants).toBe(120000);
    const r = run([av]);
    expect(r.dmtg.perBeneficiary.E1.baseHorsAV).toBe(118500);
    expect((r.explicationsTexte || []).join(' ')).toContain('non dénoué');
  });
});
