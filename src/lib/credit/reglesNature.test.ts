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
});
