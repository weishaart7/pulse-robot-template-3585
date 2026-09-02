/**
 * hasSurvivingSpouse et le partenaire pacsé (référentiel §5.1) : le
 * partenaire pacsé n'est jamais héritier légal — il ne recueille rien par
 * dévolution légale (buildFamilyGraph ne doit plus le traiter comme un
 * conjoint successible), mais reste désignable comme bénéficiaire
 * d'assurance-vie ou légataire, avec l'exonération fiscale conjoint/PACS
 * (art. 990 I, 2e alinéa) inchangée dans ce cas. Couvre le bug où
 * `['Marié(e)', 'Pacsé(e)'].includes(...)` pilotait `hasSurvivingSpouse` sans
 * distinction entre les deux statuts.
 */
import { describe, it, expect } from 'vitest';
import { buildFamilyGraph, buildAVContracts } from './transmissionHelpers';
import { calculateSuccessionLegale } from '@/lib/transmission/successionLegale';
import { computeTransmission, TransmissionParams } from '@/lib/transmission';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import transmissionParamsData from '@/data/transmission-params.json';

const familyProfile: FamilyProfile = {
  id: 'defunt-1',
  nom: 'TEST',
  prenom: 'Titouan',
  date_naissance: '1980-01-01'
};

const maritalStatusPacs: MaritalStatus = {
  statut_couple: 'Pacsé(e)',
  nom_conjoint: 'TEST',
  prenom_conjoint: 'Julie',
  date_naissance_conjoint: '1980-01-01',
  regime_matrimonial: null
};

const enfant: FamilyLink = {
  id: 'enfant-1',
  lien_familial: 'Enfant',
  nom: 'TEST',
  prenom: 'Romy',
  date_naissance: '2010-01-01',
  parent_de: 'user'
};

function buildParams(): TransmissionParams {
  return {
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
}

describe('Partenaire pacsé — dévolution légale (300 000€, 1 enfant, sans testament)', () => {
  it("buildFamilyGraph : hasSurvivingSpouse est false pour un partenaire pacsé (jamais héritier légal)", () => {
    const graph = buildFamilyGraph(familyProfile, maritalStatusPacs, [enfant]);
    expect(graph.hasSurvivingSpouse).toBe(false);
    // Toujours désignable comme bénéficiaire AV / légataire.
    expect(graph.survivingSpouseId).toBe('conjoint-defunt-1');
    expect(graph.persons.some(p => p.id === 'conjoint-defunt-1')).toBe(true);
  });

  it("calculateSuccessionLegale : 100% aux enfants, 0% au partenaire pacsé", () => {
    const graph = buildFamilyGraph(familyProfile, maritalStatusPacs, [enfant]);
    const result = calculateSuccessionLegale(graph, false);

    expect(result.heritiers).toHaveLength(1);
    expect(result.heritiers[0]).toMatchObject({
      personId: 'enfant-1',
      lien: 'enfant',
      quotePart: 1
    });
    expect(result.heritiers.some(h => h.personId === 'conjoint-defunt-1')).toBe(false);
  });

  it("contrôle — même situation Marié(e) : le conjoint recueille bien 1/4 en pleine propriété (non-régression)", () => {
    const maritalStatusMarie: MaritalStatus = { ...maritalStatusPacs, statut_couple: 'Marié(e)', regime_matrimonial: 'communauté légale' };
    const graph = buildFamilyGraph(familyProfile, maritalStatusMarie, [enfant]);
    expect(graph.hasSurvivingSpouse).toBe(true);

    const result = calculateSuccessionLegale(graph, false);
    const conjointShare = result.heritiers.find(h => h.personId === 'conjoint-defunt-1');
    expect(conjointShare).toMatchObject({ lien: 'conjoint', quotePart: 0.25 });
  });
});

describe("Partenaire pacsé légataire — bénéficiaire d'assurance-vie, exonéré (art. 990 I)", () => {
  it("le partenaire pacsé désigné bénéficiaire AV reste résolu via survivingSpouseId et exonéré de prélèvement 990 I", () => {
    const graph = buildFamilyGraph(familyProfile, maritalStatusPacs, [enfant]);

    const avContracts = buildAVContracts(
      [{
        assetId: 'av1',
        nature: "Contrat d'assurance-vie",
        label: 'Contrat AV',
        valeurEstimee: 200000,
        operations: [{ type_operation: 'versement', montant: 200000, date_operation: '2015-01-01' }],
        clauseBeneficiaireStructuree: { niveaux: [{ beneficiaires: [{ familyLinkId: 'conjoint', pourcentage: 100 }] }] }
      }],
      '1980-01-01',
      graph
    );

    const result = computeTransmission({
      family: graph,
      patrimony: { date: '2026-08-06', biensExistants: 300000, passifs: 0 },
      liberalites: [],
      params: buildParams(),
      referenceDate: '2026-08-06',
      rawAssets: [],
      avContracts
    });

    expect(result.dmtg.perBeneficiary['conjoint-defunt-1'].prelev990I).toBe(0);
  });
});
