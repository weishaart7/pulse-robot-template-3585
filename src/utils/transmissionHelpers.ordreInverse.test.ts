/**
 * Ordre inversé du 2nd décès : le conjoint décède en premier, l'Utilisateur lui
 * survit. buildSpouseAsDecedentFamilyGraph({ utilisateurSurvivant: true }) doit
 * faire de l'Utilisateur le conjoint survivant (miroir de buildFamilyGraph).
 */
import { describe, it, expect } from 'vitest';
import {
  buildFamilyGraph,
  buildSpouseAsDecedentFamilyGraph,
  widowFamilyGraph,
  addReunifiedFullOwnership
} from './transmissionHelpers';
import { computeTransmission, computeChainedTransmission, TransmissionParams } from '@/lib/transmission';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import transmissionParamsData from '@/data/transmission-params.json';

const params: TransmissionParams = {
  abattements: {
    ...transmissionParamsData.abattements,
    conjoint: transmissionParamsData.abattements.conjoint === 'Infinity'
      ? Infinity
      : Number(transmissionParamsData.abattements.conjoint)
  },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I,
  debours: {
    mode: transmissionParamsData.debours.mode as 'pourcentage' | 'forfait',
    valeur: transmissionParamsData.debours.valeur
  }
};

const REF = '2026-09-24';
// Utilisateur né en 1950 : 76 ans à REF → usufruit 30 % (art. 669 CGI).
const familyProfile: FamilyProfile = { id: 'user-1', nom: 'TEST', prenom: 'Titouan', date_naissance: '1950-01-01' };

const statut = (over: Partial<MaritalStatus> = {}): MaritalStatus => ({
  statut_couple: 'Marié(e)',
  nom_conjoint: 'TEST',
  prenom_conjoint: 'Julie',
  date_naissance_conjoint: '1962-01-01',
  regime_matrimonial: 'Communauté réduite aux acquêts',
  ...over
});

const enfantCommun: FamilyLink = { id: 'e-commun', lien_familial: 'Enfant', nom: 'TEST', prenom: 'Romy', parent_de: 'both_parents' };
const enfantConjoint: FamilyLink = { id: 'e-conjoint', lien_familial: 'Enfant', nom: 'TEST', prenom: 'Lou', parent_de: 'spouse' };

describe('Graphe du conjoint défunt avec Utilisateur survivant', () => {
  it('marié : Utilisateur conjoint survivant successible, enfant both_parents commun', () => {
    const g = buildSpouseAsDecedentFamilyGraph(familyProfile, statut(), [enfantCommun, enfantConjoint], { utilisateurSurvivant: true });
    expect(g.hasSurvivingSpouse).toBe(true);
    expect(g.survivingSpouseId).toBe('user-1');
    expect(g.persons.find(p => p.id === 'user-1')?.dateNaissance).toBe('1950-01-01');
    expect(g.childrenCommonWithSpouse).toEqual(['e-commun']);
    expect(g.survivantPartenairePacs).toBe(false);
  });

  it('pacsé : pas héritier, partenaire de PACS survivant', () => {
    const g = buildSpouseAsDecedentFamilyGraph(familyProfile, statut({ statut_couple: 'Pacsé(e)' }), [enfantCommun], { utilisateurSurvivant: true });
    expect(g.hasSurvivingSpouse).toBe(false);
    expect(g.survivantPartenairePacs).toBe(true);
    expect(g.survivingSpouseId).toBe('user-1');
  });

  it('séparé de corps avec renonciation : pas héritier', () => {
    const g = buildSpouseAsDecedentFamilyGraph(
      familyProfile,
      statut({ separation_de_corps: true, separation_corps_clause_renonciation: true } as Partial<MaritalStatus>),
      [enfantCommun],
      { utilisateurSurvivant: true }
    );
    expect(g.hasSurvivingSpouse).toBe(false);
    expect(g.survivantPartenairePacs).toBe(false);
  });

  it('sans l\'option (2nd décès de l\'ordre normal) : aucun survivant, inchangé', () => {
    const g = buildSpouseAsDecedentFamilyGraph(familyProfile, statut(), [enfantCommun]);
    expect(g.hasSurvivingSpouse).toBe(false);
    expect(g.survivingSpouseId).toBeUndefined();
    expect(g.persons.some(p => p.id === 'user-1')).toBe(false);
    expect(g.childrenCommonWithSpouse).toEqual([]);
  });
});

