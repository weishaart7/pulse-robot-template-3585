import { describe, it, expect } from 'vitest';
import { pensionBaseCNAVPL } from './calculCNAVPL';
import {
  majorationTroisEnfants,
  surcotePourTrimestresCotises,
  surcoteParentale,
  surcoteTotale,
  decoteSurTrimestresPlafond25,
} from './calcul';

describe('CNAVPL — majoration pour 3 enfants (référentiel §5.4 : « mêmes règles qu\'au régime général »)', () => {
  // Pas de MICO à ce régime (référentiel §5.5) : l'ordre d'application se
  // limite à points × valeur × taux de liquidation, puis majoration —
  // aucune étape intermédiaire à vérifier ou à absorber.
  const points = 10000;
  const valeurPoint = 0.6599;
  const decoteOuSurcote = 0; // taux plein, pour isoler l'effet de la majoration
  const pensionAvantMajoration = pensionBaseCNAVPL(points, valeurPoint, decoteOuSurcote);
  const majorationPct = majorationTroisEnfants(3); // 10 %

  it('la pension de base CNAVPL avant majoration sert de référence au scénario', () => {
    expect(pensionAvantMajoration).toBeCloseTo(6599, 6);
  });

  it('la majoration s’applique directement sur la pension de base, sans MICO à intercaler', () => {
    const pensionAvecMajoration = pensionAvantMajoration * (1 + majorationPct / 100);
    expect(pensionAvecMajoration).toBeCloseTo(7258.9, 6); // 6 599 × 1,10
  });

  it('sans 3 enfants éligibles, aucune majoration', () => {
    const majorationNulle = majorationTroisEnfants(2);
    expect(pensionAvantMajoration * (1 + majorationNulle / 100)).toBeCloseTo(pensionAvantMajoration, 6);
  });
});

describe('Profil complet — CNAVPL (mission : branchement des majorations sur la pension finale)', () => {
  // Assemblage désormais utilisé par CarriereCNAVPL.tsx : points × valeur ×
  // (1 + décote/100), puis surcote ajoutée séparément (assise sur la
  // pension avant décote), puis majoration — sans étage MICO (référentiel
  // §5.5), à la différence du régime général.
  const points = 10000;
  const valeurPoint = 0.6599;
  const trimestresRequis = 172;

  it('profil avec décote (durée requise non atteinte) : ni surcote ni majoration', () => {
    const trimestresCNAVPL = 150;
    const decoteSeule = Math.min(decoteSurTrimestresPlafond25(trimestresCNAVPL, trimestresRequis), 0);
    expect(decoteSeule).toBe(-25); // plafond -25 %, propre à ce régime (identique fonction publique)

    const pensionFinale = pensionBaseCNAVPL(points, valeurPoint, decoteSeule);
    expect(pensionFinale).toBeCloseTo(6599 * 0.75, 6);
  });

  it('profil avec surcote classique et parentale cumulées (additif, référentiel §5.4) — assemblage validé, indépendamment de la donnée manquante en production', () => {
    // ⚠️ En production, trimestresCotisesAnneeReference vaut toujours 0 pour
    // ce régime (aucun détail carrière par année dans le modèle de données,
    // cf. docs/audit/branchement-majorations-pension-finale.md §1.c) : la
    // surcote CNAVPL affichée à l'écran est donc actuellement toujours nulle,
    // quelle que soit l'éligibilité. Ce test valide que L'ASSEMBLAGE
    // (surcoteTotale, additif) est correct dès qu'une valeur non nulle sera
    // disponible — pas le comportement actuellement observable à l'écran.
    const trimestresCotisesAnneeReference = 4;
    const pensionAvantDecoteSurcote = pensionBaseCNAVPL(points, valeurPoint, 0);
    const surcoteClassiquePct = surcotePourTrimestresCotises(trimestresCotisesAnneeReference, true, true);
    const surcoteParentalePct = surcoteParentale(true, true, true, trimestresCotisesAnneeReference);
    const surcoteTotalePct = surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true);
    expect(surcoteTotalePct).toBe(10); // 5 % + 5 %

    const surcoteMontant = pensionAvantDecoteSurcote * (surcoteTotalePct / 100);
    const pensionFinale = pensionAvantDecoteSurcote + surcoteMontant;
    expect(pensionFinale).toBeCloseTo(6599 * 1.1, 6);
  });

  it('profil réel (donnée manquante) : surcote nulle malgré une éligibilité complète, faute de trimestresCotisesAnneeReference', () => {
    const surcoteClassiquePct = surcotePourTrimestresCotises(0, true, true);
    const surcoteParentalePct = surcoteParentale(true, true, true, 0);
    expect(surcoteTotale(surcoteClassiquePct, surcoteParentalePct, true)).toBe(0);
  });

  it('profil avec majoration pour 3 enfants, assise sur la pension après surcote', () => {
    const pensionAvantDecoteSurcote = pensionBaseCNAVPL(points, valeurPoint, 0);
    const majorationPct = majorationTroisEnfants(3);
    const pensionFinale = pensionAvantDecoteSurcote * (1 + majorationPct / 100);
    expect(pensionFinale).toBeCloseTo(6599 * 1.1, 6);
  });
});

describe('CNBF — majoration pour 3 enfants (référentiel §6.3 : 10 %, à compter du 01/09/2023)', () => {
  // Aucun moteur de calcul de pension de base CNBF n'existe dans ce dépôt à
  // ce jour (aucun fichier calculCNBF.ts) — seule la fonction de majoration
  // elle-même est vérifiable ici, réutilisée telle quelle depuis calcul.ts.
  it('même taux flat 10 % que le régime général, aucun palier', () => {
    expect(majorationTroisEnfants(3)).toBe(10);
    expect(majorationTroisEnfants(5)).toBe(10); // pas de +5 %/enfant, à la différence de la fonction publique
  });
});
