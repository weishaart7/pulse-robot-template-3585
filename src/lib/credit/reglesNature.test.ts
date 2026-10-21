import { describe, expect, it } from 'vitest';
import { EMPRUNT_NATURES, TYPE_GARANTIE_OPTIONS } from '@/constants/assetTypes';
import { reglesEmprunt } from './reglesNature';

describe('reglesEmprunt', () => {
  it('PTZ : taux nul, résidence principale seule', () => {
    const r = reglesEmprunt('Prêt à taux zéro (PTZ)');
    expect(r.tauxZero).toBe(true);
    expect(r.actifLiable('Résidence principale')).toBe(true);
    expect(r.actifLiable('Résidences secondaires')).toBe(false);
  });

  it('revolving : ni tableau, ni actif, ni garantie', () => {
    const r = reglesEmprunt('Crédit renouvelable / revolving');
    expect(r.sansTableau && r.sansActifNiGarantie).toBe(true);
    expect(r.actifLiable('Résidence principale')).toBe(false);
  });

  it('in fine imposé, crédit relais in fine par défaut, Lombard nanti', () => {
    expect(reglesEmprunt('Crédit in fine (adossé à assurance-vie ou autres actifs)').modeImpose).toBe('In fine');
    expect(reglesEmprunt('Crédit relais').modeParDefaut).toBe('In fine');
    expect(reglesEmprunt('Crédit Lombard (prêt gagé sur portefeuille-titres)').garantieImposee).toBe('Nantissement');
  });

  it('prêt immobilier : biens immobiliers seulement ; crédit affecté : aussi les biens corporels', () => {
    expect(reglesEmprunt('Prêt immobilier (résidence principale)').actifLiable('Véhicules motorisés')).toBe(false);
    expect(reglesEmprunt('Crédit affecté (auto, travaux, etc.)').actifLiable('Véhicules motorisés')).toBe(true);
    expect(reglesEmprunt('Prêt pour acquisition de SCPI').actifLiable('Parts de SCPI')).toBe(true);
  });

  it('garanties proposées et valeurs imposées existent dans la liste des garanties', () => {
    for (const n of EMPRUNT_NATURES) {
      const r = reglesEmprunt(n);
      for (const g of [...(r.garantiesProposees ?? []), r.garantieImposee, r.garantieParDefaut].filter(Boolean)) {
        expect(TYPE_GARANTIE_OPTIONS).toContain(g);
      }
    }
  });

  it('actif en garantie : relais (bien à vendre), in fine (actif nanti), Lombard (portefeuille) ; absent sinon', () => {
    expect(reglesEmprunt('Crédit relais').actifGarantie?.libelle).toBe('Bien à vendre');
    expect(reglesEmprunt('Crédit relais').actifGarantie?.liable('Résidence principale')).toBe(true);
    const inFine = reglesEmprunt('Crédit in fine (adossé à assurance-vie ou autres actifs)').actifGarantie;
    expect(inFine?.liable('Résidence principale')).toBe(false);
    expect(inFine?.liable("Contrat d'assurance-vie")).toBe(true);
    const lombard = reglesEmprunt('Crédit Lombard (prêt gagé sur portefeuille-titres)').actifGarantie;
    expect(lombard?.libelle).toBe('Portefeuille nanti');
    expect(lombard?.liable('Véhicules motorisés')).toBe(false);
    expect(lombard?.liable('Compte-titres (CTO)')).toBe(true);
    expect(reglesEmprunt('Prêt immobilier (résidence principale)').actifGarantie).toBeUndefined();
    expect(reglesEmprunt('Crédit renouvelable / revolving').actifGarantie).toBeUndefined();
  });

  it('prêt familial : caution ou aucune garantie, taux affiché', () => {
    const r = reglesEmprunt('Prêt familial ou entre particuliers');
    expect(r.garantiesProposees).toEqual(['Caution', 'Aucune']);
    expect(r.tauxZero).toBe(false);
  });
});
