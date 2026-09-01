import { describe, it, expect } from 'vitest';
import { PeriodeCarriere } from './parseRIS';
import { calculerSAM, PASS_PAR_ANNEE } from './calculSAM';
import { COEFFICIENT_REVALORISATION_CNAV } from './coefficientsRevalorisationCNAV';

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

  it('exclut une année uniquement assimilée chômage/maladie (critère 3)', () => {
    // Année 100% chômage, aucun revenu cotisé : 0 cotisé, 4 assimilé (365
    // jours / 50 plafonné à 4/an). Le référentiel prévoit d'exclure ce type
    // d'année (hors IJ maternité) — implémenté depuis l'ajout de la
    // catégorie 'maternite' à TypeActivite (distincte de 'maladie'/'chomage',
    // cf. docs/retraite.md), qui permet désormais de distinguer les deux cas.
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'CHÔMAGE', typeActivite: 'chomage', dateDebut: '2022-01-01', dateFin: '2022-12-31' }),
    ];

    const resultat = calculerSAM(periodes, 1990);

    expect(resultat.anneesExclues).toContain(2022);
  });

  it('n\'exclut PAS une année composée uniquement d\'IJ maternité (exception du critère 3)', () => {
    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'BON EMPLOYEUR', dateDebut: '2020-01-01', dateFin: '2020-12-31', revenu: 42000 }),
      periode({ employeur: 'CONGÉ MATERNITÉ', typeActivite: 'maternite', dateDebut: '2022-01-01', dateFin: '2022-12-31' }),
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


describe('calculerSAM — ordre plafonnement PASS puis revalorisation', () => {
  it('plafonne une année ancienne avec le PASS de CETTE année-là, pas le revenu déjà revalorisé', () => {
    // 1990 : PASS = 19 976,92 €, coefficient de revalorisation = 1,704.
    // Revenu à 90 % du PASS de 1990 → SOUS le plafond de son année, donc
    // aucun écrêtement ne doit avoir lieu.
    const pass1990 = PASS_PAR_ANNEE[1990];
    const coefficient1990 = COEFFICIENT_REVALORISATION_CNAV[1990];
    const revenu1990 = pass1990 * 0.9;

    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'ANCIEN EMPLOYEUR', dateDebut: '1990-01-01', dateFin: '1990-12-31', revenu: revenu1990 }),
    ];

    const resultat = calculerSAM(periodes, 1965);
    const annee1990 = resultat.anneesDisponibles.find((a) => a.annee === 1990);

    expect(annee1990).toBeDefined();
    // Valeur légale : min(revenu, PASS de l'année) PUIS × coefficient.
    expect(annee1990!.revenuPlafonne).toBeCloseTo(revenu1990 * coefficient1990, 6);
    // Non plafonné : le revenu est sous le PASS de 1990, donc la valeur
    // retenue est exactement la valeur revalorisée.
    expect(annee1990!.revenuPlafonne).toBeCloseTo(annee1990!.revenuRevalorise, 6);
    // Verrou anti-régression sur l'ancien ordre (revalorisation puis
    // plafonnement), qui écrêtait ce revenu au PASS non revalorisé de 1990 —
    // soit environ 1,7 fois moins.
    expect(annee1990!.revenuPlafonne).toBeGreaterThan(pass1990);
  });

  it('plafonne bien un revenu 2026 supérieur au PASS 2026 (48 060 €)', () => {
    expect(PASS_PAR_ANNEE[2026]).toBe(48060);

    const periodes: PeriodeCarriere[] = [
      periode({ employeur: 'HAUT REVENU', dateDebut: '2026-01-01', dateFin: '2026-12-31', revenu: 60000 }),
    ];

    const resultat = calculerSAM(periodes, 1990);
    const annee2026 = resultat.anneesDisponibles.find((a) => a.annee === 2026);

    expect(annee2026).toBeDefined();
    // Aucun coefficient de revalorisation pour 2026 (année de liquidation de
    // la table CNAV en place) → la valeur retenue est le PASS lui-même.
    expect(annee2026!.revenuPlafonne).toBeCloseTo(48060, 6);
    expect(annee2026!.revenuBrut).toBe(60000);
  });
});
