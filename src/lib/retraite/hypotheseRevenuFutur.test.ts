import { describe, it, expect } from 'vitest';
import {
  derniereAnneeAvecTrimestreValide,
  revenuAnnuelHypotheseDerniereAnneeConnue,
  trimestresProjetesParAnnee,
  anneesPasseesSansDonnees,
  periodesSynthetiquesProjetees,
  calculerProjectionRevenuFutur,
} from './hypotheseRevenuFutur';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';
import { PeriodeCarriere } from './parseRIS';

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

describe('trimestresProjetesParAnnee', () => {
  const aujourdHui = new Date(Date.UTC(2026, 8, 24)); // T3 2026

  it('du trimestre en cours au trimestre précédant la date d’effet, années partielles incluses', () => {
    const projection = trimestresProjetesParAnnee([], aujourdHui, new Date(Date.UTC(2028, 3, 1)));
    // 2026 : T3-T4 (2) ; 2027 : 4 ; 2028 : T1 (1) — effet au 01/04/2028.
    expect(projection.map((a) => [a.annee, a.trimestres])).toEqual([
      [2026, 2],
      [2027, 4],
      [2028, 1],
    ]);
  });

  it('pas de double compte : l’année en cours est plafonnée à 4 moins les trimestres déjà validés', () => {
    const projection = trimestresProjetesParAnnee(
      parAnnee([{ annee: 2026, cotises: 3, assimiles: 0, revenuCotise: 30000 }]),
      aujourdHui,
      new Date(Date.UTC(2028, 0, 1))
    );
    expect(projection.map((a) => [a.annee, a.trimestres])).toEqual([
      [2026, 1],
      [2027, 4],
    ]);
  });

  it('date d’effet au trimestre suivant : seul le trimestre en cours est projeté', () => {
    expect(
      trimestresProjetesParAnnee([], aujourdHui, new Date(Date.UTC(2026, 9, 1))).map((a) => [a.annee, a.trimestres])
    ).toEqual([[2026, 1]]);
  });

  it('date d’effet dans le trimestre en cours : aucune projection', () => {
    expect(trimestresProjetesParAnnee([], new Date(Date.UTC(2026, 6, 10)), new Date(Date.UTC(2026, 7, 1)))).toEqual([]);
  });
});

describe('anneesPasseesSansDonnees', () => {
  it('liste les années entre la dernière année validée et l’année en cours, exclues', () => {
    expect(
      anneesPasseesSansDonnees(
        parAnnee([{ annee: 2023, cotises: 4, assimiles: 0, revenuCotise: 30000 }]),
        new Date(Date.UTC(2026, 8, 24))
      )
    ).toEqual([2024, 2025]);
  });
});

describe('periodesSynthetiquesProjetees', () => {
  it('une période par année, bornée aux trimestres projetés, revenu au prorata', () => {
    const periodes = periodesSynthetiquesProjetees(
      [
        { annee: 2026, trimestres: 2, premierTrimestre: 2, dernierTrimestre: 3 },
        { annee: 2027, trimestres: 4, premierTrimestre: 0, dernierTrimestre: 3 },
        { annee: 2028, trimestres: 1, premierTrimestre: 0, dernierTrimestre: 0 },
      ],
      40000
    );
    expect(periodes.map((p) => [p.dateDebut, p.dateFin, p.revenu])).toEqual([
      ['2026-07-01', '2026-12-31', 20000],
      ['2027-01-01', '2027-12-31', 40000],
      ['2028-01-01', '2028-03-31', 10000],
    ]);
    expect(periodes[0].regimes).toEqual(["L'Assurance retraite"]);
  });
});

// calculerProjectionRevenuFutur() : glue appelée à l'identique par
// Carriere.tsx et usePensionConsolidee.ts (cf.
// docs/audit/audit-pension-consolidation.md, étape 2 de la fusion).
describe('calculerProjectionRevenuFutur', () => {
  const periodeReelle = (annee: number, revenu: number): PeriodeCarriere => ({
    employeur: 'Test',
    typeActivite: 'employeur',
    dateDebut: `${annee}-01-01`,
    dateFin: `${annee}-12-31`,
    revenu,
    estChiffreAffaires: false,
    regimes: ["L'Assurance retraite"],
  });

  it('non applicable sans date de naissance : renvoie le salaire réel tel quel, aucun trimestre projeté', () => {
    const resultat = calculerProjectionRevenuFutur(
      null,
      [periodeReelle(2020, 30000)],
      30000,
      'derniere_annee_connue',
      null,
      new Date('2026-06-01')
    );
    expect(resultat.salaireAnnuelMoyenProjete).toBe(30000);
    expect(resultat.trimestresValidesProjetes).toBe(0);
    expect(resultat.dateEffet).toBeNull();
  });

  it('âge légal déjà dépassé : départ au 1er du mois suivant, seul le trimestre en cours est projeté', () => {
    const resultat = calculerProjectionRevenuFutur(
      { annee: 1955, mois: 1 },
      [periodeReelle(2020, 30000)],
      30000,
      'derniere_annee_connue',
      null,
      new Date('2026-06-01')
    );
    expect(resultat.dateEffet?.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(resultat.trimestresValidesProjetes).toBe(1);
    expect(resultat.anneesPasseesSansDonnees).toEqual([2021, 2022, 2023, 2024, 2025]);
  });

  it('mode manuel non renseigné (0 ou vide) : pas de projection, même avec des années manquantes', () => {
    const resultat = calculerProjectionRevenuFutur(
      { annee: 1995, mois: 1 },
      [periodeReelle(2020, 30000)],
      30000,
      'revenu_moyen_projete',
      null,
      new Date('2026-06-01')
    );
    expect(resultat.trimestresValidesProjetes).toBe(0);
    expect(resultat.salaireAnnuelMoyenProjete).toBe(30000);
  });

  it('mode manuel renseigné : projette jusqu’au trimestre précédant la date d’effet et recalcule le SAM', () => {
    const resultat = calculerProjectionRevenuFutur(
      { annee: 1995, mois: 1 },
      [periodeReelle(2020, 30000)],
      30000,
      'revenu_moyen_projete',
      35000,
      new Date('2026-06-01')
    );
    // Né en janvier 1995 : âge légal 64 ans → effet au 01/02/2059 ; projection
    // du T2 2026 au T4 2058 = 3 + 32 × 4 = 131 trimestres.
    expect(resultat.dateEffet?.toISOString().slice(0, 10)).toBe('2059-02-01');
    expect(resultat.trimestresValidesProjetes).toBe(131);
    expect(resultat.salaireAnnuelMoyenProjete).toBeGreaterThan(0);
  });

  it('mode dernière année connue : dérive le revenu hypothèse du RIS plutôt que du paramètre manuel', () => {
    const resultatAvecRevenuManuelIgnore = calculerProjectionRevenuFutur(
      { annee: 1995, mois: 1 },
      [periodeReelle(2020, 40000)],
      30000,
      'derniere_annee_connue',
      999999, // ignoré en mode 'derniere_annee_connue'
      new Date('2026-06-01')
    );
    const resultatSansRevenuManuel = calculerProjectionRevenuFutur(
      { annee: 1995, mois: 1 },
      [periodeReelle(2020, 40000)],
      30000,
      'derniere_annee_connue',
      null,
      new Date('2026-06-01')
    );
    expect(resultatAvecRevenuManuelIgnore).toEqual(resultatSansRevenuManuel);
    expect(resultatAvecRevenuManuelIgnore.trimestresValidesProjetes).toBeGreaterThan(0);
  });
});
