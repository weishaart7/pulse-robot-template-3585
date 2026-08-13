import { describe, it, expect } from 'vitest';
import { pensionBaseCNAVPL } from './calculCNAVPL';
import { majorationTroisEnfants } from './calcul';

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

describe('CNBF — majoration pour 3 enfants (référentiel §6.3 : 10 %, à compter du 01/09/2023)', () => {
  // Aucun moteur de calcul de pension de base CNBF n'existe dans ce dépôt à
  // ce jour (aucun fichier calculCNBF.ts) — seule la fonction de majoration
  // elle-même est vérifiable ici, réutilisée telle quelle depuis calcul.ts.
  it('même taux flat 10 % que le régime général, aucun palier', () => {
    expect(majorationTroisEnfants(3)).toBe(10);
    expect(majorationTroisEnfants(5)).toBe(10); // pas de +5 %/enfant, à la différence de la fonction publique
  });
});
