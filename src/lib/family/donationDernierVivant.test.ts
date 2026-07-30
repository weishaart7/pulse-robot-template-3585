import { describe, it, expect } from 'vitest';
import { buildDonationDernierVivantWrite } from './donationDernierVivant';

describe('buildDonationDernierVivantWrite — écriture depuis RelationInfoForm.tsx (onglet Donation)', () => {
  it('updates fourni : écrit exactement les 4 champs transmis, sans tenir compte de fresh', () => {
    const payload = buildDonationDernierVivantWrite(
      {
        donation_dernier_vivant_personne: true,
        date_donation_personne: '2021-01-01',
        donation_dernier_vivant_conjoint: false,
        date_donation_conjoint: undefined,
      },
      { donation_dernier_vivant_personne: false, donation_dernier_vivant_conjoint: true }
    );

    expect(payload).toEqual({
      donation_dernier_vivant_personne: true,
      date_donation_personne: '2021-01-01',
      donation_dernier_vivant_conjoint: false,
      date_donation_conjoint: undefined,
    });
  });

  it('fusionne les autres champs du même onglet (regime_matrimonial, etc.) via extra', () => {
    const payload = buildDonationDernierVivantWrite(
      { donation_dernier_vivant_personne: true, donation_dernier_vivant_conjoint: false },
      null,
      { regime_matrimonial: 'Séparation de biens', lieu_mariage: 'Paris' }
    );

    expect(payload).toEqual({
      regime_matrimonial: 'Séparation de biens',
      lieu_mariage: 'Paris',
      donation_dernier_vivant_personne: true,
      donation_dernier_vivant_conjoint: false,
    });
  });
});

describe('buildDonationDernierVivantWrite — écriture depuis useMatrimonialClauses.ts (onglet Clauses du contrat)', () => {
  it('updates null : réécrit la valeur fraîche lue en base, pas de valeurs par défaut arbitraires', () => {
    const payload = buildDonationDernierVivantWrite(
      null,
      {
        donation_dernier_vivant_personne: true,
        date_donation_personne: '2022-05-10',
        donation_dernier_vivant_conjoint: true,
        date_donation_conjoint: '2022-05-10',
      },
      { clauses_contrat: { preciput: { enabled: true } } }
    );

    expect(payload).toEqual({
      clauses_contrat: { preciput: { enabled: true } },
      donation_dernier_vivant_personne: true,
      date_donation_personne: '2022-05-10',
      donation_dernier_vivant_conjoint: true,
      date_donation_conjoint: '2022-05-10',
    });
  });

  it('updates null, fresh absent (pas encore de ligne en base) : retombe sur false/undefined, jamais une exception', () => {
    const payload = buildDonationDernierVivantWrite(null, null, { clauses_contrat: {} });

    expect(payload).toEqual({
      clauses_contrat: {},
      donation_dernier_vivant_personne: false,
      date_donation_personne: undefined,
      donation_dernier_vivant_conjoint: false,
      date_donation_conjoint: undefined,
    });
  });
});

describe('buildDonationDernierVivantWrite — scénario de course (onglet Donation coché puis Enregistré, puis clause cochée dans l\'autre onglet)', () => {
  it("une modification enregistrée entre-temps dans l'autre onglet n'est pas écrasée par un appel qui ne touche pas à la donation", () => {
    // t0 : DB départ — aucune donation.
    // t1 : RelationInfoForm (onglet Donation) coche "donation au dernier vivant"
    //      et clique Enregistrer -> écrit true en base (simulé directement dans `fresh`,
    //      qui représente l'état lu en base au moment de l'appel suivant).
    const freshApresEnregistrementDonation = {
      donation_dernier_vivant_personne: true,
      date_donation_personne: '2024-03-01',
      donation_dernier_vivant_conjoint: false,
      date_donation_conjoint: undefined,
    };

    // t2 : useMatrimonialClauses (onglet Clauses du contrat, resté monté avec sa
    //      propre copie locale de `donation` figée à l'ancien état false) coche
    //      une clause -> performSave appelle setDonationDernierVivant(null, {clauses_contrat}),
    //      donc updates = null ici : il ne doit PAS réembarquer sa copie locale périmée.
    const payload = buildDonationDernierVivantWrite(
      null,
      freshApresEnregistrementDonation,
      { clauses_contrat: { preciput: { enabled: true } } }
    );

    // La donation enregistrée à t1 doit survivre à l'écriture de clause de t2.
    expect(payload.donation_dernier_vivant_personne).toBe(true);
    expect(payload.date_donation_personne).toBe('2024-03-01');
    expect(payload).toEqual({
      clauses_contrat: { preciput: { enabled: true } },
      donation_dernier_vivant_personne: true,
      date_donation_personne: '2024-03-01',
      donation_dernier_vivant_conjoint: false,
      date_donation_conjoint: undefined,
    });
  });
});
