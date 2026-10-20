import { describe, it, expect } from 'vitest';
import { buildRelationInfoPayload, RelationInfoFormValues } from './relationInfoPayload';
import { CHAMPS_MARIAGE, CHAMPS_PACS } from './maritalStatus';

const baseData: RelationInfoFormValues = {
  regimeMatrimonial: 'Communauté réduite aux acquêts',
  dateMariage: undefined,
  lieuMariage: '',
  pasDeContrat: false,
  impositionDistincte: false,
  residenceSeparee: false,
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
  it("écrit les champs mariage et efface ceux du PACS", () => {
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
    expect(payload).toMatchObject(CHAMPS_PACS);
    // Régime sans société d'acquêts : la clause est retirée.
    expect(payload.clauses_contrat).toBeNull();
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
  it("écrit convention_pacs, date_pacs et les champs communs, et efface ceux du mariage", () => {
    const payload = buildRelationInfoPayload('Pacsé(e)', {
      ...baseData,
      conventionPacs: 'Indivision',
      datePacs: new Date('2018-09-01'),
      impositionDistincte: true,
      residenceSeparee: true,
    });

    expect(payload).toEqual({
      ...CHAMPS_MARIAGE,
      imposition_distincte: true,
      residence_separee: true,
      convention_pacs: 'Indivision',
      date_pacs: '2018-09-01',
    });
  });
});

describe('buildRelationInfoPayload — Concubinage', () => {
  it("efface mariage et PACS, sans écrire les valeurs par défaut du schéma", () => {
    const payload = buildRelationInfoPayload('Concubinage', {
      ...baseData,
      regimeMatrimonial: 'Communauté réduite aux acquêts',
      conventionPacs: 'Régime de la séparation des biens',
      impositionDistincte: true,
    });

    expect(payload).toEqual({ ...CHAMPS_MARIAGE, ...CHAMPS_PACS });
  });
});

describe('buildRelationInfoPayload — dates vidées', () => {
  it('écrit null pour une date vidée, afin que l\'upsert efface la valeur en base', () => {
    const marie = buildRelationInfoPayload('Marié(e)', baseData);
    expect(marie.date_mariage).toBeNull();
    expect(marie.date_donation_personne).toBeNull();
    expect(marie.date_donation_conjoint).toBeNull();
    expect(buildRelationInfoPayload('Pacsé(e)', baseData).date_pacs).toBeNull();
  });

  it('efface la date de donation au dernier vivant quand la case est décochée', () => {
    const payload = buildRelationInfoPayload('Marié(e)', {
      ...baseData,
      donationDernierVivantPersonne: false,
      dateDonationPersonne: new Date(2021, 0, 1),
    });
    expect(payload.date_donation_personne).toBeNull();
  });
});

describe('buildRelationInfoPayload — clause de société d\'acquêts', () => {
  it('conservée (non écrite) pour une séparation avec société d\'acquêts sous contrat', () => {
    const payload = buildRelationInfoPayload('Marié(e)', {
      ...baseData, regimeMatrimonial: "Séparation de biens avec société d'acquêts", pasDeContrat: false,
    });
    expect(payload).not.toHaveProperty('clauses_contrat');
  });

  it('retirée si le contrat est déclaré absent', () => {
    const payload = buildRelationInfoPayload('Marié(e)', {
      ...baseData, regimeMatrimonial: "Séparation de biens avec société d'acquêts", pasDeContrat: true,
    });
    expect(payload.clauses_contrat).toBeNull();
  });
});
