import { describe, expect, it } from 'vitest';
import type { FamilyLink } from '@/services/familyService';
import type { FoyerFiscalInput } from './types';
import { appliquerFamille, ecartsAvecFamille, foyerDepuisFamille } from './foyerDepuisFamille';

const enfant = (l: Partial<FamilyLink>): FamilyLink => ({
  lien_familial: 'Enfant', nom: 'Test', enfant_de: 'both_parents', fiscalement_a_charge: true, date_naissance: '2015-03-01', ...l,
});

describe('foyerDepuisFamille', () => {
  it('couple marié, deux enfants communs mineurs dont un handicapé', () => {
    const r = foyerDepuisFamille({}, { statut_couple: 'Marié(e)' }, [enfant({}), enfant({ date_naissance: '2019-06-10', handicap: true })], 2025);
    expect(r.valeurs.situationFamille).toBe('marie');
    expect(r.valeurs.enfantsCharge).toEqual([
      { anneeNaissance: 2015, invalide: false, residenceAlternee: false },
      { anneeNaissance: 2019, invalide: true, residenceAlternee: false },
    ]);
    expect(r.notes).toEqual([]);
  });

  it('minorité au 1er janvier : né le 1.1.2007 majeur, né le 2.1.2007 mineur, né pendant 2025 compté, après exclu', () => {
    const r = foyerDepuisFamille({}, { statut_couple: 'Pacsé(e)' }, [
      enfant({ date_naissance: '2007-01-01' }),
      enfant({ date_naissance: '2007-01-02' }),
      enfant({ date_naissance: '2025-11-30' }),
      enfant({ date_naissance: '2026-02-01' }),
    ], 2025);
    expect(r.valeurs.enfantsMajeursRattaches).toBe(1);
    expect(r.valeurs.enfantsCharge.map((e) => e.anneeNaissance)).toEqual([2007, 2025]);
    expect(r.notes).toEqual(["Test : né(e) en 2026, après l'année des revenus 2025 : non compté(e)."]);
  });

  it('enfants non retenus : non fiscalement à charge, décédé, sans date (signalé)', () => {
    const r = foyerDepuisFamille({}, { statut_couple: 'Marié(e)' }, [
      enfant({ fiscalement_a_charge: false }),
      enfant({ est_decede: true }),
      enfant({ prenom: 'Léa', date_naissance: null }),
    ], 2025);
    expect(r.valeurs.enfantsCharge).toEqual([]);
    expect(r.notes).toEqual(['Léa Test : date de naissance absente dans Famille, enfant non repris.']);
  });

  it('concubinage : célibataire, enfant commun et enfant du client comptés, enfant du partenaire seul exclu', () => {
    const r = foyerDepuisFamille({}, { statut_couple: 'Concubinage', personne_handicapee_conjoint: true }, [
      enfant({ enfant_de: 'both_parents' }),
      enfant({ enfant_de: 'user' }),
      enfant({ enfant_de: 'spouse', prenom: 'Tom' }),
    ], 2025);
    expect(r.valeurs.situationFamille).toBe('celibataire');
    expect(r.valeurs.enfantsCharge).toHaveLength(2);
    expect(r.valeurs.invaliditeDeclarant2).toBe(false);
    expect(r.notes.some((n) => n.startsWith('Tom Test'))).toBe(true);
    expect(r.notes.some((n) => n.includes('case T'))).toBe(false);
  });

  it('divorcé avec enfant : suggestion de la case T', () => {
    const r = foyerDepuisFamille({}, { statut_couple: 'Divorcé(e)' }, [enfant({ enfant_de: 'user' })], 2025);
    expect(r.valeurs.situationFamille).toBe('divorce');
    expect(r.notes.some((n) => n.includes('case T'))).toBe(true);
  });

  it('personne invalide à charge hors enfant, invalidités des déclarants', () => {
    const r = foyerDepuisFamille(
      { personne_handicapee: true },
      { statut_couple: 'Marié(e)', personne_handicapee_conjoint: true },
      [{ lien_familial: 'Parent', nom: 'X', personne_a_charge: true, handicap: true, date_naissance: '1950-05-05' },
        { lien_familial: 'Parent', nom: 'Y', personne_a_charge: true, handicap: false, date_naissance: '1952-05-05' }],
      2025,
    );
    expect(r.valeurs.personnesInvalidesCharge).toEqual([{ anneeNaissance: 1950 }]);
    expect(r.valeurs.invaliditeDeclarant1).toBe(true);
    expect(r.valeurs.invaliditeDeclarant2).toBe(true);
  });

  it('ancien combattant : demi-part au-delà de 74 ans au 31 décembre, sinon note', () => {
    const plus = foyerDepuisFamille({ ancien_combattant: true, date_naissance: '1950-12-31' }, { statut_couple: 'Célibataire' }, [], 2025);
    expect(plus.valeurs.ancienCombattantDeclarant1).toBe(true);
    const moins = foyerDepuisFamille({ ancien_combattant: true, date_naissance: '1951-01-01' }, { statut_couple: 'Célibataire' }, [], 2025);
    expect(moins.valeurs.ancienCombattantDeclarant1).toBe(false);
    expect(moins.notes).toHaveLength(1);
  });

  it('séparation de corps signalée, statut absent → célibataire', () => {
    expect(foyerDepuisFamille({}, { statut_couple: 'Marié(e)', separation_de_corps: true }, [], 2025).notes[0]).toContain('Séparation de corps');
    expect(foyerDepuisFamille(null, null, [], 2025).valeurs.situationFamille).toBe('celibataire');
  });
});

const foyer = (f: Partial<FoyerFiscalInput> = {}): FoyerFiscalInput => ({
  situationFamille: 'celibataire', lieuResidence: 'guyane_mayotte', enfantsCharge: [], personnesInvalidesCharge: [],
  enfantsMajeursRattaches: 0, parentIsole: true, ancienParentIsole: false, invaliditeDeclarant1: false, invaliditeDeclarant2: false,
  ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false, veufAncienCombattant: false, veuveDeGuerre: true, ...f,
});

describe('appliquerFamille et ecartsAvecFamille', () => {
  const famille = foyerDepuisFamille({}, { statut_couple: 'Marié(e)' }, [enfant({}), enfant({ date_naissance: '2019-01-05' })], 2025).valeurs;

  it('remplace les champs de Famille, garde lieu, cases T et G, et la résidence alternée par année', () => {
    const avant = foyer({ enfantsCharge: [{ anneeNaissance: 2019, invalide: false, residenceAlternee: true }] });
    const apres = appliquerFamille(avant, famille);
    expect(apres.situationFamille).toBe('marie');
    expect(apres.lieuResidence).toBe('guyane_mayotte');
    expect(apres.parentIsole).toBe(true);
    expect(apres.veuveDeGuerre).toBe(true);
    expect(apres.enfantsCharge.map((e) => [e.anneeNaissance, e.residenceAlternee])).toEqual([[2015, false], [2019, true]]);
  });

  it('écarts listés, aucun une fois la reprise appliquée', () => {
    const avant = foyer();
    expect(ecartsAvecFamille(avant, famille)).toEqual([
      'Situation : marié(e) dans Famille, célibataire ici.',
      'Enfants mineurs à charge : 2 dans Famille, 0 ici (ou années de naissance, invalidité différentes).',
    ]);
    expect(ecartsAvecFamille(appliquerFamille(avant, famille), famille)).toEqual([]);
  });
});
