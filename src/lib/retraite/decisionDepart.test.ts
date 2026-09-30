import { describe, it, expect } from 'vitest';
import {
  sexeDepuisCivilite,
  ageReferenceDeces,
  datesDepartCandidates,
  deciderDateDepart,
} from './decisionDepart';
import { SimulateurDepart, ResultatSimulationDepart } from './simulationDepart';

const dateNaissance = { annee: 1970, mois: 3 };
const depart0 = new Date(Date.UTC(2034, 3, 1)); // 64 ans 0 mois
const indexMois = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();

// Simulateur fictif : 12 000 €/an au premier départ, +100 € par mois d'attente,
// décote jusqu'à 12 mois d'attente.
const simulateurFictif: SimulateurDepart = {
  carriereLongue: { options: [], premiereDateEligible: null },
  dateEffetDepartConfirme: null,
  dateEffetAgeLegal: depart0,
  dateDepartAuPlusTot: depart0,
  departAnticipeOuvertA: () => null,
  trimestresProjetesJusqua: () => 0,
  complementairesPourDepart: () => 0,
  simuler: (dateEffet: Date): ResultatSimulationDepart => {
    const m = indexMois(dateEffet) - indexMois(depart0);
    const pensionTotale = 12000 + 100 * m;
    return {
      dateEffet,
      ageDepartAnnees: 64 + m / 12,
      avantAgeLegal: false,
      departAnticipe: null,
      trimestresProjetes: 0,
      trimestresValidesProjetes: 0,
      trimestresTousRegimes: 0,
      trimestresRequis: 172,
      decote: m < 12 ? -5 : 0,
      surcoteTotalePct: 0,
      pensionBaseBrute: pensionTotale,
      pensionBaseValue: pensionTotale,
      pensionComplementaires: 0,
      pensionAutresRegimes: 0,
      rafpCapital: 0,
      pensionTotale,
    };
  },
};

describe('sexeDepuisCivilite / ageReferenceDeces (INSEE 2025, espérance de vie à 65 ans)', () => {
  it('civilités de la fiche famille', () => {
    expect(sexeDepuisCivilite('M.')).toBe('homme');
    expect(sexeDepuisCivilite('Mme')).toBe('femme');
    expect(sexeDepuisCivilite('Mlle')).toBe('femme');
    expect(sexeDepuisCivilite(null)).toBeNull();
  });
  it('âges de référence : 85,0 (hommes), 88,6 (femmes), 86,8 (inconnu)', () => {
    expect(ageReferenceDeces('homme')).toBeCloseTo(85, 6);
    expect(ageReferenceDeces('femme')).toBeCloseTo(88.6, 6);
    expect(ageReferenceDeces(null)).toBeCloseTo(86.8, 6);
  });
});

describe('datesDepartCandidates', () => {
  it('trimestre par trimestre, du premier départ au mois suivant les 70 ans (25 dates)', () => {
    const dates = datesDepartCandidates(simulateurFictif, dateNaissance);
    expect(dates).toHaveLength(25);
    expect(dates[dates.length - 1].toISOString().slice(0, 10)).toBe('2040-04-01');
  });
});

describe('deciderDateDepart — scénario D1 (docs/Golden_Scenarios_Retraite.md)', () => {
  const r = deciderDateDepart({ simulateur: simulateurFictif, dateNaissance, sexe: null, tauxActualisation: 0 });

  it('cumul au premier départ : 1 000 €/mois × 273 mois jusqu\'à 86 ans 10 mois', () => {
    expect(r.lignes[0].cumul).toBeCloseTo(273000, 6);
  });
  it('départ un an plus tard : 12 000 € perdus, 1 200 €/an gagnés → rattrapage à 75 ans', () => {
    const unAn = r.lignes[4];
    expect(unAn.cumul).toBeCloseTo((13200 / 12) * 261, 6);
    expect(unAn.ageRecuperation).toBeCloseTo(75, 6);
  });
  it('taux plein au bout de 12 mois ; meilleur cumul au départ le plus tardif testé', () => {
    expect(r.premiereDateTauxPlein?.toISOString().slice(0, 10)).toBe('2035-04-01');
    expect(r.meilleure?.simulation.dateEffet.toISOString().slice(0, 10)).toBe('2040-04-01');
  });
  it('sensibilité : une vie plus courte avance la meilleure date', () => {
    expect(r.meilleureSiVieCourte!.getTime()).toBeLessThan(r.meilleure!.simulation.dateEffet.getTime());
    expect(r.meilleureSiVieLongue!.getTime()).toBe(r.meilleure!.simulation.dateEffet.getTime());
  });
  it('actualisation : un taux positif réduit le cumul d\'un départ tardif', () => {
    const actualise = deciderDateDepart({ simulateur: simulateurFictif, dateNaissance, sexe: null, tauxActualisation: 0.03 });
    expect(actualise.lignes[24].cumul).toBeLessThan(r.lignes[24].cumul);
    expect(actualise.lignes[0].cumul).toBeLessThan(r.lignes[0].cumul);
  });
});
