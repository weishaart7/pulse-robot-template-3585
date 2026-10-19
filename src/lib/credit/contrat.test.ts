import { describe, expect, it } from 'vitest';
import {
  actualiserEmprunt,
  assuranceMensuelleAu,
  capitalRestantDuAu,
  construireTableau,
  contratDepuisEmprunt,
  echeancesRestantes,
  mensualiteConstante,
  type ContratCredit,
} from './contrat';

const contrat = (o: Partial<ContratCredit> = {}): ContratCredit => ({
  capitalInitial: 200_000,
  datePremiereEcheance: new Date(2020, 0, 5),
  dureeTotaleMois: 240,
  tauxAnnuel: 3.6,
  inFine: false,
  differeMois: 0,
  differeType: 'partiel',
  assuranceMode: null,
  assuranceValeur: 0,
  frais: 0,
  ...o,
});

const somme = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('mensualiteConstante', () => {
  it('applique la formule du prêt amortissable', () => {
    // 200 000 € à 3,6 % sur 20 ans : r = 0,003 ; M = C·r / (1 − (1+r)^−240).
    expect(mensualiteConstante(200_000, 3.6, 240)).toBeCloseTo(1170.22, 2);
  });
  it('divise le capital à taux zéro (PTZ)', () => {
    expect(mensualiteConstante(24_000, 0, 120)).toBe(200);
  });
});

describe('construireTableau — amortissable', () => {
  const t = construireTableau(contrat());

  it('compte une ligne par échéance et solde le capital', () => {
    expect(t.lignes).toHaveLength(240);
    expect(t.lignes[239].capitalRestantDu).toBeCloseTo(0, 6);
    expect(somme(t.lignes.map((l) => l.capital))).toBeCloseTo(200_000, 4);
  });

  it('garde une échéance constante égale à la mensualité', () => {
    expect(t.mensualiteHorsAssurance).toBeCloseTo(1170.22, 2);
    expect(t.lignes[0].echeance).toBeCloseTo(1170.22, 2);
    expect(t.lignes[120].echeance).toBeCloseTo(1170.22, 2);
  });

  it('première échéance : intérêts sur le capital initial', () => {
    expect(t.lignes[0].interet).toBeCloseTo(600, 6);
    expect(t.lignes[0].capital).toBeCloseTo(570.22, 2);
  });

  it('intérêts totaux = total payé − capital emprunté', () => {
    expect(t.totalInterets).toBeCloseTo(somme(t.lignes.map((l) => l.echeance)) - 200_000, 4);
    expect(t.coutTotal).toBeCloseTo(t.totalInterets, 6);
  });

  it('date de fin = dernière échéance', () => {
    expect(t.dateFin).toEqual(new Date(2039, 11, 1));
  });
});

describe('construireTableau — in fine', () => {
  const t = construireTableau(contrat({ inFine: true, dureeTotaleMois: 120 }));
  it('intérêts seuls puis capital à la dernière échéance', () => {
    expect(t.lignes[0].echeance).toBeCloseTo(600, 6);
    expect(t.lignes[0].capitalRestantDu).toBe(200_000);
    expect(t.lignes[119].capital).toBe(200_000);
    expect(t.lignes[119].capitalRestantDu).toBe(0);
    expect(t.totalInterets).toBeCloseTo(600 * 120, 4);
  });
});

describe('construireTableau — différé', () => {
  it('partiel : intérêts seuls pendant le différé, puis amortissement sur les mois restants', () => {
    const t = construireTableau(contrat({ differeMois: 12, differeType: 'partiel' }));
    expect(t.lignes[0].differe).toBe(true);
    expect(t.lignes[11].echeance).toBeCloseTo(600, 6);
    expect(t.lignes[11].capitalRestantDu).toBe(200_000);
    expect(t.mensualiteHorsAssurance).toBeCloseTo(mensualiteConstante(200_000, 3.6, 228), 6);
    expect(t.lignes[239].capitalRestantDu).toBeCloseTo(0, 6);
  });

  it('total : rien payé, intérêts capitalisés', () => {
    const t = construireTableau(contrat({ differeMois: 2, differeType: 'total' }));
    expect(t.lignes[0].echeance).toBe(0);
    expect(t.lignes[0].capitalRestantDu).toBeCloseTo(200_600, 6);
    expect(t.lignes[1].capitalRestantDu).toBeCloseTo(200_600 * 1.003, 6);
    expect(t.lignes[239].capitalRestantDu).toBeCloseTo(0, 6);
    // Le capital emprunté et les intérêts capitalisés sont remboursés : identité de coût conservée.
    expect(t.totalInterets).toBeCloseTo(somme(t.lignes.map((l) => l.echeance)) - 200_000, 4);
  });
});

