import { describe, expect, it } from 'vitest';
import { calculerInvestissementsOutreMer, REGLES_OUTRE_MER } from './calculerInvestissementsOutreMer';
import { calculerPlafonnementNiches } from './calculerPlafonnementNiches';
import { calculerImpot } from './calculerImpot';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { FoyerFiscalInput, ReductionsCreditsImpotInput } from './types';

/** Couple 1AJ 300 000 € / 1BJ 200 000 € : RNI 470 890 €, impôt 164 948 € (simulateur officiel 2026). */
const COUPLE: FoyerFiscalInput = {
  situationFamille: 'marie', lieuResidence: 'metropole', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: false, ancienParentIsole: false, invaliditeDeclarant1: false,
  invaliditeDeclarant2: false, ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
  veufAncienCombattant: false, veuveDeGuerre: false,
};
const parts = calculerPartsFiscales(COUPLE);
/** Baisse d'impôt, avec un crédit courant optionnel (7DB 20 000 € + 7DG → 10 000 €). */
const baisse = (o: Partial<ReductionsCreditsImpotInput>, creditCourant = 0) => {
  const om = calculerInvestissementsOutreMer(o as ReductionsCreditsImpotInput);
  const p = calculerPlafonnementNiches({ courants: creditCourant, esus: 0, outreMer: om.avantagesPlafonnes });
  const impot = calculerImpot(470890, parts, 'marie', 0, 'metropole', 0, 0, 0, 0, 0, 0,
    om.reductions, om.credit + creditCourant, 0, p.excedent).impotNet;
  return 164948 - impot;
};

describe('investissements outre-mer', () => {
  it('base', () => {
    expect(calculerImpot(470890, parts, 'marie').impotNet).toBe(164948);
    expect(Object.keys(REGLES_OUTRE_MER)).toHaveLength(100); // 93 + 7 cases de la déclaration 2027
  });
  it('cases seules : plafonds propres et plafonnement global', () => {
    const cas: [Partial<ReductionsCreditsImpotInput>, number][] = [
      [{ caseHob: 100000 }, 40000], [{ caseHot: 100000 }, 30600], [{ caseHoa: 100000 }, 100000],
      [{ caseHoz: 50000 }, 18000], [{ caseHgu: 50000 }, 18000], [{ caseHgw: 100000 }, 18000],
      [{ caseHgs: 50000 }, 46000], [{ caseHgs: 100000 }, 56945], [{ caseHgt: 100000 }, 77400],
      [{ caseHyj: 100000 }, 88000], [{ caseHls: 50000 }, 46000], [{ caseHlw: 50000 }, 18000],
      [{ caseHja: 100000 }, 100000], [{ caseHqa: 50000 }, 0],
    ];
    for (const [o, attendu] of cas) expect(baisse(o)).toBe(attendu);
  });
  it('cumuls : plafond commun le plus bas, cases sans plafond à part', () => {
    expect(baisse({ caseHob: 30000, caseHoi: 30000 })).toBe(36000);
    expect(baisse({ caseHob: 30000, caseHot: 30000 })).toBe(30600);
    expect(baisse({ caseHoa: 20000, caseHoz: 20000 })).toBe(38000);
    expect(baisse({ caseHyj: 20000, caseHoz: 20000 })).toBe(32000);
    expect(baisse({ caseHgs: 30000, caseHoz: 10000 })).toBe(34800);
  });
  it('avec un crédit courant de 10 000 € : parts 44 %, 34 %, 30 %, 0 %', () => {
    expect(baisse({ caseHgs: 30000 }, 10000)).toBe(34800);
    expect(baisse({ caseHgt: 30000 }, 10000)).toBe(37800);
    expect(baisse({ caseHyj: 30000 }, 10000)).toBe(39000);
    expect(baisse({ caseHob: 30000 }, 10000)).toBe(40000);
    expect(baisse({ caseHug: 30000 }, 10000)).toBe(18000);
  });
});