describe('Chaînage ordre inversé, bout en bout', () => {
  const run = (conjointOption: string, over: Partial<MaritalStatus> = {}, links: FamilyLink[] = [enfantCommun]) => {
    const ms = statut(over);
    const firstDeath = {
      family: buildSpouseAsDecedentFamilyGraph(familyProfile, ms, links, { utilisateurSurvivant: true }),
      patrimony: { date: REF, biensExistants: 600000, passifs: 0, assuranceVieTotal: 0 },
      liberalites: [],
      params,
      conjointOption: conjointOption as any,
      referenceDate: REF
    };
    const first = computeTransmission(firstDeath);
    const familyUtilisateur = buildFamilyGraph(familyProfile, ms, links);
    const chained = computeChainedTransmission({
      firstDeath,
      secondDeath: {
        family: widowFamilyGraph(familyUtilisateur, links),
        patrimony: addReunifiedFullOwnership(
          { date: REF, biensExistants: 800000, passifs: 0, assuranceVieTotal: 0 },
          first,
          familyUtilisateur.decedentId
        ),
        liberalites: [],
        params,
        referenceDate: REF
      }
    });
    return { first, chained };
  };

  it('usufruit_total : Utilisateur usufruitier valorisé à son âge (30 %), usufruit réuni sans droits au 2nd décès', () => {
    const { chained } = run('usufruit_total');
    const utilisateur = chained.firstDeath.heirs.filter(h => h.personId === 'user-1');
    expect(utilisateur).toHaveLength(1);
    expect(utilisateur[0].typeQuotePart).toBe('usufruit');
    expect(utilisateur[0].partFinale).toBeCloseTo(180000, 0);

    const enfant = chained.firstDeath.heirs.find(h => h.personId === 'e-commun')!;
    expect(enfant.typeQuotePart).toBe('nue_propriete');
    expect(enfant.partFinale).toBeCloseTo(420000, 0);

    // Usufruit éteint : ni dans la masse du 2nd décès, ni taxé — réuni hors succession.
    expect(chained.reunionUsufruit.total).toBe(180000);
    expect(chained.reunionUsufruit.parNuProprietaire).toEqual([{ personId: 'e-commun', montant: 180000 }]);
    expect(chained.secondDeath.masseCalcul).toBeLessThan(800000 + 1);
  });

  it('quart_pp : 1/4 PP reçu ajouté au patrimoine de l\'Utilisateur au 2nd décès', () => {
    const { first, chained } = run('quart_pp');
    const ppRecue = first.heirs.filter(h => h.personId === 'user-1' && h.typeQuotePart === 'pleine_propriete')
      .reduce((s, h) => s + h.partFinale, 0);
    expect(ppRecue).toBeCloseTo(150000, 0);
    expect(chained.reunionUsufruit.total).toBe(0);
    expect(chained.secondDeath.masseCalcul).toBeGreaterThan(800000);
  });

  it('option A : usufruit_total non ouvert (enfant du conjoint seul, sans DDV du conjoint) → 1/4 PP', () => {
    const { first } = run('usufruit_total', {}, [enfantCommun, enfantConjoint]);
    const utilisateur = first.heirs.filter(h => h.personId === 'user-1');
    expect(utilisateur).toHaveLength(1);
    expect(utilisateur[0].typeQuotePart).toBe('pleine_propriete');
    expect(utilisateur[0].partFinale).toBeCloseTo(150000, 0);
  });

  it('même famille, DDV consentie par le conjoint → usufruit_total accordé', () => {
    const { first } = run('usufruit_total', { donation_dernier_vivant_conjoint: true }, [enfantCommun, enfantConjoint]);
    const utilisateur = first.heirs.filter(h => h.personId === 'user-1');
    expect(utilisateur[0].typeQuotePart).toBe('usufruit');
  });

  it('pacsé : l\'Utilisateur ne reçoit rien, 100 % à l\'enfant, message art. 515-6', () => {
    const { first } = run('usufruit_total', { statut_couple: 'Pacsé(e)' });
    expect(first.heirs.some(h => h.personId === 'user-1')).toBe(false);
    expect(first.explicationsTexte?.some(t => t.includes('515-6'))).toBe(true);
  });
});
