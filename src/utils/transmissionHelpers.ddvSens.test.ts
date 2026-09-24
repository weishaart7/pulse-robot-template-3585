/**
 * Sens de la donation au dernier vivant (art. 1094-1) : seule la DDV consentie
 * par le défunt simulé joue dans sa succession.
 * `donation_dernier_vivant_personne` = consentie par l'Utilisateur,
 * `donation_dernier_vivant_conjoint` = consentie par le conjoint (« reçue »).
 */
import { describe, it, expect } from 'vitest';
import {
  buildFamilyGraph,
  buildSpouseAsDecedentFamilyGraph,
  hasDDV,
  hasDDVConsentieParDefunt
} from './transmissionHelpers';
import { calculateSuccessionLegale } from '@/lib/transmission/successionLegale';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';

const familyProfile: FamilyProfile = { id: 'user-1', nom: 'TEST', prenom: 'Titouan', date_naissance: '1960-01-01' };

const marie = (personne: boolean, conjoint: boolean): MaritalStatus => ({
  statut_couple: 'Marié(e)',
  nom_conjoint: 'TEST',
  prenom_conjoint: 'Julie',
  date_naissance_conjoint: '1962-01-01',
  regime_matrimonial: 'Communauté réduite aux acquêts',
  donation_dernier_vivant_personne: personne,
  donation_dernier_vivant_conjoint: conjoint
});

const enfantCommun: FamilyLink = { id: 'e-commun', lien_familial: 'Enfant', nom: 'TEST', prenom: 'Romy', parent_de: 'both_parents' };
const enfantUser: FamilyLink = { id: 'e-user', lien_familial: 'Enfant', nom: 'TEST', prenom: 'Austin', parent_de: 'user' };
const enfantConjoint: FamilyLink = { id: 'e-conjoint', lien_familial: 'Enfant', nom: 'TEST', prenom: 'Lou', parent_de: 'spouse' };

describe('hasDDVConsentieParDefunt', () => {
  it('Utilisateur défunt : seule la DDV consentie par l\'Utilisateur compte', () => {
    expect(hasDDVConsentieParDefunt(marie(true, false), 'user')).toBe(true);
    expect(hasDDVConsentieParDefunt(marie(false, true), 'user')).toBe(false);
  });

  it('Conjoint défunt : seule la DDV consentie par le conjoint compte', () => {
    expect(hasDDVConsentieParDefunt(marie(false, true), 'spouse')).toBe(true);
    expect(hasDDVConsentieParDefunt(marie(true, false), 'spouse')).toBe(false);
  });

  it('hasDDV (vue couple, alertes) reste vrai dès qu\'une des deux est consentie', () => {
    expect(hasDDV(marie(false, true))).toBe(true);
    expect(hasDDV(marie(false, false))).toBe(false);
  });
});

describe('Graphes familiaux', () => {
  it('buildFamilyGraph (décès de l\'Utilisateur) : DDV reçue seule → pas de DDV', () => {
    expect(buildFamilyGraph(familyProfile, marie(false, true), [enfantCommun]).hasDDV).toBe(false);
    expect(buildFamilyGraph(familyProfile, marie(true, false), [enfantCommun]).hasDDV).toBe(true);
  });

  it('buildSpouseAsDecedentFamilyGraph (décès du conjoint) : DDV consentie par l\'Utilisateur seule → pas de DDV', () => {
    expect(buildSpouseAsDecedentFamilyGraph(familyProfile, marie(true, false), [enfantCommun]).hasDDV).toBe(false);
    expect(buildSpouseAsDecedentFamilyGraph(familyProfile, marie(false, true), [enfantConjoint]).hasDDV).toBe(true);
  });
});

describe('Bout en bout : enfant non commun, DDV reçue seulement', () => {
  it('usufruit_total demandé au décès de l\'Utilisateur → 1/4 PP imposé (art. 757)', () => {
    const graph = buildFamilyGraph(familyProfile, marie(false, true), [enfantCommun, enfantUser]);
    const r = calculateSuccessionLegale(graph, false, 'usufruit_total');
    const conjoint = r.heritiers.filter(h => h.lien === 'conjoint');
    expect(conjoint).toHaveLength(1);
    expect(conjoint[0].quotePart).toBe(0.25);
    expect(conjoint[0].typeQuotePart).toBe('pleine_propriete');
  });

  it('même famille, DDV consentie par l\'Utilisateur → usufruit_total accordé', () => {
    const graph = buildFamilyGraph(familyProfile, marie(true, false), [enfantCommun, enfantUser]);
    const r = calculateSuccessionLegale(graph, false, 'usufruit_total');
    const conjoint = r.heritiers.filter(h => h.lien === 'conjoint');
    expect(conjoint).toHaveLength(1);
    expect(conjoint[0].quotePart).toBe(1);
    expect(conjoint[0].typeQuotePart).toBe('usufruit');
  });
});