describe('construireTableau — assurance et frais', () => {
  it('taux sur capital initial : montant constant', () => {
    const t = construireTableau(contrat({ assuranceMode: 'taux_capital_initial', assuranceValeur: 0.3 }));
    expect(t.lignes[0].assurance).toBeCloseTo(50, 6);
    expect(t.lignes[200].assurance).toBeCloseTo(50, 6);
    expect(t.totalAssurance).toBeCloseTo(50 * 240, 4);
  });
  it('taux sur capital restant dû : décroissant', () => {
    const t = construireTableau(contrat({ assuranceMode: 'taux_crd', assuranceValeur: 0.3 }));
    expect(t.lignes[0].assurance).toBeCloseTo(50, 6);
    expect(t.lignes[200].assurance).toBeLessThan(15);
  });
  it('montant mensuel fixe', () => {
    const t = construireTableau(contrat({ assuranceMode: 'montant', assuranceValeur: 42 }));
    expect(t.totalAssurance).toBeCloseTo(42 * 240, 6);
  });
  it('coût total = intérêts + assurance + frais', () => {
    const t = construireTableau(contrat({ assuranceMode: 'montant', assuranceValeur: 42, frais: 1_500 }));
    expect(t.coutTotal).toBeCloseTo(t.totalInterets + 42 * 240 + 1_500, 4);
  });
});

describe('capital restant dû à une date', () => {
  const t = construireTableau(contrat());
  it('avant la première échéance : capital emprunté', () => {
    expect(capitalRestantDuAu(t, 200_000, new Date(2019, 11, 20))).toBe(200_000);
    expect(echeancesRestantes(t, new Date(2019, 11, 20))).toBe(240);
  });
  it("l'échéance du mois en cours est réputée payée", () => {
    expect(capitalRestantDuAu(t, 200_000, new Date(2020, 0, 1))).toBeCloseTo(t.lignes[0].capitalRestantDu, 6);
    expect(echeancesRestantes(t, new Date(2020, 0, 1))).toBe(239);
  });
  it('après la fin : 0', () => {
    expect(capitalRestantDuAu(t, 200_000, new Date(2045, 0, 1))).toBeCloseTo(0, 6);
    expect(echeancesRestantes(t, new Date(2045, 0, 1))).toBe(0);
  });
});

describe('actualiserEmprunt', () => {
  const base = {
    capital_initial: 200_000,
    date_premiere_echeance: '2020-01-05',
    duree_totale_mois: 240,
    taux_interet: 3.6,
    mode_amortissement: 'Amortissable',
    differe_mois: null,
    differe_type: null,
    assurance_mode: null,
    assurance_valeur: null,
    frais_dossier: null,
    frais_garantie: null,
    capital_restant_du: 999_999,
    duree_restante: 1,
    mensualite: undefined,
  };

  it('remplace capital restant dû et durée restante par le calcul', () => {
    const e = actualiserEmprunt(base, new Date(2020, 0, 15));
    expect(e.capital_restant_du).toBeCloseTo(199_429.78, 2);
    expect(e.duree_restante).toBe(239);
    expect(e.mensualite).toBeCloseTo(1170.22, 2);
  });

  it('contrat complet : ignore une mensualité saisie qui le contredit (capital seul, sans intérêts)', () => {
    // 200 000 € sur 240 mois : 833,33 € de capital seul, alors que l'échéance réelle est de 1 170,22 €.
    expect(actualiserEmprunt({ ...base, mensualite: 833.33 }, new Date(2020, 0, 15)).mensualite).toBeCloseTo(1170.22, 2);
  });

  it('contrat incomplet : saisie manuelle inchangée', () => {
    const e = { ...base, capital_initial: null };
    expect(actualiserEmprunt(e)).toBe(e);
    expect(contratDepuisEmprunt({ ...base, date_premiere_echeance: null })).toBeNull();
  });
});

describe('assuranceMensuelleAu', () => {
  const emprunt = {
    capital_initial: 200_000, date_premiere_echeance: '2020-01-05', duree_totale_mois: 240, taux_interet: 3.6,
    mode_amortissement: 'Amortissable', differe_mois: null, differe_type: null,
    assurance_mode: 'taux_capital_initial', assurance_valeur: 0.3,
    frais_dossier: null, frais_garantie: null, capital_restant_du: 150_000,
  } as const;

  it("contrat complet : assurance de l'échéance du mois", () => {
    expect(assuranceMensuelleAu(emprunt, new Date(2021, 5, 10))).toBeCloseTo(50, 6);
  });

  it('prêt remboursé : plus d\'assurance', () => {
    expect(assuranceMensuelleAu(emprunt, new Date(2045, 0, 1))).toBe(0);
  });

  it('sans contrat : montant saisi, ou taux sur le capital restant dû', () => {
    const sansContrat = { ...emprunt, capital_initial: null };
    expect(assuranceMensuelleAu({ ...sansContrat, assurance_mode: 'montant', assurance_valeur: 42 })).toBe(42);
    expect(assuranceMensuelleAu({ ...sansContrat, assurance_mode: 'taux_crd', assurance_valeur: 0.24 })).toBeCloseTo(30, 6);
    expect(assuranceMensuelleAu({ ...sansContrat, assurance_mode: null })).toBe(0);
  });
});
