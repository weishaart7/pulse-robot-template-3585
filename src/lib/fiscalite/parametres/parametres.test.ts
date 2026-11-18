import { describe, expect, it } from 'vitest';
import { ANNEE_REVENUS_PAR_DEFAUT, anneesRevenusDisponibles, PARAMETRES_PAR_DEFAUT, parametresFiscaux } from '.';
import { calculerImpot } from '../calculerImpot';
import { calculerPartsFiscales } from '../calculerPartsFiscales';
import type { FoyerFiscalInput } from '../types';

describe('parametresFiscaux', () => {
  it('le millésime par défaut est celui des revenus 2025', () => {
    expect(ANNEE_REVENUS_PAR_DEFAUT).toBe(2025);
    expect(PARAMETRES_PAR_DEFAUT.anneeRevenus).toBe(2025);
    expect(anneesRevenusDisponibles()).toEqual([2025, 2026]);
  });

  it('refuse un millésime absent plutôt que de retomber sur un autre', () => {
    expect(() => parametresFiscaux(2024)).toThrow('revenus 2024');
  });

  it('chaque millésime porte sa propre année et un barème croissant terminé par Infinity', () => {
    for (const annee of anneesRevenusDisponibles()) {
      const { anneeRevenus, impot } = parametresFiscaux(annee);
      expect(anneeRevenus).toBe(annee);
      const seuils = impot.bareme.map(t => t.seuil);
      expect([...seuils].sort((a, b) => a - b)).toEqual(seuils);
      expect(seuils[seuils.length - 1]).toBe(Infinity);
    }
  });

  it('revenus 2026 provisoire : seuls les dons et la FCPI diffèrent de 2025 (plafonds à 75 %, réintégration CDHR, 7GQ à 25 %) (calc-2027.cgi)', () => {
    const p2025 = parametresFiscaux(2025);
    const p2026 = parametresFiscaux(2026);
    expect(p2025.statut).toBe('definitif');
    expect(p2026.statut).toBe('provisoire');
    expect(p2026.reductionsCredits.plafondDons75Premiere).toBe(2000);
    expect([p2025.cdhr.donsReintegres, p2026.cdhr.donsReintegres]).toEqual([false, true]);
    expect(p2026.reductionsCredits.tauxFcpi).toEqual({ case7gr: 0, case7gq: 0.25 });
    const sansDons = (p: typeof p2025) => ({ ...p, anneeRevenus: 0, statut: null, source: null,
      reductionsCredits: { ...p.reductionsCredits, plafondDons75Premiere: 0, plafondDons75Annee: 0,
        tauxFcpi: { case7gr: 0, case7gq: 0 } },
      cdhr: { ...p.cdhr, donsReintegres: null } });
    expect(sansDons(p2026)).toEqual(sansDons(p2025));
  });

  it('les paramètres passés au moteur sont bien ceux appliqués', () => {
    const foyer: FoyerFiscalInput = {
      situationFamille: 'celibataire', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
      enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
      invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
      veufAncienCombattant: false, veuveDeGuerre: false,
    };
    const fictif = { ...PARAMETRES_PAR_DEFAUT, impot: { ...PARAMETRES_PAR_DEFAUT.impot, bareme: [{ seuil: Infinity, taux: 0.1 }] } };
    const parts = calculerPartsFiscales(foyer, fictif);
    const result = calculerImpot(50000, parts, 'celibataire', 0, 'metropole', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, fictif);
    expect(result.impotApresPlafonnement).toBeCloseTo(5000, 6);
    expect(result.tmi).toBe(0.1);
  });
});
