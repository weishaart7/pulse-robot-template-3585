import { describe, expect, it } from 'vitest';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import {
  estimationAmortissementsLMNP,
  fraisAcquisitionReels,
  simulerRevente,
  travauxReelsParDefaut,
  type HypothesesRevente,
} from './revente';

const bien = (overrides: Partial<Asset> = {}): Asset => ({
  id: 'a1',
  nature: 'Immeubles locatifs (loués nus)',
  type_location: 'Location nue',
  montant_immeuble: 200_000,
  frais_notaire: 15_000,
  frais_agence: 5_000,
  frais_bancaires: 2_000,
  date_acquisition: '2016-03-01',
  detenteur: 'Époux 1',
  qualification_bien: 'Bien propre',
  pourcentage_utilisateur: 100,
  ...overrides,
} as Asset);

const hyp = (overrides: Partial<HypothesesRevente> = {}): HypothesesRevente => ({
  dateVente: new Date(2027, 5, 1),
  prixVente: 320_000,
  fraisVente: 0,
  travauxReels: 0,
  amortissementsDeduits: 0,
  residenceServices: false,
  penalitesRemboursement: null,
  ...overrides,
});

describe('valeurs par défaut', () => {
  it('ne retient en frais réels que notaire et agence', () => {
    expect(fraisAcquisitionReels(bien())).toBe(20_000);
    expect(fraisAcquisitionReels(bien({ frais_notaire: 0, frais_agence: 0, frais_acquisition: 9_000 }))).toBe(9_000);
  });

  it('propose les travaux réels selon l’usage du bien', () => {
    const t = { travaux_renovation: 30_000, travaux_construction: 10_000 };
    expect(travauxReelsParDefaut(bien(t))).toBe(10_000); // loué nu : construction seule
    expect(travauxReelsParDefaut(bien({ ...t, nature: 'Résidences secondaires', type_location: undefined }))).toBe(40_000);
    expect(travauxReelsParDefaut(bien({ ...t, nature: 'Immeubles locatifs (LMNP)' }))).toBe(0);
  });

  it('estime les amortissements LMNP de l’immeuble (hors mobilier), bornés à la durée de chaque composant', () => {
    const lmnp = bien({ nature: 'Immeubles locatifs (LMNP)', meubles: 10_000, zone_bien: 'Grandes villes', date_acquisition: '2020-01-01' });
    const a = estimationAmortissementsLMNP(lmnp, new Date(2030, 0, 1));
    // Bâtiment 160 000 € (terrain 20 %) : 10 ans de chaque composant (tous ≥ 12 ans sauf aucun).
    const annuel = 160_000 * (0.225 / 12 + 0.0875 / 25 + 0.1 / 25 + 0.075 / 30 + 0.5125 / 75);
    expect(a).toBeCloseTo(annuel * 10, 0);
    expect(estimationAmortissementsLMNP(bien({ nature: 'Immeubles locatifs (LMNP)', date_acquisition: undefined }), new Date())).toBe(0);
  });
});

describe('simulerRevente', () => {
  it('calcule prix net, plus-value brute, impôt et net perçu sans crédit', () => {
    const r = simulerRevente(bien(), [], hyp({ fraisVente: 10_000 }));
    expect(r.statut).toBe('ok');
    if (r.statut !== 'ok') return;
    expect(r.prixNet).toBe(310_000);
    expect(r.plusValueBrute).toBe(90_000); // 310 000 − 200 000 − 20 000
    expect(r.impot).toBeGreaterThan(0);
    expect(r.netPercu).toBeCloseTo(310_000 - r.impot, 6);
  });

  it('exonère la résidence principale', () => {
    const r = simulerRevente(bien({ nature: 'Résidence principale', type_location: undefined }), [], hyp());
    expect(r.statut === 'ok' && r.impot).toBe(0);
  });

  it('déduit le capital restant dû à la date de vente et les pénalités au plafond légal', () => {
    const emprunt = {
      id: 'e', asset_id: 'a1', libelle: 'Prêt', capital_restant_du: 100_000, taux_interet: 4, duree_restante: 240,
      mode_amortissement: 'Amortissable', detenteur: 'Époux 1', qualification_bien: 'Bien propre', pourcentage_utilisateur: 100,
      created_at: '2027-05-15T00:00:00Z', updated_at: '2027-05-15T00:00:00Z',
    } as Emprunt;
    const r = simulerRevente(bien(), [emprunt], hyp());
    if (r.statut !== 'ok') throw new Error('hors périmètre');
    // Vente le mois suivant la saisie : une échéance payée.
    expect(r.capitalRestantDu).toBeLessThan(100_000);
    expect(r.capitalRestantDu).toBeGreaterThan(99_000);
    // 6 mois d'intérêts (≈ 2 % du CRD) < 3 % : plafond = 6 mois d'intérêts.
    expect(r.penalites).toBeCloseTo(r.capitalRestantDu * 0.04 / 2, 6);
    const sansPenalites = simulerRevente(bien(), [emprunt], hyp({ penalitesRemboursement: 0 }));
    expect(sansPenalites.statut === 'ok' && sansPenalites.penalites).toBe(0);
  });

  it('réintègre les amortissements LMNP, sauf en résidence services', () => {
    const lmnp = bien({ nature: 'Immeubles locatifs (LMNP)', type_location: undefined });
    const avec = simulerRevente(lmnp, [], hyp({ amortissementsDeduits: 30_000 }));
    const residence = simulerRevente(lmnp, [], hyp({ amortissementsDeduits: 30_000, residenceServices: true }));
    if (avec.statut !== 'ok' || residence.statut !== 'ok') throw new Error('hors périmètre');
    expect(avec.impot).toBeGreaterThan(residence.impot);
  });

  it('applique la part du foyer selon la règle de Patrimoine (indivision : pourcentages utilisateur + conjoint)', () => {
    const plein = simulerRevente(bien(), [], hyp());
    const moitie = simulerRevente(bien({ qualification_bien: 'Indivision', pourcentage_utilisateur: 30, pourcentage_conjoint: 20 }), [], hyp());
    if (plein.statut !== 'ok' || moitie.statut !== 'ok') throw new Error('hors périmètre');
    expect(moitie.prixNet).toBeCloseTo(plein.prixNet / 2, 6);
  });

  it('signale les cas hors périmètre', () => {
    expect(simulerRevente(bien({ nature: 'Immeubles locatifs (LMP)' }), [], hyp()).statut).toBe('hors_perimetre');
    expect(simulerRevente(bien({ mode_detention: 'Nue-propriété' }), [], hyp()).statut).toBe('hors_perimetre');
    expect(simulerRevente(bien({ nature: 'Parts de groupements fonciers' }), [], hyp()).statut).toBe('hors_perimetre');
  });
});
