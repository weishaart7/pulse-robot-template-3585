import { describe, expect, it } from 'vitest';
import type { Asset, AssetCharge, AssetRevenu } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { classerCharge, interetsEmpruntAnnee, montantChargeAnnee, preremplirImmeuble, preremplirPart, repartirActifs2044 } from './preremplissage2044';

const asset = (o: Partial<Asset> = {}): Asset => ({ id: 'a1', nature: 'Immeubles locatifs (loués nus)', type_location: 'Location nue', financement_actif: false, ...o } as Asset);
const revenu = (o: Partial<AssetRevenu> = {}): AssetRevenu => ({ asset_id: 'a1', nature: 'Loyers hors charges', montant: 1_000, periodicite: 'Mensuelle', date_debut: '2024-01-01', ...o } as AssetRevenu);
const charge = (o: Partial<AssetCharge> = {}): AssetCharge => ({
  asset_id: 'a1', type_charge: 'Charges courantes', denomination: 'Taxe foncière', debiteur: 'Couple',
  montant: 1_200, unite: '€', periodicite: 'annuelle', date_debut: '2024-01-01', duree_type: 'Indéterminée', ...o,
});

describe('classerCharge', () => {
  it.each([
    ['Taxe foncière', 'taxesFoncieres'],
    ['Assurance propriétaire non occupant (PNO)', 'primesAssurance'],
    ['Charges de copropriété', 'provisionsCharges'],
    ['Frais de gestion locative', 'fraisAdministrationGestion'],
    ['Travaux salle de bain', 'travaux'],
  ])('%s → %s', (libelle, ligne) => {
    expect(classerCharge(libelle)).toEqual({ ligne, aVerifier: false });
  });

  it.each(['Taxe d’enlèvement des ordures ménagères', 'TEOM', 'Assurance emprunteur', 'Assurance prêt', 'Eau', 'Électricité parties communes', 'Chauffage collectif', 'Charges locatives', 'Taxe sur les bureaux'])(
    '%s : écartée de la 2044', (libelle) => {
      expect(classerCharge(libelle)).toEqual({ ligne: null, aVerifier: false });
    });

  it('« taxe » seule : ligne 227, à vérifier', () => {
    expect(classerCharge('Taxe')).toEqual({ ligne: 'taxesFoncieres', aVerifier: true });
  });

  it('libellé non reconnu : ligne 221, à vérifier', () => {
    expect(classerCharge('Divers')).toEqual({ ligne: 'fraisAdministrationGestion', aVerifier: true });
  });
});

describe('montantChargeAnnee', () => {
  it('annualise une charge récurrente', () => {
    expect(montantChargeAnnee(charge({ montant: 100, periodicite: 'mensuelle' }), 2025)).toBe(1_200);
  });
  it('ponctuelle : retenue seulement si datée dans l’année', () => {
    expect(montantChargeAnnee(charge({ periodicite: 'ponctuelle', date_debut: '2025-06-01' }), 2025)).toBe(1_200);
    expect(montantChargeAnnee(charge({ periodicite: 'ponctuelle', date_debut: '2024-06-01' }), 2025)).toBe(0);
  });
});

describe('preremplirImmeuble', () => {
  it('loyers et charges classées, à la quote-part du foyer', () => {
    const r = preremplirImmeuble(
      asset({ denomination: 'Lyon', pourcentage_utilisateur: 50, pourcentage_conjoint: 0 }),
      [revenu()],
      [charge(), charge({ denomination: 'Assurance PNO', montant: 200 }), charge({ denomination: 'Divers', montant: 100 })],
      [], 2025,
    );
    expect(r.valeurs).toMatchObject({ denomination: 'Lyon', loyersBruts: 6_000, taxesFoncieres: 600, primesAssurance: 100, fraisAdministrationGestion: 50, interetsEmprunt: 0 });
    expect(r.chargesAVerifier).toEqual(['Divers → 221']);
    expect(r.interetsApproximatifs).toBe(false);
  });
});

describe('interetsEmpruntAnnee', () => {
  const emprunt = (o: Partial<Emprunt> = {}): Emprunt => ({
    id: 'e1', user_id: 'u', nature: 'Prêt immobilier', libelle: 'Prêt', asset_id: 'a1',
    capital_restant_du: 100_000, taux_interet: 3, duree_restante: 120, mode_amortissement: 'Amortissable',
    detenteur: 'Couple', qualification_bien: 'Bien commun', created_at: '2026-01-01', updated_at: '2026-01-01', ...o,
  } as Emprunt);

  it('contrat complet : somme des échéances de l’année civile, assurance comprise', () => {
    // 120 000 € à 0 % sur 120 mois dès janvier 2025, assurance 10 €/mois : 0 € d'intérêts, 120 € d'assurance.
    const r = interetsEmpruntAnnee(asset(), [emprunt({
      capital_initial: 120_000, date_premiere_echeance: '2025-01-05', duree_totale_mois: 120, taux_interet: 0,
      assurance_mode: 'montant', assurance_valeur: 10,
    })], 2025);
    expect(r.approximatif).toBe(false);
    expect(r.montant).toBeCloseTo(120, 6);
  });

  it('contrat complet : première année d’un prêt à 3 % plus coûteuse que la dixième', () => {
    const e = emprunt({ capital_initial: 120_000, date_premiere_echeance: '2016-01-05', duree_totale_mois: 120, taux_interet: 3 });
    const premiere = interetsEmpruntAnnee(asset(), [e], 2016).montant;
    const derniere = interetsEmpruntAnnee(asset(), [e], 2025).montant;
    expect(premiere).toBeGreaterThan(3_000);
    expect(derniere).toBeLessThan(300);
    expect(interetsEmpruntAnnee(asset(), [e], 2026).montant).toBe(0);
  });

  it('sans contrat complet : 12 prochains mois, signalé approximatif', () => {
    const r = interetsEmpruntAnnee(asset(), [emprunt()], 2025);
    expect(r.approximatif).toBe(true);
    expect(r.montant).toBeGreaterThan(0);
  });
});

describe('parts et répartition', () => {
  it('SCPI : revenus distribués des 12 derniers mois à la quote-part', () => {
    expect(preremplirPart(asset({ nature: 'Parts de SCPI', type_location: undefined, revenus_distribues_12m: 4_000, pourcentage_utilisateur: 50, pourcentage_conjoint: 50 }), [], [], [], 2025))
      .toMatchObject({ revenusBruts: 4_000 });
  });

  it('parts de SCI louées nu → parts ; immeuble en direct → immeubles', () => {
    const direct = asset({ id: 'd' });
    const sci = asset({ id: 's', nature: 'Parts de SCI' });
    const scpi = asset({ id: 'p', nature: 'Parts de SCPI' });
    const r = repartirActifs2044([direct, sci], [scpi]);
    expect(r.immeubles.map((a) => a.id)).toEqual(['d']);
    expect(r.parts.map((a) => a.id)).toEqual(['s', 'p']);
  });
});
