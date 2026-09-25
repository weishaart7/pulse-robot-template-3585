/**
 * PER assurantiel hors succession (art. L132-12 C. assur.) : régime 990 I si
 * le titulaire décède avant 70 ans, 757 B après ; PER bancaire dans l'actif
 * successoral ; PER sans sous-type bloquant. Cas de référence : couple marié
 * en communauté, 2 enfants communs, conjoint en 100 % usufruit.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, TransmissionParams } from '@/lib/transmission';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import {
  buildPatrimonySnapshot,
  buildAVContracts,
  buildFamilyGraph,
  computeAVReintegrationCivile,
  hasPERNonDenoueConjoint,
  splitPrimesPER,
  AVContractRawRow,
  AVDonneesInsuffisantesError
} from './transmissionHelpers';
import { isContratHorsSuccession, isPERAssurantiel, isPERNonQualifie } from '@/constants/assetTypes';
import transmissionParamsData from '@/data/transmission-params.json';

const params: TransmissionParams = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity } as TransmissionParams['abattements'],
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I,
  debours: transmissionParamsData.debours as TransmissionParams['debours']
};

const REF = '2026-09-25';
const REGIME = 'Communauté réduite aux acquêts';
const HUGO = 'enfant-hugo';
const LEA = 'enfant-lea';

const familyProfile = { id: 'fp', civility: 'M.', nom: 'Test', prenom: 'Paul', date_naissance: '1972-03-15' };
const maritalStatus = {
  statut_couple: 'Marié(e)', regime_matrimonial: REGIME, option_conjoint: 'usufruit_total',
  civilite_conjoint: 'Mme', nom_conjoint: 'Test', prenom_conjoint: 'Claire', date_naissance_conjoint: '1973-06-10'
};
const familyLinks = [HUGO, LEA].map((id, i) => ({
  id, lien_familial: 'Enfant', nom: 'Test', prenom: i === 0 ? 'Hugo' : 'Léa',
  date_naissance: i === 0 ? '2002-09-01' : '2005-04-20', parent_de: 'both_parents', enfant_de: 'both_parents', enfant_adopte: 'Non'
}));

const asset = (id: string, nature: string, valeur: number, detenteur: 'user' | 'spouse' | 'common', extra: Record<string, unknown> = {}) => ({
  id, nature, denomination: id, mode_detention: 'Pleine propriété', valeur_estimee: valeur, detenteur,
  qualification_bien: detenteur === 'common' ? 'Bien commun' : 'Bien propre',
  pourcentage_utilisateur: detenteur === 'common' ? 50 : detenteur === 'user' ? 100 : 0,
  pourcentage_conjoint: detenteur === 'common' ? 50 : detenteur === 'user' ? 0 : 100,
  ...extra
});

const clause = (...beneficiaires: Array<[string, number]>) => ({
  niveaux: [{ beneficiaires: beneficiaires.map(([familyLinkId, pourcentage]) => ({ familyLinkId, pourcentage, statut: 'accepte' as const })) }]
});

function run(perRows: AVContractRawRow[], perAssets: ReturnType<typeof asset>[], dateNaissanceUser = familyProfile.date_naissance) {
  const assets = [
    asset('RP', 'Résidence principale', 650000, 'common'),
    asset('RS', 'Résidences secondaires', 250000, 'common'),
    asset('LIV', 'Livret A', 50000, 'common'),
    asset('PEA', 'PEA', 50000, 'user'),
    ...perAssets
  ];
  const profile = { ...familyProfile, date_naissance: dateNaissanceUser };
  const family = buildFamilyGraph(profile as never, maritalStatus as never, familyLinks as never);
  const avContracts = buildAVContracts(perRows, dateNaissanceUser, family, REF, maritalStatus.date_naissance_conjoint);
  const patrimony = buildPatrimonySnapshot(assets as never, []);
  const result = computeTransmission({
    family, patrimony, liberalites: [], params, conjointOption: 'usufruit_total', referenceDate: REF,
    rawAssets: assets as never, avContracts,
    avReintegrationCivileMontant: computeAVReintegrationCivile(avContracts, 'spouse', REGIME),
    regimeMatrimonial: REGIME
  });
  return { result, patrimony, avContracts };
}

const perRow = (id: string, valeur: number, detenteur: 'user' | 'spouse', sousTypePer: string | null, c: ReturnType<typeof clause>, operations: AVContractRawRow['operations'] = []): AVContractRawRow => ({
  assetId: id, label: id, valeurEstimee: valeur, detenteur, origineFonds: 'deniers_communs',
  nature: 'PER individuel', sousTypePer, operations, clauseBeneficiaireStructuree: c
});

describe('qualification du PER', () => {
  it('assurantiel / bancaire / non renseigné / PER obligatoire toujours assurantiel', () => {
    expect(isPERAssurantiel({ nature: 'PER individuel', sous_type_per: 'Assurantiel' })).toBe(true);
    expect(isContratHorsSuccession({ nature: 'PER individuel', sous_type_per: 'Bancaire' })).toBe(false);
    expect(isPERNonQualifie({ nature: 'PER individuel', sous_type_per: null })).toBe(true);
    expect(isPERAssurantiel({ nature: 'PER entreprise obligatoire', sous_type_per: null })).toBe(true);
    expect(isPERNonQualifie({ nature: 'PER entreprise obligatoire', sous_type_per: null })).toBe(false);
  });

  it('PER sans sous-type : calcul bloqué, jamais deviné', () => {
    expect(() => buildPatrimonySnapshot([asset('PER', 'PER individuel', 40000, 'user')] as never, []))
      .toThrow(BienNonQualifieError);
  });
});

describe('PER assurantiel au décès du titulaire', () => {
  it('avant 70 ans, bénéficiaire conjoint : hors succession et exonéré — enfants ≈2 269 € chacun', () => {
    const { result, patrimony } = run(
      [perRow('PER', 40000, 'user', 'Assurantiel', clause(['conjoint', 100]))],
      [asset('PER', 'PER individuel', 40000, 'user', { sous_type_per: 'Assurantiel' })]
    );
    // 325k + 125k + 25k + 50k : le PER n'entre pas dans l'actif civil.
    expect(patrimony.biensExistants).toBe(525000);
    expect(result.dmtg.perBeneficiary[HUGO].droitsTotaux).toBeCloseTo(2269, 0);
    expect(result.dmtg.totals.prelev990I).toBe(0);
  });

  it('avant 70 ans, bénéficiaire enfant : tout le capital en 990 I, sans versement renseigné', () => {
    const { result } = run(
      [perRow('PER', 400000, 'user', 'Assurantiel', clause([HUGO, 100]))],
      [asset('PER', 'PER individuel', 400000, 'user', { sous_type_per: 'Assurantiel' })]
    );
    // (400 000 - 152 500) : 20 % jusqu'à 700 000 € → 49 500 €.
    expect(result.dmtg.perBeneficiary[HUGO].prelev990I).toBeCloseTo(49500, 0);
  });

  it('à 70 ans ou plus : primes versées en 757 B, versements obligatoires', () => {
    const { avContracts } = run(
      [perRow('PER', 100000, 'user', 'Assurantiel', clause([HUGO, 100]), [{ type_operation: 'versement', montant: 60000, date_operation: '2010-01-01' }])],
      [asset('PER', 'PER individuel', 100000, 'user', { sous_type_per: 'Assurantiel' })],
      '1950-01-01'
    );
    expect(avContracts[0].primesAvant70).toBe(0);
    expect(avContracts[0].primesApres70).toBe(60000);
    expect(() => splitPrimesPER([], '1950-01-01', 100000, REF)).toThrow(AVDonneesInsuffisantesError);
  });

  it('PER bancaire : reste dans l\'actif successoral, jamais traité en 990 I', () => {
    const { patrimony, avContracts } = run(
      [perRow('PER', 40000, 'user', 'Bancaire', clause(['conjoint', 100]))],
      [asset('PER', 'PER individuel', 40000, 'user', { sous_type_per: 'Bancaire' })]
    );
    expect(patrimony.biensExistants).toBe(565000);
    expect(avContracts).toHaveLength(0);
  });
});

describe('PER assurantiel du conjoint survivant, non dénoué', () => {
  it('jamais réintégré dans la communauté (décision actée), mais signalé', () => {
    const { avContracts } = run(
      [perRow('PER_F', 20000, 'spouse', 'Assurantiel', clause(['conjoint', 100]))],
      [asset('PER_F', 'PER individuel', 20000, 'spouse', { sous_type_per: 'Assurantiel' })]
    );
    expect(computeAVReintegrationCivile(avContracts, 'spouse', REGIME)).toBe(0);
    expect(hasPERNonDenoueConjoint(avContracts, 'spouse', REGIME)).toBe(true);
  });
});
