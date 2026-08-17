import { describe, it, expect } from 'vitest';
import { calculerPensionConsolidee, EntreePensionConsolidee } from './pensionConsolidee';

const entreeBase: EntreePensionConsolidee = {
  salaireAnnuelMoyen: 30000,
  trimestresValides: 160,
  trimestresRequis: 172,
  dateNaissance: { annee: 1990, mois: 6 },
  ageActuel: 35,
  regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 5000, valeurPoint: 1.3498 }],
  detailCarriere: [
    {
      employeur: 'Test',
      typeActivite: 'employeur',
      dateDebut: '2020-01-01',
      dateFin: '2020-12-31',
      revenu: 30000,
      estChiffreAffaires: false,
      regimes: ["L'Assurance retraite"],
    },
  ],
  familyLinks: [],
  auMoinsUnTrimestreMajorationEnfant: false,
  autresPensionsMensuelles: 0,
  fonctionPublique: null,
  cnavpl: null,
};

describe('calculerPensionConsolidee — champs annexe exposés', () => {
  it('expose la répartition par régime, cohérente avec la pension totale (sans FP ni CNAVPL)', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.repartitionParRegime.fonctionPublique).toBe(0);
    expect(resultat.repartitionParRegime.rafp).toBe(0);
    expect(resultat.repartitionParRegime.cnavpl).toBe(0);
    expect(
      resultat.repartitionParRegime.baseRegimeGeneral + resultat.repartitionParRegime.complementaireRegimeGeneral
    ).toBeCloseTo(resultat.pensionTotaleConsolidee, 6);
  });

  it('expose l’historique des trimestres retenus depuis le détail de carrière', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.historiqueTrimestres.total).toBeGreaterThan(0);
    expect(Array.isArray(resultat.historiqueTrimestres.parAnnee)).toBe(true);
  });

  it('expose le résultat de l’âge légal calculé pour la génération de naissance', () => {
    const resultat = calculerPensionConsolidee(entreeBase);

    expect(resultat.ageLegal).not.toBeNull();
  });

  it('renvoie un ageLegal null quand la date de naissance est inconnue', () => {
    const resultat = calculerPensionConsolidee({ ...entreeBase, dateNaissance: null });

    expect(resultat.ageLegal).toBeNull();
  });
});
