import { describe, it, expect } from 'vitest';
import {
  derniereAnneeAvecTrimestreValide,
  revenuAnnuelHypotheseDerniereAnneeConnue,
  anneesManquantes,
  trimestresProjetesAnneesManquantes,
  periodesSynthetiquesAnneesManquantes,
} from './hypotheseRevenuFutur';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';

const parAnnee = (
  entries: { annee: number; cotises: number; assimiles: number; revenuCotise: number }[]
): ResultatTrimestresCotisesEtAssimiles['parAnnee'] => entries;

describe('derniereAnneeAvecTrimestreValide', () => {
  it('retourne la dernière année avec au moins un trimestre validé', () => {
    const resultat = derniereAnneeAvecTrimestreValide(
      parAnnee([
        { annee: 2022, cotises: 4, assimiles: 0, revenuCotise: 20000 },
        { annee: 2023, cotises: 2, assimiles: 0, revenuCotise: 10000 },
      ])
    );
    expect(resultat?.annee).toBe(2023);
  });

  it('recule à l\'année précédente si la dernière a 0 trimestre', () => {
    const resultat = derniereAnneeAvecTrimestreValide(
      parAnnee([
        { annee: 2022, cotises: 4, assimiles: 0, revenuCotise: 20000 },
        { annee: 2023, cotises: 0, assimiles: 0, revenuCotise: 0 },
      ])
    );
    expect(resultat?.annee).toBe(2022);
  });

  it('retourne null si aucune année n\'a de trimestre validé', () => {
    const resultat = derniereAnneeAvecTrimestreValide(
      parAnnee([{ annee: 2023, cotises: 0, assimiles: 0, revenuCotise: 0 }])
    );
    expect(resultat).toBeNull();
  });

  it('retourne null pour un parAnnee vide (RIS vide ou inexploitable)', () => {
    expect(derniereAnneeAvecTrimestreValide(parAnnee([]))).toBeNull();
  });
});

describe('revenuAnnuelHypotheseDerniereAnneeConnue', () => {
  it('année pleine (4 trimestres) : renvoie le revenu tel quel', () => {
    const resultat = revenuAnnuelHypotheseDerniereAnneeConnue(
      parAnnee([{ annee: 2023, cotises: 4, assimiles: 0, revenuCotise: 24000 }])
    );
    expect(resultat).toBeCloseTo(24000, 2);
  });

  it('année partielle (2 trimestres) : proratise à un équivalent 12 mois', () => {
    // revenu 6000 sur 2 trimestres (6 mois) → 6000 / 6 × 12 = 12000
    const resultat = revenuAnnuelHypotheseDerniereAnneeConnue(
      parAnnee([{ annee: 2023, cotises: 2, assimiles: 0, revenuCotise: 6000 }])
    );
    expect(resultat).toBeCloseTo(12000, 2);
  });

  it('mélange cotisés/assimilés : la proratisation se base sur le total', () => {
    // 1 trimestre cotisé + 2 assimilés = 3 trimestres (9 mois), revenu 9000 → 12000
    const resultat = revenuAnnuelHypotheseDerniereAnneeConnue(
      parAnnee([{ annee: 2023, cotises: 1, assimiles: 2, revenuCotise: 9000 }])
    );
    expect(resultat).toBeCloseTo(12000, 2);
  });

  it('RIS vide ou inexploitable (aucune année validée) : renvoie null', () => {
    const resultat = revenuAnnuelHypotheseDerniereAnneeConnue(
      parAnnee([{ annee: 2023, cotises: 0, assimiles: 0, revenuCotise: 0 }])
    );
    expect(resultat).toBeNull();
  });
});

describe('anneesManquantes', () => {
  it('liste les années de la borne courante à la borne de retraite, incluses', () => {
    expect(anneesManquantes(2026, 2029)).toEqual([2026, 2027, 2028, 2029]);
  });

  it('retourne une liste vide si la retraite est déjà atteinte (borne < année courante)', () => {
    expect(anneesManquantes(2026, 2020)).toEqual([]);
  });

  it('retourne une seule année si courante === retraite', () => {
    expect(anneesManquantes(2026, 2026)).toEqual([2026]);
  });
});

describe('trimestresProjetesAnneesManquantes', () => {
  it('compte 4 trimestres par année manquante, indépendamment du revenu', () => {
    expect(trimestresProjetesAnneesManquantes([2026, 2027, 2028])).toBe(12);
  });

  it('retourne 0 pour une liste vide', () => {
    expect(trimestresProjetesAnneesManquantes([])).toBe(0);
  });
});

describe('periodesSynthetiquesAnneesManquantes', () => {
  it('construit une période employeur année civile complète par année, régime de base', () => {
    const periodes = periodesSynthetiquesAnneesManquantes([2026, 2027], 30000);
    expect(periodes).toEqual([
      {
        employeur: 'Hypothèse de revenu futur',
        typeActivite: 'employeur',
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
        revenu: 30000,
        estChiffreAffaires: false,
        regimes: ["L'Assurance retraite"],
      },
      {
        employeur: 'Hypothèse de revenu futur',
        typeActivite: 'employeur',
        dateDebut: '2027-01-01',
        dateFin: '2027-12-31',
        revenu: 30000,
        estChiffreAffaires: false,
        regimes: ["L'Assurance retraite"],
      },
    ]);
  });
});
