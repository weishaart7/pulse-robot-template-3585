import { describe, expect, it } from 'vitest';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import {
  capitalRestantDuAu,
  construireEcheancier,
  creditsDuBien,
  mensualiteConstante,
  parametresDepuisEmprunt,
  periodesCredit,
  syntheseCredits,
} from './credit';
import { computeAmortissement, creditAnnuelBien } from './rentabilite';

const REF = new Date(2026, 0, 15); // janvier 2026

const emprunt = (overrides: Partial<Emprunt> = {}): Emprunt => ({
  id: 'e1', user_id: 'u', nature: 'Prêt immobilier', libelle: 'Prêt', asset_id: 'a1',
  capital_restant_du: 120_000, taux_interet: 3, mensualite: undefined, duree_restante: 120,
  mode_amortissement: 'Amortissable', detenteur: 'Couple', qualification_bien: 'Bien commun',
  created_at: REF.toISOString(), updated_at: REF.toISOString(),
  ...overrides,
} as Emprunt);

describe('construireEcheancier', () => {
  it('amortit un prêt à mensualité constante jusqu’à zéro sur la durée restante', () => {
    const p = parametresDepuisEmprunt(emprunt())!;
    const e = construireEcheancier(p);
    expect(e.complet).toBe(true);
    expect(e.echeances).toHaveLength(120);
    expect(e.echeances[119].capitalRestantDu).toBeCloseTo(0, 2);
    const m = mensualiteConstante(120_000, 3, 120);
    expect(e.echeances[0].interet + e.echeances[0].capital).toBeCloseTo(m, 6);
    expect(e.echeances[0].interet).toBeCloseTo(300, 6); // 120 000 × 3 % / 12
    expect(e.echeances[0].mois.getMonth()).toBe(1); // première échéance le mois suivant la référence
  });

  it('déduit la durée de la mensualité saisie quand elle est fournie', () => {
    const m = mensualiteConstante(120_000, 3, 120);
    const e = construireEcheancier(parametresDepuisEmprunt(emprunt({ mensualite: m, duree_restante: undefined }))!);
    expect(e.complet).toBe(true);
    expect(e.echeances).toHaveLength(120);
  });

  it('rembourse le capital en une fois à la dernière échéance d’un prêt in fine', () => {
    const e = construireEcheancier(parametresDepuisEmprunt(emprunt({ mode_amortissement: 'In fine', duree_restante: 24 }))!);
    expect(e.echeances).toHaveLength(24);
    expect(e.echeances[0].capital).toBe(0);
    expect(e.echeances[0].interet).toBeCloseTo(300, 6);
    expect(e.echeances[23].capital).toBe(120_000);
    expect(e.echeances[23].capitalRestantDu).toBe(0);
  });

  it('signale un échéancier incomplet sans mensualité ni durée, en gardant le capital restant dû', () => {
    const e = construireEcheancier(parametresDepuisEmprunt(emprunt({ duree_restante: undefined }))!);
    expect(e.complet).toBe(false);
    expect(e.echeances).toHaveLength(0);
    expect(capitalRestantDuAu(e, REF)).toBe(120_000);
  });

  it('signale une mensualité qui ne couvre pas les intérêts', () => {
    expect(construireEcheancier(parametresDepuisEmprunt(emprunt({ mensualite: 200, duree_restante: undefined }))!).complet).toBe(false);
  });
});

describe('creditsDuBien / syntheseCredits / periodesCredit', () => {
  const asset = { id: 'a1', nature: 'Immeubles locatifs (loués nus)', financement_actif: true, financement_duree_mois: 240, financement_taux_credit: 4 } as Asset;

  it('retient l’emprunt Patrimoine relié plutôt que les champs Financement', () => {
    const credits = creditsDuBien(asset, [emprunt()], 100, 200_000);
    expect(credits).toHaveLength(1);
    expect(credits[0].source).toBe('emprunt');
  });

  it('se replie sur les champs Financement sans emprunt relié', () => {
    const credits = creditsDuBien(asset, [emprunt({ asset_id: 'autre' })], 100, 200_000);
    expect(credits[0].source).toBe('financement');
  });

  it('pondère par la part du foyer dans l’emprunt', () => {
    // Bien propre de l'utilisateur détenu à 50 % : part de l'emprunt selon sa qualification.
    const credits = creditsDuBien(asset, [emprunt({ qualification_bien: 'Bien propre', detenteur: 'Époux 1', pourcentage_utilisateur: 50 })], 100, 0);
    const s = syntheseCredits(credits, REF);
    const s100 = syntheseCredits(credits, REF, false);
    expect(s.capitalRestantDu).toBeCloseTo(s100.capitalRestantDu * credits[0].part, 6);
  });

  it('donne le capital restant dû et les intérêts des 12 prochaines échéances', () => {
    const s = syntheseCredits(creditsDuBien(asset, [emprunt()], 100, 0), REF, false);
    expect(s.capitalRestantDu).toBe(120_000);
    expect(s.interetsAnnee).toBeGreaterThan(3_000);
    expect(s.interetsAnnee).toBeLessThan(3_600);
  });

  it('découpe le crédit en périodes de 12 mois jusqu’au solde', () => {
    const p = periodesCredit(creditsDuBien(asset, [emprunt()], 100, 0), 12, REF);
    expect(p[9].capitalRestantDuFin).toBeCloseTo(0, 2);
    expect(p[10].remboursements).toBe(0);
    const totalCapital = p.reduce((s, x) => s + x.remboursements - x.interets, 0);
    expect(totalCapital).toBeCloseTo(120_000, 2);
  });
});

describe('creditAnnuelBien', () => {
  it('reproduit computeAmortissement × facteur sans emprunt relié', () => {
    const asset = {
      id: 'a1', nature: 'Immeubles locatifs (loués nus)', montant_immeuble: 200_000, financement_actif: true,
      financement_duree_mois: 240, financement_taux_credit: 3, financement_taux_assurance: 0.3, financement_apport: 0,
      date_acquisition: '2026-01-01',
    } as Asset;
    const brut = computeAmortissement(asset, REF);
    const r = creditAnnuelBien(asset, [], 0.5, true, REF);
    expect(r.interetsAnnee).toBeCloseTo(brut.interetsAnnee * 0.5, 6);
    expect(r.mensualiteAssurance).toBeCloseTo(brut.mensualiteAssurance * 0.5, 6);
  });
});
