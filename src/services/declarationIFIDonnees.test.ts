import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { calculerDonneesIFI, plafonnementRetenu, type DonneesIFI } from './declarationIFIDonnees';
import type { DeclarationIFIActifRecord, DeclarationIFIDetteRecord, DeclarationIFIRecord } from './declarationIFIService';

const declaration = (d: Partial<DeclarationIFIRecord> = {}): DeclarationIFIRecord => ({
  id: 'd', user_id: 'u', annee: 2026, deduire_ifi_theorique: true, biens_professionnels_exoneres: false,
  dons_france: null, dons_ue: null, impots_revenus_n1: null, revenus_n1: null, revenus_hors_2042: null,
  impot_etranger: null, valeur_biens_etranger: null,
  created_at: '', updated_at: '', ...d,
});
const actif = (a: Partial<DeclarationIFIActifRecord>): DeclarationIFIActifRecord => ({
  id: 'a', declaration_id: 'd', user_id: 'u', asset_id: 'asset', denomination: null, ordre: 0,
  categorie: null, valeur: null, fraction_taxable: null, exclu: false, created_at: '', updated_at: '', ...a,
});
const dette = (x: Partial<DeclarationIFIDetteRecord>): DeclarationIFIDetteRecord => ({
  id: 'x', declaration_id: 'd', user_id: 'u', emprunt_id: 'e', denomination: null, ordre: 0,
  ligne: null, montant: null, categorie_bien: null, exclue: false, created_at: '', updated_at: '', ...x,
});

function donnees(d: Partial<DonneesIFI> = {}): DonneesIFI {
  return {
    declaration: declaration(),
    actifs: [actif({})],
    dettes: [],
    prerempliActifs: { a: { assetId: 'asset', denomination: 'Maison', categorie: 'residencePrincipale', valeur: 4_000_000, aVerifier: [] } },
    prerempliDettes: {},
    ...d,
  };
}

describe('calculerDonneesIFI', () => {
  it('TEST-4 depuis le préremplissage et la 2042, revenus étrangers ajoutés à 9PX', () => {
    const d = donnees({ declaration: declaration({ revenus_hors_2042: 7_000 }) });
    const r = calculerDonneesIFI(2026, d, { impots: 28_866, revenus: 116_280 });
    expect(r.case9AA).toBe(2_800_000);
    expect(r.case9PX).toBe(123_280);
    expect(r.ifiNet).toBe(13_553);
  });

  it('surcharges : valeur et catégorie saisies remplacent le préremplissage ; actif écarté ignoré', () => {
    const r = calculerDonneesIFI(2026, donnees({
      actifs: [actif({ valeur: 2_000_000, categorie: 'autreBati' }), actif({ id: 'b', asset_id: null, valeur: 500_000, categorie: 'indirect' }), actif({ id: 'c', exclu: true, valeur: 9_000_000 })],
    }), null);
    expect(r.case9AA).toBe(0);
    expect(r.case9AB).toBe(2_000_000);
    expect(r.case9CA).toBe(500_000);
  });

  it('dette in fine préremplie : dégressive, sauf montant saisi', () => {
    const prerempliDettes: DonneesIFI['prerempliDettes'] = {
      x: { empruntId: 'e', denomination: 'Prêt', ligne: '9GH', montant: 1_000_000, aVerifier: [],
        inFine: { montantEmprunte: 1_000_000, anneesEcoulees: 3, dureeAnnees: 10 } },
    };
    const base = { declaration: declaration({ deduire_ifi_theorique: false }), prerempliDettes };
    expect(calculerDonneesIFI(2026, donnees({ ...base, dettes: [dette({})] }), null).case9GH).toBe(700_000);
    expect(calculerDonneesIFI(2026, donnees({ ...base, dettes: [dette({ montant: 900_000 })] }), null).case9GH).toBe(900_000);
  });
});

describe('plafonnementRetenu', () => {
  it('sans 2042 ni saisie, pas de 9PX', () => {
    expect(plafonnementRetenu(donnees(), null)).toEqual({ impots: 0, revenus: null });
  });
  it('saisie prioritaire sur la 2042', () => {
    const d = donnees({ declaration: declaration({ impots_revenus_n1: 1_000, revenus_n1: 50_000 }) });
    expect(plafonnementRetenu(d, { impots: 9, revenus: 9 })).toEqual({ impots: 1_000, revenus: 50_000 });
  });
});
