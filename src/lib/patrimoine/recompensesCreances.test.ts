import { describe, it, expect } from 'vitest';
import {
  computeMontantRecompense,
  computeMontantCreance,
  computeSoldeRecompenses,
  computeSoldeCreancesEntreEpoux,
  regimeHasMasseCommune,
} from './recompensesCreances';

describe('computeMontantRecompense', () => {
  it('cas 1 — dépense nécessaire à l\'acquisition, bien avec plus-value : plancher du profit subsistant (art. 1469 al. 3)', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 500000,
      natureDepense: 'acquisition',
    });
    expect(montant).toBe(250000);
  });

  it('cas 2 — bien avec moins-value : plafonné au profit subsistant (art. 1469 al. 2), pas de plancher', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 100000,
      natureDepense: 'acquisition',
    });
    expect(montant).toBe(50000);
  });
});

describe('computeSoldeRecompenses', () => {
  it('cas 3 — récompenses réciproques pour le même époux : compensation nette (art. 1470-1474)', () => {
    const solde = computeSoldeRecompenses([
      {
        sens: 'epoux_vers_communaute',
        epoux: 'user',
        depenseFaite: 100000,
        valeurBienAcquisition: 200000,
        valeurBienLiquidation: 500000,
        natureDepense: 'acquisition',
      }, // montant = 250 000, doit à la communauté
      {
        sens: 'communaute_vers_epoux',
        epoux: 'user',
        depenseFaite: 30000,
        natureDepense: 'autre',
      }, // pas de valeurs avant/après → nominal, montant = 30 000, communauté doit à l'époux
    ]);

    expect(solde.parEpoux.user.doitALaCommunaute).toBe(250000);
    expect(solde.parEpoux.user.communauteDoitA).toBe(30000);
    expect(solde.parEpoux.user.soldeNet).toBe(220000);
    expect(solde.parEpoux.spouse.soldeNet).toBe(0);
    expect(solde.ajustementBoniCommun).toBe(220000);
  });
});

describe('computeMontantCreance', () => {
  it('cas 4 — profit subsistant (défaut légal, art. 1469 al. 3 par renvoi de l\'art. 1479 al. 2)', () => {
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienAvant: 200000,
      valeurBienApres: 260000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(60000);
  });

  it('cas 5 — mode nominal (convention contraire, art. 1479 al. 2) : montant = dépense faite', () => {
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienAvant: 200000,
      valeurBienApres: 260000,
      natureDepense: 'amelioration',
      modeEvaluationConventionnel: 'nominal',
    });
    expect(montant).toBe(40000);
  });
});

describe('computeSoldeCreancesEntreEpoux', () => {
  it('agrège le solde net par patrimoine propre, indépendamment du boni commun', () => {
    const solde = computeSoldeCreancesEntreEpoux([
      {
        epouxCreancier: 'user',
        epouxDebiteur: 'spouse',
        depenseFaite: 40000,
        valeurBienAvant: 200000,
        valeurBienApres: 260000,
        natureDepense: 'amelioration',
      },
    ]);
    expect(solde.user).toBe(60000);
    expect(solde.spouse).toBe(-60000);
  });
});

describe('regimeHasMasseCommune', () => {
  it('true pour un régime communautaire', () => {
    expect(regimeHasMasseCommune('Communauté réduite aux acquêts (option sans contrat de mariage)')).toBe(true);
    expect(regimeHasMasseCommune('Communauté universelle')).toBe(true);
  });

  it('true pour séparation de biens avec société d\'acquêts', () => {
    expect(regimeHasMasseCommune("Séparation de biens avec société d'acquêts")).toBe(true);
  });

  it('false pour séparation de biens simple ou participation aux acquêts', () => {
    expect(regimeHasMasseCommune('Séparation de biens')).toBe(false);
    expect(regimeHasMasseCommune('Participation aux acquêts')).toBe(false);
  });

  it('false si régime absent', () => {
    expect(regimeHasMasseCommune(undefined)).toBe(false);
    expect(regimeHasMasseCommune(null)).toBe(false);
  });
});
