import { describe, expect, it } from 'vitest';
import { dateAcquisitionDepuisAnnee } from './dateAcquisition';

describe('dateAcquisitionDepuisAnnee', () => {
  it('conserve la date stockée quand l’année ne change pas (pas de retour au 1er janvier)', () => {
    expect(dateAcquisitionDepuisAnnee('2021', '2021-06-15')).toBe('2021-06-15');
  });

  it('accepte une date stockée avec heure (timestamp ISO)', () => {
    expect(dateAcquisitionDepuisAnnee('2021', '2021-06-15T00:00:00')).toBe('2021-06-15');
  });

  it('ne remplace que l’année quand elle change', () => {
    expect(dateAcquisitionDepuisAnnee('2019', '2021-06-15')).toBe('2019-06-15');
  });

  it('ramène un 29 février au 28 sur une année non bissextile', () => {
    expect(dateAcquisitionDepuisAnnee('2023', '2024-02-29')).toBe('2023-02-28');
  });

  it('se replie sur le 1er janvier sans date stockée', () => {
    expect(dateAcquisitionDepuisAnnee('2022', null)).toBe('2022-01-01');
  });

  it('renvoie null pour une année vide ou invalide', () => {
    expect(dateAcquisitionDepuisAnnee('', '2021-06-15')).toBeNull();
    expect(dateAcquisitionDepuisAnnee('abc', '2021-06-15')).toBeNull();
  });
});
