import { describe, it, expect } from 'vitest';
import { buildRecuEnNature, PassifLine } from './transmissionHelpers';
import type { Asset } from '@/services/assetService';

// Défunt = Utilisateur : RP commune 400 000 €, appartement propre 200 000 €,
// emprunt commun de 100 000 € rattaché à la RP. Actif brut successoral 400 000 €
// (200 000 + 200 000), passif 50 000 €, actif net 350 000 €.
const assets = [
  { id: 'rp', nature: 'Résidence principale', valeur_estimee: 400000, qualification_bien: 'Bien commun', detenteur: 'common', mode_detention: 'Pleine propriété' },
  { id: 'appt', nature: 'Immeubles locatifs (loués nus)', valeur_estimee: 200000, qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Pleine propriété' },
] as unknown as Asset[];
const passifs: PassifLine[] = [{ montant_du: 100000, asset_id: 'rp', qualification_bien: 'Bien commun' }];

describe('buildRecuEnNature', () => {
  it('ventile un quart reçu bien par bien, nature et valeur brute conservées, dettes reprises à part', () => {
    const recu = { pleinePropriete: 87500, capitauxDecesNets: 0, total: 87500 }; // 1/4 de 350 000
    const r = buildRecuEnNature(assets, passifs, recu, 'user');

    expect(r.rawAssets.map(l => [l.nature, l.valeur_estimee])).toEqual([
      ['Résidence principale', 50000],
      ['Immeubles locatifs (loués nus)', 50000],
    ]);
    expect(r.brut).toBeCloseTo(100000);
    expect(r.passifs).toBeCloseTo(12500);
    expect(r.brut - r.passifs).toBeCloseTo(recu.pleinePropriete);
    expect(r.passifsParBien['recu-1er-deces-rp']).toBeCloseTo(12500);
  });

  it('rien en pleine propriété (usufruit) : seules les lignes de capitaux décès', () => {
    const r = buildRecuEnNature(assets, passifs, { pleinePropriete: 0, capitauxDecesNets: 30000, total: 30000 }, 'user');
    expect(r.rawAssets).toHaveLength(1);
    expect(r.rawAssets[0].nature).toBe('Comptes courants');
    expect(r.brut).toBe(30000);
    expect(r.passifs).toBe(0);
  });

  it('reçu supérieur à l\'actif net des biens saisis : excédent en liquidités', () => {
    const r = buildRecuEnNature(assets, passifs, { pleinePropriete: 400000, capitauxDecesNets: 0, total: 400000 }, 'user');
    expect(r.brut - r.passifs).toBeCloseTo(400000);
    expect(r.rawAssets.some(l => l.nature === 'Comptes courants' && Math.round(l.valeur_estimee || 0) === 50000)).toBe(true);
  });

  it('actif net non positif : repli sur une ligne de liquidités du montant reçu', () => {
    const lourd: PassifLine[] = [{ montant_du: 2000000, qualification_bien: 'Bien commun' }];
    const r = buildRecuEnNature(assets, lourd, { pleinePropriete: 10000, capitauxDecesNets: 0, total: 10000 }, 'user');
    expect(r.rawAssets).toHaveLength(1);
    expect(r.brut).toBe(10000);
    expect(r.passifs).toBe(0);
  });
});
