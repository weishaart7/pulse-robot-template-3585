/**
 * Audit des classes d'actifs du 2026-10-14, phase C2 :
 * - N9 avance sur contrat d'assurance-vie : déduite du capital décès, jamais
 *   une dette de la succession ;
 * - N10 régimes de retraite étrangers : transmission qualifiée, jamais présumée ;
 * - N6 stock-options : signalement seul.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, TransmissionParams } from '@/lib/transmission';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { buildPatrimonySnapshot, buildAVContracts, buildFamilyGraph, AVContractRawRow } from './transmissionHelpers';
import { PASSIF_NATURES, isContratHorsSuccession, isContratNonTransmis } from '@/constants/assetTypes';
import { assetSchema, getDefaultAssetValues } from '@/schemas/assetSchema';
import transmissionParamsData from '@/data/transmission-params.json';

const params: TransmissionParams = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity } as TransmissionParams['abattements'],
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I,
  debours: transmissionParamsData.debours as TransmissionParams['debours']
};
const REF = '2026-10-14';
const HUGO = 'enfant-hugo';
const profile = { id: 'fp', civility: 'M.', nom: 'T', prenom: 'Paul', date_naissance: '1960-03-15' };
const marital = { statut_couple: 'Célibataire' };
const links = [{ id: HUGO, lien_familial: 'Enfant', nom: 'T', prenom: 'Hugo', date_naissance: '1990-01-01', parent_de: 'user', enfant_de: 'user', enfant_adopte: 'Non' }];
const family = buildFamilyGraph(profile as never, marital as never, links as never);
const clause = { niveaux: [{ beneficiaires: [{ familyLinkId: HUGO, pourcentage: 100, statut: 'accepte' as const }] }] };
const asset = (id: string, nature: string, valeur: number, extra: Record<string, unknown> = {}) => ({
  id, nature, denomination: id, valeur_estimee: valeur, mode_detention: 'Pleine propriété', detenteur: 'user',
  qualification_bien: 'Bien propre', ...extra
});
const row = (id: string, nature: string, valeur: number, extra: Partial<AVContractRawRow> = {}): AVContractRawRow => ({
  assetId: id, label: id, nature, valeurEstimee: valeur, detenteur: 'user', clauseBeneficiaireStructuree: clause,
  operations: [{ type_operation: 'versement', montant: 200000, date_operation: '2010-01-01' }], ...extra
});

function run(rows: AVContractRawRow[], assets: ReturnType<typeof asset>[]) {
  const avContracts = buildAVContracts(rows, profile.date_naissance, family, REF);
  const patrimony = buildPatrimonySnapshot(assets as never, []);
  return {
    patrimony, avContracts,
    result: computeTransmission({ family, patrimony, liberalites: [], params, referenceDate: REF, rawAssets: assets as never, avContracts })
  };
}

describe('N9 — avance sur contrat d\'assurance-vie', () => {
  it('n\'est plus proposée comme passif de la succession', () => {
    expect(PASSIF_NATURES).not.toContain("Avances sur contrats d'assurance-vie");
  });

  it('déduite du capital décès : assiette 990 I nette', () => {
    const { result, avContracts } = run(
      [row('AV', "Contrat d'assurance-vie", 300000, { avanceEnCours: 50000 })],
      [asset('AV', "Contrat d'assurance-vie", 300000)]
    );
    expect(avContracts[0].capitalDeces).toBe(250000);
    // (250 000 − 152 500) × 20 %
    expect(result.dmtg.perBeneficiary[HUGO].prelev990I).toBe(19500);
    expect((result.explicationsTexte || []).join(' ')).toContain('Avance en cours');
  });
});

describe('N10 — régimes de retraite étrangers', () => {
  it('non qualifié : formulaire et calcul bloqués', () => {
    expect(() => buildPatrimonySnapshot([asset('RE', 'Régimes de retraite étrangers', 100000)] as never, [])).toThrow(BienNonQualifieError);
    const r = assetSchema.safeParse({ ...getDefaultAssetValues(), nature: 'Régimes de retraite étrangers', denomination: 'Pension' });
    expect(JSON.stringify(r.error?.issues)).toContain('regime_retraite_etrangere');
  });

  it('épargne transmise par la succession : dans l\'actif', () => {
    const a = asset('RE', 'Régimes de retraite étrangers', 100000, { regime_retraite_etrangere: 'actif_successoral' });
    expect(isContratHorsSuccession(a)).toBe(false);
    expect(buildPatrimonySnapshot([a] as never, []).biensExistants).toBe(100000);
  });

  it('capital aux bénéficiaires : régime de l\'assurance-vie ; rien : ni actif ni contrat', () => {
    const clauseRe = asset('RE', 'Régimes de retraite étrangers', 300000, { regime_retraite_etrangere: 'clause_beneficiaire' });
    const { result, patrimony } = run([row('RE', 'Régimes de retraite étrangers', 300000, { regimeRetraiteEtrangere: 'clause_beneficiaire' })], [clauseRe]);
    expect(patrimony.biensExistants).toBe(0);
    expect(result.dmtg.perBeneficiary[HUGO].prelev990I).toBe(29500);

    const rien = { nature: 'Régimes de retraite étrangers', regime_retraite_etrangere: 'aucune' };
    expect(isContratHorsSuccession(rien)).toBe(true);
    expect(isContratNonTransmis(rien)).toBe(true);
    expect(buildAVContracts([row('RE', 'Régimes de retraite étrangers', 300000, { regimeRetraiteEtrangere: 'aucune' })], profile.date_naissance, family, REF)).toEqual([]);
  });
});

describe('N6 — stock-options', () => {
  it('valeur saisie retenue, doctrine signalée', () => {
    const { result } = run([], [asset('SO', 'Stock-options', 40000)]);
    expect((result.explicationsTexte || []).join(' ')).toContain('Stock-options');
  });
});
