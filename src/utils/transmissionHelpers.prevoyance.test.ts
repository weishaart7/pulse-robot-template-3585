/**
 * Prévoyance décès et contrat article 82 hors succession (audit du 2026-10-14,
 * N1 et N2) : capital versé aux bénéficiaires de la clause (art. L132-12 C.
 * assur.). Prévoyance non rachetable : assiette 990 I = fraction rachetable +
 * primes de la dernière année, plafonnée au capital ; 757 B sur les primes
 * après 70 ans. Article 82 : régime de l'assurance-vie. Cas de référence :
 * couple marié en communauté, 2 enfants communs, conjoint en 100 % usufruit.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, TransmissionParams } from '@/lib/transmission';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import {
  buildPatrimonySnapshot,
  buildAVContracts,
  buildFamilyGraph,
  computeAVReintegrationCivile,
  splitPrimesPrevoyance,
  AVContractRawRow,
  AVDonneesInsuffisantesError
} from './transmissionHelpers';
import { isContratHorsSuccession, isPrevoyanceNonQualifiee, getCapitalDecesContrat, hasDonneesContratAV } from '@/constants/assetTypes';
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

const versement = (date_operation: string, montant: number) => ({ type_operation: 'versement', montant, date_operation });

const row = (
  id: string, nature: string, valeur: number, capitalGaranti: number | null, detenteur: 'user' | 'spouse',
  c: AVContractRawRow['clauseBeneficiaireStructuree'], operations: AVContractRawRow['operations']
): AVContractRawRow => ({
  assetId: id, label: id, nature, valeurEstimee: valeur, capitalGaranti, detenteur, operations, clauseBeneficiaireStructuree: c
});

const BASE = [
  asset('RP', 'Résidence principale', 650000, 'common'),
  asset('LIV', 'Livret A', 50000, 'common')
];

function run(rows: AVContractRawRow[], contratAssets: ReturnType<typeof asset>[], dateNaissanceUser = familyProfile.date_naissance) {
  const assets = [...BASE, ...contratAssets];
  const profile = { ...familyProfile, date_naissance: dateNaissanceUser };
  const family = buildFamilyGraph(profile as never, maritalStatus as never, familyLinks as never);
  const avContracts = buildAVContracts(rows, dateNaissanceUser, family, REF, maritalStatus.date_naissance_conjoint);
  const patrimony = buildPatrimonySnapshot(assets as never, []);
  const result = computeTransmission({
    family, patrimony, liberalites: [], params, conjointOption: 'usufruit_total', referenceDate: REF,
    rawAssets: assets as never, avContracts,
    avReintegrationCivileMontant: computeAVReintegrationCivile(avContracts, 'spouse', REGIME),
    regimeMatrimonial: REGIME
  });
  return { result, patrimony, avContracts };
}

describe('qualification', () => {
  it('prévoyance décès et article 82 sont hors succession, avec données de contrat', () => {
    for (const nature of ['Temporaire décès', 'Vie entière', 'Contrat prévoyance individuelle', 'Contrat article 82']) {
      expect(isContratHorsSuccession({ nature })).toBe(true);
      expect(hasDonneesContratAV({ nature })).toBe(true);
    }
    expect(isContratHorsSuccession({ nature: 'PERCO/PERCOI' })).toBe(false);
  });

  it('capital transmis = capital garanti pour la prévoyance, valeur estimée sinon', () => {
    expect(getCapitalDecesContrat({ nature: 'Temporaire décès', valeur_estimee: 0, capital_garanti: 300000 })).toBe(300000);
    expect(getCapitalDecesContrat({ nature: 'Contrat article 82', valeur_estimee: 80000, capital_garanti: null })).toBe(80000);
  });

  it('prévoyance sans capital garanti : calcul bloqué, jamais deviné', () => {
    expect(isPrevoyanceNonQualifiee({ nature: 'Vie entière', capital_garanti: null })).toBe(true);
    expect(() => buildPatrimonySnapshot([asset('TD', 'Temporaire décès', 0, 'user')] as never, []))
      .toThrow(BienNonQualifieError);
  });
});

describe('splitPrimesPrevoyance', () => {
  const ops = [versement('2025-01-15', 1200), versement('2025-09-26', 1200), versement('2026-09-25', 1200)];

  it('990 I : primes des 12 mois précédant le décès, avant 70 ans, plus la valeur de rachat', () => {
    expect(splitPrimesPrevoyance(ops, '1972-03-15', 0, REF)).toEqual({ primesAvant70: 2400, primesApres70: 0, assiette990I: 2400 });
    expect(splitPrimesPrevoyance(ops, '1972-03-15', 20000, REF).assiette990I).toBe(22400);
  });

  it('757 B : toutes les primes versées à 70 ans ou plus', () => {
    const r = splitPrimesPrevoyance([versement('2019-12-31', 5000), versement('2020-01-02', 5000), versement('2026-01-02', 5000)], '1950-01-01', 0, REF);
    expect(r).toEqual({ primesAvant70: 0, primesApres70: 10000, assiette990I: 0 });
  });

  it('aucune prime ou date de naissance inconnue : AVDonneesInsuffisantesError', () => {
    expect(() => splitPrimesPrevoyance([], '1972-03-15', 0, REF)).toThrow(AVDonneesInsuffisantesError);
    expect(() => splitPrimesPrevoyance(ops, null, 0, REF)).toThrow(AVDonneesInsuffisantesError);
  });
});

describe('prévoyance décès au décès de l\'assuré', () => {
  const sansContrat = run([], []);

  it('temporaire décès : 300 000 € versés à Hugo hors succession, aucun prélèvement', () => {
    const { result, patrimony } = run(
      [row('TD', 'Temporaire décès', 0, 300000, 'user', clause([HUGO, 100]), [versement('2026-01-10', 1200), versement('2025-01-10', 1200)])],
      [asset('TD', 'Temporaire décès', 0, 'user', { capital_garanti: 300000 })]
    );
    expect(patrimony.biensExistants).toBe(sansContrat.patrimony.biensExistants);
    const hugo = result.dmtg.perBeneficiary[HUGO];
    expect(hugo.detailAV?.assiette990I).toBe(1200);
    expect(hugo.prelev990I).toBe(0);
    expect(hugo.capitalAVNet).toBe(300000);
    // Succession inchangée : la valeur estimée (même saisie) n'entre plus dans l'actif.
    expect(hugo.droitsHorsAV).toBe(sansContrat.result.dmtg.perBeneficiary[HUGO].droitsHorsAV);
  });

  it('abattement de 152 500 € commun avec une assurance-vie du même assuré', () => {
    const { result } = run([
      row('TD', 'Temporaire décès', 0, 300000, 'user', clause([HUGO, 100]), [versement('2026-01-10', 1200)]),
      row('AV', "Contrat d'assurance-vie", 200000, null, 'user', clause([HUGO, 100]), [versement('2010-01-10', 200000)])
    ], [
      asset('TD', 'Temporaire décès', 0, 'user', { capital_garanti: 300000 }),
      asset('AV', "Contrat d'assurance-vie", 200000, 'user')
    ]);
    // (200 000 + 1 200 − 152 500) × 20 %
    expect(result.dmtg.perBeneficiary[HUGO].prelev990I).toBe(9740);
  });

  it('vie entière : valeur de rachat dans l\'assiette, plafonnée au capital', () => {
    const { result } = run(
      [row('VE', 'Vie entière', 260000, 250000, 'user', clause([HUGO, 100]), [versement('2026-01-10', 2000)])],
      [asset('VE', 'Vie entière', 260000, 'user', { capital_garanti: 250000 })]
    );
    const hugo = result.dmtg.perBeneficiary[HUGO];
    expect(hugo.detailAV?.assiette990I).toBe(250000);
    expect(hugo.prelev990I).toBe(19500);
  });

  it('assuré de plus de 70 ans : primes après 70 ans réintégrées au-delà de 30 500 € (757 B)', () => {
    const ops = [2021, 2022, 2023, 2024, 2025].map(an => versement(`${an}-02-01`, 8000));
    const { result } = run(
      [row('TD', 'Temporaire décès', 0, 100000, 'user', clause([HUGO, 100]), ops)],
      [asset('TD', 'Temporaire décès', 0, 'user', { capital_garanti: 100000 })],
      '1950-01-01'
    );
    const hugo = result.dmtg.perBeneficiary[HUGO];
    expect(hugo.reintegration757B).toBe(9500);
    expect(hugo.prelev990I).toBe(0);
    expect(hugo.capitalAVNet).toBe(100000);
  });

  it('contrat sans prime enregistrée : calcul bloqué', () => {
    expect(() => run(
      [row('TD', 'Temporaire décès', 0, 300000, 'user', clause([HUGO, 100]), [])],
      [asset('TD', 'Temporaire décès', 0, 'user', { capital_garanti: 300000 })]
    )).toThrow(AVDonneesInsuffisantesError);
  });

  it('prévoyance du conjoint survivant : jamais réintégrée (doctrine Ciot), sans origine des fonds', () => {
    const { result, avContracts } = run(
      [row('TDC', 'Temporaire décès', 0, 300000, 'spouse', clause(['conjoint', 100]), [versement('2026-01-10', 1200)])],
      [asset('TDC', 'Temporaire décès', 0, 'spouse', { capital_garanti: 300000 })]
    );
    expect(computeAVReintegrationCivile(avContracts, 'spouse', REGIME)).toBe(0);
    expect(result.dmtg.totals.prelev990I).toBe(0);
  });
});

describe('contrat article 82', () => {
  it('capital hors succession, cotisations avant 70 ans au 990 I', () => {
    const { result, patrimony } = run(
      [row('A82', 'Contrat article 82', 300000, null, 'user', clause([HUGO, 100]), [versement('2015-03-01', 100000), versement('2020-03-01', 100000)])],
      [asset('A82', 'Contrat article 82', 300000, 'user')]
    );
    expect(patrimony.biensExistants).toBe(run([], []).patrimony.biensExistants);
    // (300 000 − 152 500) × 20 %
    expect(result.dmtg.perBeneficiary[HUGO].prelev990I).toBe(29500);
  });
});
