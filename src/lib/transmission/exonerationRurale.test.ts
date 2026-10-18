/**
 * Biens ruraux, groupements fonciers, bois et forêts (audit du 2026-10-12, #16) :
 * exonération partielle de DMTG (art. 793-1-3°, 793-2-2° et 793 bis CGI), régime
 * et conditions saisis sur le bien, jamais présumés.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, TransmissionParams } from './index';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { isBienRuralNonQualifie, getExonerationRurale } from '@/constants/assetTypes';
import { assetSchema, getDefaultAssetValues } from '@/schemas/assetSchema';
import transmissionParamsData from '../../data/transmission-params.json';

const params = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
} as unknown as TransmissionParams;

const REF = '2026-10-12';

const famille: FamilyGraph = {
  persons: [
    { id: 'defunt', nom: 'D', prenom: 'Jean', dateNaissance: '1960-01-01' },
    { id: 'conjoint', nom: 'D', prenom: 'Marie', lienFamilial: 'conjoint', dateNaissance: '1962-01-01' },
    { id: 'e1', nom: 'D', prenom: 'A', lienFamilial: 'Enfant', dateNaissance: '1990-01-01' },
    { id: 'e2', nom: 'D', prenom: 'B', lienFamilial: 'Enfant', dateNaissance: '1992-01-01' }
  ],
  links: [{ from: 'defunt', to: 'e1', relation: 'child' }, { from: 'defunt', to: 'e2', relation: 'child' }],
  marriages: [{ spouseA: 'defunt', spouseB: 'conjoint' }],
  decedentId: 'defunt',
  hasSurvivingSpouse: true,
  survivingSpouseId: 'conjoint',
  childrenOfDecedent: ['e1', 'e2'],
  childrenCommonWithSpouse: ['e1', 'e2'],
  hasDDV: false
};

const bien = (valeur: number, nature: string, regime?: string | null, conditions?: boolean | null) => ({
  id: 'b', denomination: 'Bien rural', valeur_estimee: valeur, nature,
  mode_detention: 'Pleine propriété', detenteur: 'user', qualification_bien: 'Bien propre',
  regime_exoneration_rural: regime, conditions_exoneration_rural: conditions
});

const calcul = (valeur: number, nature: string, regime?: string | null, conditions?: boolean | null) => computeTransmission({
  family: famille,
  patrimony: { date: REF, biensExistants: valeur, passifs: 0 },
  liberalites: [],
  params,
  referenceDate: REF,
  conjointOption: 'quart_pp',
  rawAssets: [bien(valeur, nature, regime, conditions)]
});

describe('qualification', () => {
  it('bloque un bien rural sans régime, ou sans conditions hors régime « aucun »', () => {
    expect(isBienRuralNonQualifie({ nature: 'Parts de groupements fonciers' })).toBe(true);
    expect(isBienRuralNonQualifie({ nature: 'Bois & forêts', regime_exoneration_rural: 'forestier' })).toBe(true);
    expect(isBienRuralNonQualifie({ nature: 'Parts de groupements fonciers', regime_exoneration_rural: 'aucun' })).toBe(false);
    expect(isBienRuralNonQualifie({ nature: 'Terrains agricoles', regime_exoneration_rural: 'agricole', conditions_exoneration_rural: false })).toBe(false);
    expect(isBienRuralNonQualifie({ nature: 'Comptes courants' })).toBe(false);
    expect(() => calcul(500000, 'Parts de groupements fonciers')).toThrow(BienNonQualifieError);
  });

  it('n\'exonère que si les conditions sont remplies', () => {
    expect(getExonerationRurale({ nature: 'Bois & forêts', regime_exoneration_rural: 'forestier', conditions_exoneration_rural: true })).toBe('forestier');
    expect(getExonerationRurale({ nature: 'Bois & forêts', regime_exoneration_rural: 'forestier', conditions_exoneration_rural: false })).toBeNull();
    expect(getExonerationRurale({ nature: 'Parts de groupements fonciers', regime_exoneration_rural: 'aucun', conditions_exoneration_rural: true })).toBeNull();
  });

  it('le formulaire exige le régime puis les conditions', () => {
    const base = { ...getDefaultAssetValues(), nature: 'Parts de groupements fonciers', denomination: 'GF' };
    const sansRegime = assetSchema.safeParse(base);
    expect(sansRegime.success).toBe(false);
    expect(JSON.stringify(sansRegime.error?.issues)).toContain('regime_exoneration_rural');
    const sansConditions = assetSchema.safeParse({ ...base, regime_exoneration_rural: 'agricole' });
    expect(JSON.stringify(sansConditions.error?.issues)).toContain('conditions_exoneration_rural');
  });
});

describe('calcul des droits', () => {
  it('GFA de 500 000 € (1/4 PP, 2 enfants) : 3/4 exonérés, plus aucun droit', () => {
    const taxe = calcul(500000, 'Parts de groupements fonciers', 'agricole', false);
    expect(taxe.dmtg.perBeneficiary.e1.droitsHorsAV).toBe(17457);
    const exonere = calcul(500000, 'Parts de groupements fonciers', 'agricole', true);
    // 187 500 € × 1/4 = 46 875 €, forfait mobilier compris : sous l'abattement de 100 000 €.
    expect(exonere.dmtg.perBeneficiary.e1.droitsHorsAV).toBe(0);
    expect(exonere.explicationsTexte?.some(t => t.includes('793 bis'))).toBe(true);
  });

  it('au-delà de 600 000 € par héritier, l\'exonération tombe à 1/2', () => {
    // 2 000 000 € : 750 000 € par enfant, dont 150 000 € au-delà du seuil.
    const r = calcul(2000000, 'Parts de groupements fonciers', 'agricole', true);
    // Base = 750 000 × 1/4 + 150 000 × (3/4 − 1/2) = 225 000, moins sa part des frais
    // funéraires (1 500 € × 225 000 / 575 000, conjoint sous le seuil : 125 000 €).
    expect(r.dmtg.perBeneficiary.e1.baseApresFrais).toBe(224413);
  });

  it('bois et forêts : 3/4 exonérés sans plafond', () => {
    const r = calcul(2000000, 'Bois & forêts', 'forestier', true);
    // 750 000 × 1/4 = 187 500, moins 1 500 € × 187 500 / 500 000 de frais funéraires.
    expect(r.dmtg.perBeneficiary.e1.baseApresFrais).toBe(186938);
  });

  it('régime « aucun » : pleine valeur taxée, signalée', () => {
    const r = calcul(500000, 'Parts de groupements fonciers', 'aucun', null);
    expect(r.dmtg.perBeneficiary.e1.droitsHorsAV).toBe(17457);
    expect(r.explicationsTexte?.some(t => t.includes('aucune exonération'))).toBe(true);
  });
});
