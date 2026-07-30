import { describe, it, expect } from 'vitest';
import { buildRelationInfoPayload, RelationInfoFormValues } from './relationInfoPayload';

const baseData: RelationInfoFormValues = {
  regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
  dateMariage: undefined,
  lieuMariage: '',
  pasDeContrat: false,
  impositionDistincte: false,
  residenceSeparee: false,
  loiApplicableRegime: '',
  paysPremierDomicileMatrimonial: '',
  donationDernierVivantPersonne: false,
  dateDonationPersonne: undefined,
  donationDernierVivantConjoint: false,
  dateDonationConjoint: undefined,
  mariagePrecedentPersonne: false,
  dureeMariagePrecedentPersonneAnnees: null,
  dureeMariagePrecedentPersonneMois: null,
  mariagePrecedentConjoint: false,
  dureeMariagePrecedentConjointAnnees: null,
  dureeMariagePrecedentConjointMois: null,
  conventionPacs: 'Régime de la séparation des biens',
  datePacs: undefined,
};

describe('buildRelationInfoPayload — Marié(e)', () => {
  it("écrit les champs mariage, sans convention_pacs ni date_pacs", () => {
    const payload = buildRelationInfoPayload('Marié(e)', {
      ...baseData,
      regimeMatrimonial: 'Séparation de biens',
      dateMariage: new Date('2020-06-15'),
      lieuMariage: 'Paris',
      impositionDistincte: true,
      residenceSeparee: true,
    });

    expect(payload).toMatchObject({
      regime_matrimonial: 'Séparation de biens',
      date_mariage: '2020-06-15',
      lieu_mariage: 'Paris',
      imposition_distincte: true,
      residence_separee: true,
    });
    expect(payload).not.toHaveProperty('convention_pacs');
    expect(payload).not.toHaveProperty('date_pacs');
  });

  it('conserve les champs donation et historique matrimonial', () => {
    const payload = buildRelationInfoPayload('Marié(e)', {
      ...baseData,
      donationDernierVivantPersonne: true,
      dateDonationPersonne: new Date('2021-01-01'),
      mariagePrecedentConjoint: true,
      dureeMariagePrecedentConjointAnnees: 5,
      dureeMariagePrecedentConjointMois: 3,
    });

    expect(payload).toMatchObject({
      donation_dernier_vivant_personne: true,
      date_donation_personne: '2021-01-01',
      mariage_precedent_conjoint: true,
      duree_mariage_precedent_conjoint_annees: 5,
      duree_mariage_precedent_conjoint_mois: 3,
    });
  });
});

describe('buildRelationInfoPayload — Pacsé(e)', () => {
  it("n'écrit que convention_pacs, date_pacs et les champs communs, sans regime_matrimonial ni donation", () => {
    const payload = buildRelationInfoPayload('Pacsé(e)', {
      ...baseData,
      conventionPacs: 'Indivision',
      datePacs: new Date('2018-09-01'),
      impositionDistincte: true,
      residenceSeparee: true,
    });

    expect(payload).toEqual({
      imposition_distincte: true,
      residence_separee: true,
      convention_pacs: 'Indivision',
      date_pacs: '2018-09-01',
    });
  });
});

describe('buildRelationInfoPayload — Concubinage', () => {
  it("n'écrit aucun champ, même avec des valeurs par défaut du schéma renseignées", () => {
    const payload = buildRelationInfoPayload('Concubinage', {
      ...baseData,
      regimeMatrimonial: 'Communauté réduite aux acquêts (option sans contrat de mariage)',
      conventionPacs: 'Régime de la séparation des biens',
      impositionDistincte: true,
    });

    expect(payload).toEqual({});
  });
});
