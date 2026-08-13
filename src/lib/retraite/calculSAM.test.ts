import { describe, it, expect } from 'vitest';
import { PeriodeCarriere } from './parseRIS';
import { calculerSAM } from './calculSAM';

const periode = (overrides: Partial<PeriodeCarriere>): PeriodeCarriere => ({
  employeur: 'Test',
  typeActivite: 'employeur',
  dateDebut: '2020-01-01',
  dateFin: '2020-12-31',
  revenu: null,
  estChiffreAffaires: false,
  regimes: ["L'Assurance retraite"],
  ...overrides,
});

describe('calculerSAM — exclusions des meilleures années (référentiel §3.4.4)', () => {
  it('exclut une année n\'ayant validé aucun trimestre (critère 1)', () => {
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'BON EMPLOYEUR', dateDebut: '2020-01-01', dateFin: '2020-12-31', revenu: 42000 }),
      // Revenu très faible, sous le seuil de validation d'un trimestre pour
      // 2021 (1 537,5 €) : aucune autre activité cette année-là → 0 trimestre
      // cotisé, 0 assimilé.
      periode({ employeur: 'MI-TEMPS COURT', dateDebut: '2021-01-01', dateFin: '2021-12-31', revenu: 100 }),
    ];

    const resultat = calculerSAM(periodes, 1990);

    expect(resultat.anneesExclues).toContain(2021);
    expect(resultat.anneesExclues).not.toContain(2020);
    expect(resultat.anneesRetenues.some((a) => a.annee === 2021)).toBe(false);
    // Toujours visible dans les années réellement connues, pour l'affichage —
    // l'exclusion porte sur la sélection, pas sur la visibilité.
    expect(resultat.anneesDisponibles.some((a) => a.annee === 2021)).toBe(true);
  });

  it('n\'exclut PAS une année uniquement assimilée (critère 3, non implémenté à dessein — dette documentée)', () => {
    // Année 100% chômage, aucun revenu cotisé : 0 cotisé, 4 assimilé (365
    // jours / 50 plafonné à 4/an). Le référentiel prévoit d'exclure ce type
    // d'année (hors IJ maternité), mais ce dépôt ne permet pas de distinguer
    // une IJ de congé maternité d'une maladie/chômage ordinaire — l'exclusion
    // a donc été volontairement laissée de côté (cf.
    // docs/audit/implementation-sam-exclusions.md) pour ne pas risquer
    // d'exclure à tort une maternité. Ce test documente ce choix et sert de
    // garde-fou de non-régression : si l'exclusion #3 est implémentée plus
    // tard, ce test devra être mis à jour en connaissance de cause, pas par
    // accident.
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2022-01-01', dateFin: '2022-12-31' }),
    ];

    const resultat = calculerSAM(periodes, 1990);

    expect(resultat.anneesExclues).not.toContain(2022);
  });

  it('exclut l\'année de la date d\'effet quand elle est fournie (critère 2)', () => {
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'A', dateDebut: '2020-01-01', dateFin: '2020-12-31', revenu: 42000 }),
      periode({ employeur: 'B', dateDebut: '2021-01-01', dateFin: '2021-12-31', revenu: 45000 }),
    ];

    const resultatAvecDateEffet = calculerSAM(periodes, 1990, new Date('2021-06-15T00:00:00Z'));
    expect(resultatAvecDateEffet.anneesExclues).toContain(2021);
    expect(resultatAvecDateEffet.anneesRetenues.some((a) => a.annee === 2021)).toBe(false);
    expect(resultatAvecDateEffet.anneesDisponibles.some((a) => a.annee === 2021)).toBe(true);

    // Non-régression : sans dateEffet (cas actuel de RISImportDialog.tsx, qui
    // ne dispose d'aucune date d'effet réelle), le filtre reste inactif —
    // 2021 redevient éligible.
    const resultatSansDateEffet = calculerSAM(periodes, 1990);
    expect(resultatSansDateEffet.anneesExclues).not.toContain(2021);
    expect(resultatSansDateEffet.anneesRetenues.some((a) => a.annee === 2021)).toBe(true);
  });

  it('combine plusieurs critères sur une carrière courte : le SAM se recalcule sur les années restantes, sans inclure les années exclues par défaut', () => {
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'BON EMPLOYEUR', dateDebut: '2020-01-01', dateFin: '2020-12-31', revenu: 42000 }),
      // 2021 : aucun trimestre validé (critère 1).
      periode({ employeur: 'MI-TEMPS COURT', dateDebut: '2021-01-01', dateFin: '2021-12-31', revenu: 100 }),
      // 2022 : année de la date d'effet (critère 2), alors même que le
      // revenu y est bon — l'exclusion ne dépend pas du niveau de revenu.
      periode({ employeur: 'DERNIER EMPLOYEUR', dateDebut: '2022-01-01', dateFin: '2022-12-31', revenu: 45000 }),
    ];
    // Carrière connue de 3 ans seulement, très inférieure aux 25 années
    // requises (génération 1995) — la projection comble le reste.
    const anneeNaissance = 1995;
    const dateEffet = new Date('2022-03-01T00:00:00Z');

    const resultat = calculerSAM(periodes, anneeNaissance, dateEffet);

    expect(resultat.anneesExclues.slice().sort((a, b) => a - b)).toEqual([2021, 2022]);
    expect(resultat.anneesRetenues.some((a) => a.annee === 2021)).toBe(false);
    expect(resultat.anneesRetenues.some((a) => a.annee === 2022)).toBe(false);
    expect(resultat.anneesRetenues.some((a) => a.annee === 2020)).toBe(true);
    // Les deux années exclues restent visibles comme années réellement
    // connues (pour l'affichage), mais absentes du pool de sélection.
    expect(resultat.anneesDisponibles.some((a) => a.annee === 2021)).toBe(true);
    expect(resultat.anneesDisponibles.some((a) => a.annee === 2022)).toBe(true);
    // Le quota de 25 années est bien atteint via les années projetées
    // restantes (pas en réintégrant les années exclues).
    expect(resultat.anneesRetenues).toHaveLength(resultat.nombreAnneesRequis);
    expect(resultat.sam).toBeGreaterThan(0);
  });
});
