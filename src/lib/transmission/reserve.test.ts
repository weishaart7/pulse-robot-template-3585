import { describe, it, expect } from 'vitest';
import { computeMasseCalcul, computeReserveAndQD, imputeLiberalites, computeRapport, applyReductions, ReductionResult } from './reserve';
import { Liberalite, PatrimonySnapshot } from './types';

const noReduction: ReductionResult = { reductions: [], totalReduit: 0 };
const patrimony300k: PatrimonySnapshot = { date: '2026-07-17', biensExistants: 300000, passifs: 0 };

describe('computeMasseCalcul', () => {
  it('écrête à 0 le solde (biens - passifs) avant réunion fictive quand le passif excède l\'actif (art. 922)', () => {
    // Audit 2026-08 (T2) : biens 100 000, passifs 150 000 -> solde -50 000, écrêté à 0.
    // + donation 200 000 -> masse de calcul attendue 200 000 (et non 150 000 sans écrêtement).
    const patrimony: PatrimonySnapshot = { date: '2026-08-05', biensExistants: 100000, passifs: 150000 };
    const liberalites: Liberalite[] = [
      {
        id: 'don-1',
        type: 'donation',
        beneficiaireId: 'enfant1',
        valeur: 200000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    expect(computeMasseCalcul(patrimony, liberalites)).toBe(200000);
  });
});

// 2 enfants, pas de conjoint : réserve enfants = 2/3, QD = 1/3.
// masseCalcul = 300 000 -> reserveEnfants = 200 000, quotiteDisponible = 100 000.
const reserveResult2Enfants = () => computeReserveAndQD(300000, 2, false);

describe('imputeLiberalites — legs', () => {
  it('legs avance_part à un enfant réservataire, sous sa réserve personnelle : imputé sur sa part, aucun impact sur la QD', () => {
    const reserveResult = reserveResult2Enfants();
    // réserve personnelle par enfant = 200 000 / 2 = 100 000
    const legs: Liberalite[] = [
      {
        id: 'legs-1',
        type: 'legs',
        beneficiaireId: 'enfant1',
        valeur: 40000,
        date: '2026-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = imputeLiberalites(legs, reserveResult, ['enfant1', 'enfant2']);

    expect(result.legs).toEqual([{ liberaliteId: 'legs-1', imputeSurQD: 0, besoinSurQD: 0 }]);
    expect(result.qdRestante).toBe(reserveResult.quotiteDisponible);
    expect(result.reserveAtteinte).toBe(false);
  });

  it('legs hors_part d\'un montant modéré (sous la QD) : imputé uniquement sur la QD, réserve des enfants non affectée', () => {
    const reserveResult = reserveResult2Enfants();
    const legs: Liberalite[] = [
      {
        id: 'legs-2',
        type: 'legs',
        beneficiaireId: 'tiers',
        valeur: 60000,
        date: '2026-01-01',
        typeImputation: 'hors_part',
      },
    ];

    const result = imputeLiberalites(legs, reserveResult, ['enfant1', 'enfant2']);

    expect(result.legs).toEqual([{ liberaliteId: 'legs-2', imputeSurQD: 60000, besoinSurQD: 60000 }]);
    expect(result.qdRestante).toBe(reserveResult.quotiteDisponible - 60000);
    expect(result.reserveAtteinte).toBe(false);
  });

  it('scénario combiné : legs avance_part à un enfant + legs hors_part à un tiers, sans dépassement de la QD', () => {
    const reserveResult = reserveResult2Enfants();
    // réserve personnelle par enfant = 100 000
    const legs: Liberalite[] = [
      {
        id: 'legs-avance-part',
        type: 'legs',
        beneficiaireId: 'enfant1',
        valeur: 30000,
        date: '2026-01-01',
        typeImputation: 'avance_part',
      },
      {
        id: 'legs-hors-part',
        type: 'legs',
        beneficiaireId: 'tiers',
        valeur: 50000,
        date: '2026-02-01',
        typeImputation: 'hors_part',
      },
    ];

    const result = imputeLiberalites(legs, reserveResult, ['enfant1', 'enfant2']);

    const legsAvancePart = result.legs.find((l) => l.liberaliteId === 'legs-avance-part');
    const legsHorsPart = result.legs.find((l) => l.liberaliteId === 'legs-hors-part');

    // Le legs avance_part reste dans la réserve personnelle de enfant1 (30 000 < 100 000) : 0 sur la QD.
    expect(legsAvancePart?.imputeSurQD).toBe(0);
    // Le legs hors_part s'impute intégralement sur la QD.
    expect(legsHorsPart?.imputeSurQD).toBe(50000);
    // QD entamée uniquement par le legs hors_part : 100 000 - 50 000 = 50 000 restants.
    expect(result.qdRestante).toBe(reserveResult.quotiteDisponible - 50000);
    expect(result.reserveAtteinte).toBe(false);
  });
});

describe('imputeLiberalites — donations avance_part', () => {
  it('donation avance_part à un enfant réservataire, sous sa réserve personnelle : imputée sur sa part, aucun impact sur la QD', () => {
    const reserveResult = reserveResult2Enfants();
    // réserve personnelle par enfant = 100 000
    const donations: Liberalite[] = [
      {
        id: 'don-1',
        type: 'donation',
        beneficiaireId: 'enfant1',
        valeur: 40000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = imputeLiberalites(donations, reserveResult, ['enfant1', 'enfant2']);

    expect(result.donations).toEqual([
      { liberaliteId: 'don-1', imputeSurReserve: 40000, imputeSurQD: 0, besoinSurQD: 0 },
    ]);
    expect(result.qdRestante).toBe(reserveResult.quotiteDisponible);
    expect(result.reserveAtteinte).toBe(false);
  });

  it('donation avance_part dépassant la réserve personnelle de l\'enfant, excédent absorbé par la QD (pas de dépassement total)', () => {
    const reserveResult = reserveResult2Enfants();
    // réserve personnelle par enfant = 100 000, QD = 100 000
    const donations: Liberalite[] = [
      {
        id: 'don-2',
        type: 'donation',
        beneficiaireId: 'enfant1',
        valeur: 150000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = imputeLiberalites(donations, reserveResult, ['enfant1', 'enfant2']);

    const don2 = result.donations.find((d) => d.liberaliteId === 'don-2');
    // Réserve personnelle (100 000) saturée, excédent de 50 000 basculé sur la QD.
    expect(don2?.imputeSurReserve).toBe(100000);
    expect(don2?.imputeSurQD).toBe(50000);
    // QD entamée uniquement par l'excédent : 100 000 - 50 000 = 50 000 restants.
    expect(result.qdRestante).toBe(50000);
    expect(result.reserveAtteinte).toBe(false);
  });

  it('2 enfants : donation avance_part sous réserve pour l\'un, dépassant légèrement la sienne pour l\'autre — réserves individuelles cloisonnées', () => {
    const reserveResult = reserveResult2Enfants();
    // réserve personnelle par enfant = 100 000
    const donations: Liberalite[] = [
      {
        id: 'don-enfant1',
        type: 'donation',
        beneficiaireId: 'enfant1',
        valeur: 60000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
      {
        id: 'don-enfant2',
        type: 'donation',
        beneficiaireId: 'enfant2',
        valeur: 120000,
        date: '2021-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = imputeLiberalites(donations, reserveResult, ['enfant1', 'enfant2']);

    const donEnfant1 = result.donations.find((d) => d.liberaliteId === 'don-enfant1');
    const donEnfant2 = result.donations.find((d) => d.liberaliteId === 'don-enfant2');

    // enfant1 : 60 000 < 100 000, reste entièrement dans sa réserve personnelle.
    expect(donEnfant1?.imputeSurReserve).toBe(60000);
    expect(donEnfant1?.imputeSurQD).toBe(0);

    // enfant2 : réserve personnelle non entamée par la donation d'enfant1 (cloisonnement) :
    // 100 000 saturés, excédent de 20 000 sur la QD, indépendamment du reliquat de 40 000
    // laissé inutilisé dans la réserve personnelle d'enfant1.
    expect(donEnfant2?.imputeSurReserve).toBe(100000);
    expect(donEnfant2?.imputeSurQD).toBe(20000);

    // QD entamée uniquement par l'excédent d'enfant2 : 100 000 - 20 000 = 80 000 restants.
    expect(result.qdRestante).toBe(80000);
    expect(result.reserveAtteinte).toBe(false);
  });
});

describe('computeRapport', () => {
  it('legs avance_part à un enfant réservataire : rapporté (dans rapports), retenu dans la masse partageable (pas soustrait)', () => {
    const legs: Liberalite[] = [
      {
        id: 'legs-avance-part',
        type: 'legs',
        beneficiaireId: 'enfant1',
        valeur: 40000,
        date: '2026-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = computeRapport(patrimony300k, legs, noReduction, ['enfant1', 'enfant2']);

    expect(result.rapports).toEqual([{ personId: 'enfant1', montantRapport: 40000 }]);
    // Non soustrait : le legs reste dans le pot à diviser, biensExistants - passifs = 300 000.
    expect(result.massePartageable).toBe(300000);
  });

  it('legs hors_part : absent de rapports, soustrait de la masse partageable', () => {
    const legs: Liberalite[] = [
      {
        id: 'legs-hors-part',
        type: 'legs',
        beneficiaireId: 'tiers',
        valeur: 50000,
        date: '2026-01-01',
        typeImputation: 'hors_part',
      },
    ];

    const result = computeRapport(patrimony300k, legs, noReduction, ['enfant1', 'enfant2']);

    expect(result.rapports).toEqual([]);
    // Prélevé avant partage : 300 000 - 50 000 = 250 000.
    expect(result.massePartageable).toBe(250000);
  });

  it('donation avance_part rapportable : réintégrée nette de réduction dans la masse partageable, apparaît dans rapports', () => {
    const donations: Liberalite[] = [
      {
        id: 'don-avance-part',
        type: 'donation',
        beneficiaireId: 'enfant2',
        valeur: 30000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = computeRapport(patrimony300k, donations, noReduction, ['enfant1', 'enfant2']);

    expect(result.rapports).toEqual([{ personId: 'enfant2', montantRapport: 30000 }]);
    // Réintégrée : biensExistants + donation rapportée = 300 000 + 30 000 = 330 000.
    expect(result.massePartageable).toBe(330000);
  });

  it('donation avance_part au conjoint : jamais tenu au rapport (art. 857), non réintégrée dans la masse partageable', () => {
    // Audit 2026-08 (T5) : le conjoint n'est pas dans childrenIds. Une donation
    // marquée 'avance_part' à son profit ne doit pas être réintégrée dans la
    // masse à partager, contrairement à une donation à un enfant réservataire.
    const donations: Liberalite[] = [
      {
        id: 'don-conjoint',
        type: 'donation',
        beneficiaireId: 'conjoint',
        valeur: 50000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = computeRapport(patrimony300k, donations, noReduction, ['enfant1', 'enfant2']);

    expect(result.rapports).toEqual([]);
    // Non réintégrée : massePartageable reste biensExistants - passifs = 300 000.
    expect(result.massePartageable).toBe(300000);
  });

  it('donation à un enfant réservataire sans typeImputation renseigné : traitée comme avance_part de bout en bout (art. 843)', () => {
    // Audit 2026-08 (T4) : Marie, 2 enfants (Aurélien, Blandine), pas de conjoint.
    // Donation à Aurélien de 100 000 €, type de donation non choisi (undefined).
    // Doit désormais être rapportée comme une donation avance_part explicite,
    // cohérent avec imputeLiberalites qui l'impute déjà sur la réserve d'Aurélien.
    const donations: Liberalite[] = [
      {
        id: 'don-aurelien-sans-type',
        type: 'donation',
        beneficiaireId: 'aurelien',
        valeur: 100000,
        date: '2020-01-01',
        // typeImputation volontairement omis
      },
    ];

    const result = computeRapport(patrimony300k, donations, noReduction, ['aurelien', 'blandine']);

    expect(result.rapports).toEqual([{ personId: 'aurelien', montantRapport: 100000 }]);
    // Réintégrée : biensExistants + donation rapportée = 300 000 + 100 000 = 400 000.
    expect(result.massePartageable).toBe(400000);
  });

  it('donation-partage à un enfant réservataire : reste exclue du rapport malgré l\'alignement sur imputeLiberalites', () => {
    // Non-régression : l'alignement de computeRapport sur imputeLiberalites (T4)
    // ne doit pas rendre une donation-partage rapportable — sa valeur est figée
    // au jour de l'acte et n'est jamais réévaluée au partage (§8.4/§9.4).
    const donations: Liberalite[] = [
      {
        id: 'don-partage-enfant1',
        type: 'donation',
        beneficiaireId: 'enfant1',
        valeur: 60000,
        date: '2020-01-01',
        typeImputation: 'partage',
      },
    ];

    const result = computeRapport(patrimony300k, donations, noReduction, ['enfant1', 'enfant2']);

    expect(result.rapports).toEqual([]);
    expect(result.massePartageable).toBe(300000);
  });

  it('scénario combiné : legs avance_part + legs hors_part + donation avance_part, 2 enfants, sans dépassement de QD', () => {
    const liberalites: Liberalite[] = [
      {
        id: 'legs-avance-part',
        type: 'legs',
        beneficiaireId: 'enfant1',
        valeur: 40000,
        date: '2026-01-01',
        typeImputation: 'avance_part',
      },
      {
        id: 'legs-hors-part',
        type: 'legs',
        beneficiaireId: 'tiers',
        valeur: 50000,
        date: '2026-01-01',
        typeImputation: 'hors_part',
      },
      {
        id: 'don-avance-part',
        type: 'donation',
        beneficiaireId: 'enfant2',
        valeur: 30000,
        date: '2020-01-01',
        typeImputation: 'avance_part',
      },
    ];

    const result = computeRapport(patrimony300k, liberalites, noReduction, ['enfant1', 'enfant2']);

    // Calcul manuel de contrôle (reserve.ts:299-353) :
    // massePartageable = biensExistants - passifs = 300 000 - 0 = 300 000
    // Boucle legs :
    //   - legs-avance-part (enfant1, réservataire, avance_part) : rapporté, PAS soustrait -> masse inchangée = 300 000
    //   - legs-hors-part (tiers, hors_part)                     : soustrait -> 300 000 - 50 000 = 250 000
    // Boucle donations avance_part :
    //   - don-avance-part (enfant2, avance_part) : réintégrée -> 250 000 + 30 000 = 280 000
    // + indemnités de réduction (totalReduit = 0, pas de dépassement de QD dans ce scénario) -> 280 000
    expect(result.massePartageable).toBe(280000);
    expect(result.rapports).toEqual([
      { personId: 'enfant1', montantRapport: 40000 },
      { personId: 'enfant2', montantRapport: 30000 },
    ]);
  });
});

describe('imputeLiberalites + applyReductions — dépassement réel de la QD', () => {
  it('2 legs hors_part (100 000 € et 50 000 €) pour une QD de 100 000 € : reserveAtteinte détecté, réduction proportionnelle correcte', () => {
    const reserveResult = reserveResult2Enfants();
    // QD = 100 000. Besoin brut total des legs = 100 000 + 50 000 = 150 000 > 100 000 -> dépassement de 50 000.
    const legs: Liberalite[] = [
      {
        id: 'legs-100k',
        type: 'legs',
        beneficiaireId: 'tiers1',
        valeur: 100000,
        date: '2026-01-01',
        typeImputation: 'hors_part',
      },
      {
        id: 'legs-50k',
        type: 'legs',
        beneficiaireId: 'tiers2',
        valeur: 50000,
        date: '2026-02-01',
        typeImputation: 'hors_part',
      },
    ];

    const imputationResult = imputeLiberalites(legs, reserveResult, ['enfant1', 'enfant2']);

    expect(imputationResult.besoinTotalSurQD).toBe(150000);
    expect(imputationResult.reserveAtteinte).toBe(true);

    const reductionResult = applyReductions(legs, imputationResult, reserveResult);

    // Legs concurrents de même rang (art. 926 C. civ.) : réduits au marc le franc,
    // chacun au même taux = dépassement / besoin total = 50 000 / 150 000 = 1/3.
    // legs-100k : réduit de 100 000 * 1/3 = 33 333,33 €.
    // legs-50k  : réduit de 50 000 * 1/3 = 16 666,67 €.
    const reduction100k = reductionResult.reductions.find(r => r.liberaliteId === 'legs-100k');
    const reduction50k = reductionResult.reductions.find(r => r.liberaliteId === 'legs-50k');

    expect(reduction100k?.montantReduit).toBeCloseTo(33333.33, 2);
    expect(reduction50k?.montantReduit).toBeCloseTo(16666.67, 2);
    expect(reduction100k?.ratioReduction).toBeCloseTo(1 / 3, 5);
    expect(reduction50k?.ratioReduction).toBeCloseTo(1 / 3, 5);
    expect(reductionResult.totalReduit).toBeCloseTo(50000, 2);
  });

  it('2 legs concurrents de même montant (100 000 € chacun) pour une QD de 100 000 € : partage 50/50, pas 100/0', () => {
    const reserveResult = reserveResult2Enfants();
    // QD = 100 000. Besoin brut total = 100 000 + 100 000 = 200 000 -> dépassement de 100 000.
    // Avec le bug initial (imputeSurQD capé séquentiellement), le premier legs traité
    // aurait absorbé 100 000 € et le second 0 € : partage 100/0 au lieu du 50/50 dû en droit.
    const legs: Liberalite[] = [
      {
        id: 'legs-A',
        type: 'legs',
        beneficiaireId: 'tiers1',
        valeur: 100000,
        date: '2026-01-01',
        typeImputation: 'hors_part',
      },
      {
        id: 'legs-B',
        type: 'legs',
        beneficiaireId: 'tiers2',
        valeur: 100000,
        date: '2026-02-01',
        typeImputation: 'hors_part',
      },
    ];

    const imputationResult = imputeLiberalites(legs, reserveResult, ['enfant1', 'enfant2']);

    expect(imputationResult.besoinTotalSurQD).toBe(200000);
    expect(imputationResult.reserveAtteinte).toBe(true);

    const reductionResult = applyReductions(legs, imputationResult, reserveResult);

    const reductionA = reductionResult.reductions.find(r => r.liberaliteId === 'legs-A');
    const reductionB = reductionResult.reductions.find(r => r.liberaliteId === 'legs-B');

    // Partage 50/50 : chaque legs réduit de 50 000 €, ratio 0,5 chacun.
    expect(reductionA?.montantReduit).toBeCloseTo(50000, 2);
    expect(reductionB?.montantReduit).toBeCloseTo(50000, 2);
    expect(reductionA?.ratioReduction).toBeCloseTo(0.5, 5);
    expect(reductionB?.ratioReduction).toBeCloseTo(0.5, 5);
    expect(reductionResult.totalReduit).toBeCloseTo(100000, 2);
  });
});
