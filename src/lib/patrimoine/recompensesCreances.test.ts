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

describe('computeMontantRecompense — 4 branches art. 1469 (chantier 3)', () => {
  // Constat sur les branches 1/2 : la nature 'autre' donne toujours un
  // profit subsistant null (computeProfitSubsistant ne définit de formule
  // que pour acquisition/conservation/amelioration), donc ces deux branches
  // ne peuvent pas être exercées avec un profit subsistant réel — seul le
  // filet de sécurité (chantier 1, profitSubsistant == null → depenseFaite)
  // s'applique, quelle que soit la comparaison depenseFaite/profitSubsistant.

  it('branche 1 — ni nécessaire ni qualifiante (nature \'autre\') : profit subsistant non calculable, filet → dépense faite', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 500000, // sans effet : 'autre' ne produit jamais de profit subsistant
      natureDepense: 'autre',
      depenseNecessaire: false,
    });
    expect(montant).toBe(100000);
  });

  it('branche 1 (bis) — même constat avec des valeurs de bien en moins-value', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 50000,
      natureDepense: 'autre',
      depenseNecessaire: false,
    });
    expect(montant).toBe(100000);
  });

  it('branche 2 — nécessaire seule (nature \'autre\') : plancher dépense faite (al. 2) — coïncide ici avec le filet ci-dessus', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 500000,
      natureDepense: 'autre',
      depenseNecessaire: true,
    });
    expect(montant).toBe(100000);
  });

  it('branche 2 (bis) — idem, moins-value', () => {
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 50000,
      natureDepense: 'autre',
      depenseNecessaire: true,
    });
    expect(montant).toBe(100000);
  });

  it('branche 3 — qualifiante seule, depenseFaite > profitSubsistant : plancher profit subsistant (al. 3) l\'emporte quand même', () => {
    // acquisition 100 000 sur bien à 200 000, bien à 100 000 à la liquidation (moins-value)
    // → profitSubsistant = 100000 * (100000/200000) = 50000, < depenseFaite (100000)
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 100000,
      natureDepense: 'acquisition',
      depenseNecessaire: false,
    });
    expect(montant).toBe(50000);
  });

  it('branche 3 (bis) — qualifiante seule, depenseFaite < profitSubsistant : plancher profit subsistant (al. 3)', () => {
    // acquisition 100 000 sur bien à 200 000, bien à 500 000 à la liquidation (plus-value)
    // → profitSubsistant = 500000 * (100000/200000) = 250000, > depenseFaite (100000)
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 500000,
      natureDepense: 'acquisition',
      depenseNecessaire: false,
    });
    expect(montant).toBe(250000);
  });

  it('branche 4 — nécessaire ET qualifiante, depenseFaite > profitSubsistant : les deux planchers cumulés retiennent la dépense faite', () => {
    // Mêmes valeurs que la branche 3 (moins-value) : profitSubsistant = 50000 < depenseFaite = 100000.
    // Cible légale (al. 2 + al. 3 cumulés) : max(depenseFaite, profitSubsistant) = 100000.
    // AVANT LA MIGRATION : le moteur ignore depenseNecessaire et retombe sur le comportement
    // "qualifiante seule" (toujours profitSubsistant) → ce test échoue sur le code actuel,
    // c'est précisément le bug que ce chantier corrige.
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 100000,
      natureDepense: 'acquisition',
      depenseNecessaire: true,
    });
    expect(montant).toBe(100000);
  });

  it('branche 4 (bis) — nécessaire ET qualifiante, depenseFaite < profitSubsistant : le profit subsistant l\'emporte, cas déjà correct aujourd\'hui', () => {
    // Mêmes valeurs que la branche 3 bis (plus-value) : profitSubsistant = 250000 > depenseFaite = 100000.
    // Cible légale : max(depenseFaite, profitSubsistant) = 250000 — coïncide avec le
    // comportement actuel du moteur (déjà correct dans ce cas précis).
    const montant = computeMontantRecompense({
      sens: 'epoux_vers_communaute',
      epoux: 'user',
      depenseFaite: 100000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 500000,
      natureDepense: 'acquisition',
      depenseNecessaire: true,
    });
    expect(montant).toBe(250000);
  });
});

describe('computeMontantRecompense — amélioration', () => {
  it('qualifiante seule : plancher = plus-value procurée, et non le prorata', () => {
    // Profit 30000 < dépense 40000, plancher al. 3 = 30000
    const montant = computeMontantRecompense({
      sens: 'communaute_vers_epoux',
      epoux: 'user',
      depenseFaite: 40000,
      valeurBienAcquisition: 200000,
      valeurBienLiquidation: 260000,
      valeurBienSansTravaux: 230000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(30000);
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
  it('cas 4 — profit subsistant au prorata pour une conservation (défaut légal, art. 1469 al. 3 par renvoi de l\'art. 1479 al. 2)', () => {
    // 260000 * (40000/200000) = 52000
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienAvant: 200000,
      valeurBienApres: 260000,
      natureDepense: 'conservation',
    });
    expect(montant).toBe(52000);
  });

  it('amélioration : plus-value procurée par les travaux (Cass. 1re civ., 22 févr. 2017)', () => {
    // (260000 - 230000) * 40000/40000 = 30000 (le prorata donnait 52000)
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienAvant: 200000,
      valeurBienApres: 260000,
      valeurBienSansTravaux: 230000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(30000);
  });

  it('amélioration financée en partie : part de la plus-value (Cass. 1re civ., 23 mai 2024)', () => {
    // Exemple AUREP : (400000 - 350000) * 10000/20000 = 25000
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 10000,
      valeurBienApres: 400000,
      valeurBienSansTravaux: 350000,
      coutTotalTravaux: 20000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(25000);
  });

  it('amélioration sans valeur « sans travaux » : nominal', () => {
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienAvant: 200000,
      valeurBienApres: 260000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(40000);
  });

  it('amélioration sans plus-value : profit nul', () => {
    const montant = computeMontantCreance({
      epouxCreancier: 'user',
      epouxDebiteur: 'spouse',
      depenseFaite: 40000,
      valeurBienApres: 220000,
      valeurBienSansTravaux: 230000,
      natureDepense: 'amelioration',
    });
    expect(montant).toBe(0);
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
        natureDepense: 'conservation',
      },
    ]);
    expect(solde.user).toBe(52000);
    expect(solde.spouse).toBe(-52000);
  });
});

describe('regimeHasMasseCommune', () => {
  it('true pour un régime communautaire', () => {
    expect(regimeHasMasseCommune('Communauté réduite aux acquêts')).toBe(true);
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
