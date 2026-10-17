import { describe, expect, it } from 'vitest';
import type { Emprunt } from '@/services/passifService';
import type { Asset } from '@/services/assetService';
import { creditsDuBien } from './credit';
import { HYPOTHESES_PAR_DEFAUT, horizonProjection, projeterBien, sommeProjections } from './projection';

const AUJ = new Date(2026, 0, 15);
const asset = { id: 'a1', nature: 'Immeubles locatifs (loués nus)' } as Asset;
const emprunt = (duree: number) => ({
  id: 'e', asset_id: 'a1', capital_restant_du: 100_000, taux_interet: 2, duree_restante: duree,
  mode_amortissement: 'Amortissable', detenteur: 'Couple', qualification_bien: 'Bien commun',
  created_at: AUJ.toISOString(), updated_at: AUJ.toISOString(),
}) as Emprunt;

describe('horizonProjection', () => {
  it('borne l’horizon entre 10 et 30 ans, et suit la fin du crédit entre les deux', () => {
    expect(horizonProjection([], AUJ)).toBe(10);
    expect(horizonProjection(creditsDuBien(asset, [emprunt(60)], 100, 0), AUJ)).toBe(10);
    expect(horizonProjection(creditsDuBien(asset, [emprunt(180)], 100, 0), AUJ)).toBe(15);
    expect(horizonProjection(creditsDuBien(asset, [emprunt(420)], 100, 0), AUJ)).toBe(30);
  });
});

describe('projeterBien', () => {
  const credits = creditsDuBien(asset, [emprunt(120)], 100, 0);

  it('calcule cashflow, capital restant dû et valeur nette par période', () => {
    const p = projeterBien({
      flux: { loyerAnnuel: 12_000, chargesAnnuelles: 2_000 },
      credits,
      valeurActuelle: 200_000,
      hypotheses: HYPOTHESES_PAR_DEFAUT,
      nbPeriodes: 12,
      aujourdhui: AUJ,
    });
    expect(p).toHaveLength(12);
    expect(p[0].cashflow).toBeCloseTo(12_000 - 2_000 - p[0].remboursements, 6);
    expect(p[0].valeurNette).toBeCloseTo(200_000 - p[0].capitalRestantDuFin, 6);
    // Après le crédit : plus de remboursement, valeur nette = valeur.
    expect(p[11].remboursements).toBe(0);
    expect(p[11].cashflow).toBe(10_000);
    expect(p[11].valeurNette).toBeCloseTo(200_000, 2);
  });

  it('applique les revalorisations annuelles', () => {
    const p = projeterBien({
      flux: { loyerAnnuel: 10_000, chargesAnnuelles: 1_000 },
      credits: [],
      valeurActuelle: 100_000,
      hypotheses: { loyers: 2, charges: 3, valeur: 1 },
      nbPeriodes: 3,
      aujourdhui: AUJ,
    });
    expect(p[0].loyers).toBe(10_000);
    expect(p[2].loyers).toBeCloseTo(10_000 * 1.02 ** 2, 6);
    expect(p[2].charges).toBeCloseTo(1_000 * 1.03 ** 2, 6);
    expect(p[0].valeur).toBeCloseTo(101_000, 6);
  });

  it('laisse la valeur à null pour un bien non valorisable', () => {
    const p = projeterBien({ flux: { loyerAnnuel: 0, chargesAnnuelles: 0 }, credits: [], valeurActuelle: null, hypotheses: HYPOTHESES_PAR_DEFAUT, nbPeriodes: 2, aujourdhui: AUJ });
    expect(p[0].valeur).toBeNull();
    expect(p[0].valeurNette).toBeNull();
  });
});

describe('sommeProjections', () => {
  it('additionne les biens période par période, un bien non valorisable comptant pour 0 en valeur', () => {
    const base = { credits: [], hypotheses: HYPOTHESES_PAR_DEFAUT, nbPeriodes: 2, aujourdhui: AUJ };
    const a = projeterBien({ ...base, flux: { loyerAnnuel: 6_000, chargesAnnuelles: 1_000 }, valeurActuelle: 100_000 });
    const b = projeterBien({ ...base, flux: { loyerAnnuel: 4_000, chargesAnnuelles: 0 }, valeurActuelle: null });
    const s = sommeProjections([a, b]);
    expect(s[0].cashflow).toBe(9_000);
    expect(s[0].valeur).toBe(100_000);
    expect(sommeProjections([b])[0].valeur).toBeNull();
  });
});
