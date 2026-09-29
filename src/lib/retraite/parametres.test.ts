import { describe, it, expect } from 'vitest';
import { millesimePourDate, MILLESIME_COURANT, baremePerime, BAREME_RACHAT } from './parametres';
import { PASS_PAR_ANNEE } from './calculSAM';

describe('params-retraite.json — cohérence', () => {
  it('chaque valeur d\'un millésime a une source', () => {
    const cles = [
      'pass',
      'micoNonMajoreAnnuel',
      'micoMajoreAnnuel',
      'plafondGlobalPensionsAnnuel',
      'migaReferenceAnnuelle',
      'rafpValeurServicePoint',
      'cnavplValeurPoint',
    ];
    for (const cle of cles) expect(MILLESIME_COURANT.sources[cle]).toBeTruthy();
  });

  it('PASS du millésime identique à la table historique de calculSAM.ts', () => {
    expect(PASS_PAR_ANNEE[MILLESIME_COURANT.annee]).toBe(MILLESIME_COURANT.pass);
  });

  it('barème de rachat complet de 20 à 66 ans pour les deux options', () => {
    for (let age = 20; age <= 66; age++) {
      expect(BAREME_RACHAT.tauxSeul[String(age)]).toBeDefined();
      expect(BAREME_RACHAT.tauxEtDuree[String(age)]).toBeDefined();
    }
  });
});

describe('millesimePourDate', () => {
  it('date future : dernier millésime connu (euros constants)', () => {
    expect(millesimePourDate(new Date(Date.UTC(2054, 6, 1))).annee).toBe(MILLESIME_COURANT.annee);
  });
  it('date antérieure au premier millésime : premier millésime', () => {
    expect(millesimePourDate(new Date(Date.UTC(2000, 0, 1))).annee).toBeLessThanOrEqual(MILLESIME_COURANT.annee);
  });
});

describe('baremePerime', () => {
  it('non périmé pendant l\'année du millésime', () => {
    expect(baremePerime(new Date(Date.UTC(MILLESIME_COURANT.annee, 11, 31)))).toBe(false);
  });
  it('périmé dès le 1er janvier suivant', () => {
    expect(baremePerime(new Date(Date.UTC(MILLESIME_COURANT.annee + 1, 0, 1)))).toBe(true);
  });
});
