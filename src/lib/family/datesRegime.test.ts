import { describe, it, expect } from 'vitest';
import { verifierDatesRegime } from './datesRegime';

const mariage = new Date(2010, 5, 15);

describe('verifierDatesRegime', () => {
  it('jugement de séparation antérieur ou égal au mariage : erreur', () => {
    const e = verifierDatesRegime({ dateMariage: mariage, separationDeCorps: true, dateJugementSeparationCorps: new Date(2010, 5, 15) });
    expect(e.map(x => x.path)).toEqual(['dateJugementSeparationCorps']);
  });

  it('jugement ignoré si la séparation de corps n\'est pas cochée', () => {
    expect(verifierDatesRegime({ dateMariage: mariage, separationDeCorps: false, dateJugementSeparationCorps: new Date(2000, 0, 1) })).toEqual([]);
  });

  it('donation au dernier vivant antérieure au mariage sans contrat : erreur', () => {
    const e = verifierDatesRegime({ dateMariage: mariage, donationDernierVivantConjoint: true, dateDonationConjoint: new Date(2009, 0, 1) });
    expect(e.map(x => x.path)).toEqual(['dateDonationConjoint']);
  });

  it('donation antérieure au mariage, même avec contrat : erreur', () => {
    const e = verifierDatesRegime({ dateMariage: mariage, donationDernierVivantPersonne: true, dateDonationPersonne: new Date(2010, 4, 1) });
    expect(e.map(x => x.path)).toEqual(['dateDonationPersonne']);
  });

  it('sans date de mariage : aucun contrôle', () => {
    expect(verifierDatesRegime({ separationDeCorps: true, dateJugementSeparationCorps: new Date(2000, 0, 1) })).toEqual([]);
  });
});
