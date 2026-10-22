import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { toImmeuble2044Input, toPartSociete2044Input, type Declaration2044ImmeubleRecord, type Declaration2044PartRecord } from './declaration2044Service';

const immeubleVide = (overrides: Partial<Declaration2044ImmeubleRecord> = {}): Declaration2044ImmeubleRecord => ({
  id: 'i1', declaration_id: 'd1', user_id: 'u1', asset_id: 'a1', denomination: null, ordre: 0,
  loyers_bruts: null, depenses_charge_locataires: null, recettes_diverses: null, valeur_locative_reservee: null,
  frais_administration_gestion: null, nombre_locaux: null, primes_assurance: null, travaux: null,
  travaux_renovation_energetique: null, charges_non_recuperees: null, indemnites_eviction: null,
  taxes_foncieres: null, taux_deduction_specifique: null, provisions_charges: null,
  regularisation_provisions: null, interets_emprunt: null, reintegration_supplement_deduction: null,
  created_at: '', updated_at: '', ...overrides,
});

describe('toImmeuble2044Input', () => {
  it('NULL garde la valeur préremplie, une valeur la surcharge (0 compris)', () => {
    const input = toImmeuble2044Input(
      immeubleVide({ taxes_foncieres: 1_500, travaux: 0 }),
      { denomination: 'Appartement Lyon', loyersBruts: 12_000, taxesFoncieres: 1_200, travaux: 800, interetsEmprunt: 2_000 },
    );
    expect(input).toMatchObject({
      id: 'i1', assetId: 'a1', denomination: 'Appartement Lyon',
      loyersBruts: 12_000, taxesFoncieres: 1_500, travaux: 0, interetsEmprunt: 2_000,
    });
  });

  it('immeuble saisi sans actif ni préremplissage : montants à 0, dénomination saisie', () => {
    const input = toImmeuble2044Input(immeubleVide({ asset_id: null, denomination: 'Garage', loyers_bruts: 900 }));
    expect(input).toMatchObject({ assetId: undefined, denomination: 'Garage', loyersBruts: 900 });
  });
});

describe('toPartSociete2044Input', () => {
  it('surcharge les montants de l\'attestation', () => {
    const record: Declaration2044PartRecord = {
      id: 'p1', declaration_id: 'd1', user_id: 'u1', asset_id: null, denomination: 'SCPI X', ordre: 0,
      revenus_bruts: 3_000, frais_et_charges: null, dont_renovation_energetique: null, interets_emprunt: null,
      created_at: '', updated_at: '',
    };
    expect(toPartSociete2044Input(record, { revenusBruts: 2_500, fraisEtCharges: 400 }))
      .toMatchObject({ denomination: 'SCPI X', revenusBruts: 3_000, fraisEtCharges: 400 });
  });
});
