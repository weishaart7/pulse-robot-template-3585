import { describe, expect, it } from 'vitest';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { ligneActifIFI, preremplirIFI } from './preremplissageIFI';

const actif = (a: Partial<Asset>): Asset => ({ id: 'a1', nature: 'Résidence principale', valeur_estimee: 1_000_000, ...a });

describe('ligneActifIFI', () => {
  it('résidence principale à la quote-part du foyer', () => {
    const l = ligneActifIFI(actif({ pourcentage_utilisateur: 50, pourcentage_conjoint: 0 }));
    expect(l?.categorie).toBe('residencePrincipale');
    expect(l?.valeur).toBe(500_000);
  });

  it('hors assiette : actif non immobilier, bien détenu par une société', () => {
    expect(ligneActifIFI(actif({ nature: 'Assurance-vie' }))).toBeNull();
    expect(ligneActifIFI(actif({ nature: 'Résidences secondaires', societe_proprietaire_id: 's1' }))).toBeNull();
  });

  it('bois et forêts : 9AC seulement si les conditions sont cochées', () => {
    expect(ligneActifIFI(actif({ nature: 'Bois & forêts', conditions_exoneration_rural: true }))?.categorie).toBe('boisForets');
    const sans = ligneActifIFI(actif({ nature: 'Bois & forêts' }));
    expect(sans?.categorie).toBe('autreNonBati');
    expect(sans?.aVerifier.length).toBe(1);
  });

  it('groupement foncier : régime déduit du type, parts en 9CA sans conditions', () => {
    expect(ligneActifIFI(actif({ nature: 'Parts de groupements fonciers', type_groupement: 'GFA', conditions_exoneration_rural: true }))?.categorie).toBe('partsGfaGaf');
    expect(ligneActifIFI(actif({ nature: 'Parts de groupements fonciers', type_groupement: 'GFF', conditions_exoneration_rural: true }))?.categorie).toBe('boisForets');
    expect(ligneActifIFI(actif({ nature: 'Parts de groupements fonciers', type_groupement: 'GFA' }))?.categorie).toBeUndefined();
  });

  it('démembrement : usufruit en pleine propriété, nue-propriété à 0', () => {
    expect(ligneActifIFI(actif({ mode_detention: 'Usufruit' }))?.valeur).toBe(1_000_000);
    expect(ligneActifIFI(actif({ mode_detention: 'Nue-propriété' }))?.valeur).toBe(0);
  });
});

describe('preremplirIFI', () => {
  it('emprunt amortissable relié : capital restant dû au 1er janvier', () => {
    const emprunts: Emprunt[] = [{
      id: 'e1', nature: 'Prêt immobilier (résidence principale)', asset_id: 'a1',
      capital_initial: 120_000, taux_interet: 0, duree_totale_mois: 120, date_premiere_echeance: '2021-01-05',
      capital_restant_du: 1,
    } as Emprunt];
    const r = preremplirIFI([actif({})], emprunts, 2026);
    expect(r.biens).toEqual([{ categorie: 'residencePrincipale', valeur: 1_000_000 }]);
    // 60 échéances de 1 000 € payées de janvier 2021 à décembre 2025.
    expect(r.dettes[0].montant).toBe(60_000);
    expect(r.dettes[0].ligne).toBe('9GH');
  });

  it('emprunt in fine : dégressivité calculée sur les années écoulées', () => {
    const emprunts: Emprunt[] = [{
      id: 'e1', nature: 'Crédit in fine (adossé à assurance-vie ou autres actifs)', asset_id: 'a1', mode_amortissement: 'In fine',
      capital_initial: 500_000, taux_interet: 2, duree_totale_mois: 120, date_premiere_echeance: '2023-01-05',
    } as Emprunt];
    const d = preremplirIFI([actif({ nature: 'Résidences secondaires' })], emprunts, 2026).dettes[0];
    expect(d.inFine).toEqual({ montantEmprunte: 500_000, anneesEcoulees: 3, dureeAnnees: 10 });
  });

  it('emprunt non relié à un bien de l\'assiette : ignoré', () => {
    const r = preremplirIFI([actif({})], [{ id: 'e2', nature: 'Crédit à la consommation', capital_restant_du: 5_000 } as Emprunt], 2026);
    expect(r.dettes).toEqual([]);
  });
});
