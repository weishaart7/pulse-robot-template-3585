import { describe, it, expect } from 'vitest';
import { calculerRequalifications } from './requalification';

const marital = {
  statut_couple: 'Marié(e)',
  regime_matrimonial: "Séparation de biens avec société d'acquêts",
  date_mariage: '2010-06-01',
};
const vide = { tousAcquets: false, categories: [], biensDesignes: [], biensExclus: [] };
const actif = (p: Record<string, unknown>) =>
  ({ id: 'a1', nature: 'Résidences secondaires', date_acquisition: '2015-01-01', origine_actif: ['Achat'], detenteur: 'user', qualification_bien: 'Bien propre', ...p }) as any;

describe('calculerRequalifications', () => {
  it('bien entrant dans le périmètre : commun, détenteur passé au couple 50/50', () => {
    const [c] = calculerRequalifications([actif({})], marital, { ...vide, categories: ['immeubles'] });
    expect(c.apres).toBe('Bien commun');
    expect(c.patch).toMatchObject({ qualification_bien: 'Bien commun', detenteur: 'common', pourcentage_utilisateur: 50 });
  });

  it('aucun changement si la qualification est déjà la bonne', () => {
    expect(calculerRequalifications([actif({})], marital, vide)).toHaveLength(0);
  });

  it('ignore les biens en qualification manuelle et en indivision avec un tiers', () => {
    const p = { ...vide, tousAcquets: true };
    expect(calculerRequalifications([actif({ qualification_auto: false }), actif({ id: 'a2', detenteur: 'Indivision' })], marital, p)).toHaveLength(0);
  });

  it('bien commun sorti du périmètre et détenu par le couple : indivision', () => {
    const [c] = calculerRequalifications([actif({ detenteur: 'common', qualification_bien: 'Bien commun' })], marital, vide);
    expect(c.apres).toBe('Indivision');
    expect(c.patch).toEqual({ qualification_bien: 'Indivision' });
  });

  it("bien du couple devenu propre : laissé tel quel (époux inconnu)", () => {
    const communaute = { ...marital, regime_matrimonial: 'Communauté réduite aux acquêts' };
    const a = actif({ detenteur: 'common', qualification_bien: 'Bien commun', date_acquisition: '2005-01-01' });
    expect(calculerRequalifications([a], communaute, vide)).toHaveLength(0);
  });
});
