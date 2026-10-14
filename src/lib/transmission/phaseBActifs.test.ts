/**
 * Audit des classes d'actifs du 2026-10-14, phase B :
 * - N3 meubles meublants : forfait de 5 % = valeur minimale (art. 764 CGI) ;
 * - N4 dette rattachée à un bien exonéré imputée par priorité sur sa valeur
 *   (art. 769 II CGI) ;
 * - N5 donations de biens ruraux imputées sur le seuil de 600 000 € (art. 793 bis) ;
 * - #18 Dutreil après la LF 2026 (engagement de 6 ans, biens non affectés).
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, RawAssetInput } from './index';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import { computeDMTG, DEFAULT_DMTG_PARAMS, filterAndValueEstateAssets, Asset } from '@/lib/dmtg';
import { buildTransmissionLiberalites, buildPassifsParBien, buildPassifLines } from '@/utils/transmissionHelpers';

const REF = '2026-10-14';
const params = DEFAULT_DMTG_PARAMS;

const bien = (id: string, valeurVenale: number, extra: Partial<Asset> = {}): Asset =>
  ({ id, label: id, valeurVenale, nature: 'autre', exclurePour: {}, ...extra });

describe('N3 — meubles meublants et forfait mobilier (art. 764 CGI)', () => {
  it('meubles déclarés au-dessus du forfait : retenus seuls, sans forfait en plus', () => {
    const r = filterAndValueEstateAssets([bien('maison', 400000), bien('meubles', 30000, { isMeublesMeublants: true })], params, REF);
    // 430 000 € taxés, et non 430 000 + 5 % × 430 000 = 451 500 €.
    expect(r.totalBaseTaxable + r.forfaitMobilier).toBe(430000);
  });

  it('meubles déclarés sous le forfait : complétés jusqu\'à 5 % des autres biens', () => {
    const r = filterAndValueEstateAssets([bien('maison', 400000), bien('meubles', 10000, { isMeublesMeublants: true })], params, REF);
    expect(r.forfaitMobilier).toBe(10000);
    expect(r.totalBaseTaxable + r.forfaitMobilier).toBe(420000);
  });

  it('sans meubles saisis : forfait de 5 % inchangé ; inventaire : valeur déclarée seule', () => {
    expect(filterAndValueEstateAssets([bien('maison', 400000)], params, REF).forfaitMobilier).toBe(20000);
    const inventaire = filterAndValueEstateAssets([bien('maison', 400000), bien('meubles', 10000, { isMeublesMeublants: true })], params, REF, true);
    expect(inventaire.forfaitMobilier).toBe(0);
  });
});

describe('N4 — dette rattachée à un bien exonéré (art. 769 II CGI)', () => {
  it('Dutreil : dette imputée avant exonération, seule sa fraction taxable est déduite', () => {
    const r = filterAndValueEstateAssets([bien('titres', 1000000, { isDutreil: true, detteImputee: 400000 })], params, REF);
    expect(r.lignes[0].baseTaxableGlobale).toBe(150000);
    expect(r.passifImputeSurBiens).toBe(400000);
  });

  it('dette supérieure au bien : l\'excédent reste dans le passif général', () => {
    const r = filterAndValueEstateAssets([bien('gfa', 100000, { exonerationRurale: 'forestier', detteImputee: 150000 })], params, REF);
    expect(r.lignes[0].baseTaxableGlobale).toBe(0);
    expect(r.passifImputeSurBiens).toBe(100000);
  });

  it('bien non exonéré (résidence principale) : dette laissée au passif général', () => {
    const r = filterAndValueEstateAssets([bien('rp', 400000, { isResidencePrincipale: true, detteImputee: 200000 })], params, REF);
    expect(r.lignes[0].baseTaxableGlobale).toBe(320000);
    expect(r.passifImputeSurBiens).toBe(0);
  });

  it('chaîne complète : la dette n\'est plus déduite du reste du patrimoine', () => {
    const avec = computeDMTG({
      deathDate: REF, params, regimeMatrimonial: null,
      assets: [bien('titres', 1000000, { isDutreil: true, detteImputee: 400000 }), bien('compte', 600000)],
      civilShares: [{ beneficiaryId: 'E1', fraction: 1, source: 'legal' }],
      beneficiaries: [{ id: 'E1', lien: 'enfant' }],
      donations: [], avContracts: [], passif: 400000, inventaireNotarieProduit: true
    });
    // 150 000 + 600 000 − 1 500 de frais funéraires (avant : 250 000 + 600 000 − 400 000).
    expect(avec.perBeneficiary.E1.baseHorsAV).toBe(748500);
  });

  it('dettes par bien pondérées comme le passif global', () => {
    const lignes = buildPassifLines([], [
      { asset_id: 'gfa', capital_restant_du: 200000, qualification_bien: 'Bien commun' },
      { asset_id: 'gfa', capital_restant_du: 50000, qualification_bien: 'Bien propre', detenteur: 'user' },
      { capital_restant_du: 80000, qualification_bien: 'Bien propre', detenteur: 'user' }
    ], 'user');
    expect(buildPassifsParBien(lignes)).toEqual({ gfa: 150000 });
  });
});

describe('N5 — donations de biens ruraux imputées sur le seuil (art. 793 bis)', () => {
  const calcul = (donations: Parameters<typeof computeDMTG>[0]['donations']) => computeDMTG({
    deathDate: REF, params, regimeMatrimonial: null,
    assets: [bien('gfa', 1600000, { exonerationRurale: 'agricole' })],
    civilShares: [{ beneficiaryId: 'E1', fraction: 0.5, source: 'legal' }, { beneficiaryId: 'E2', fraction: 0.5, source: 'legal' }],
    beneficiaries: [{ id: 'E1', lien: 'enfant' }, { id: 'E2', lien: 'enfant' }],
    donations, avContracts: [], inventaireNotarieProduit: true
  });

  it('seuil de E1 réduit de 300 000 € par une donation rurale de moins de 15 ans', () => {
    const r = calcul([{ id: 'd', date: '2018-01-01', donorId: 'D', doneeId: 'E1', valeurDon: 300000, valeurRuraleAgricole: 300000 }]);
    // E2 : 200 000 + 25 % × 200 000 ; E1 : 200 000 + 25 % × 500 000 — frais funéraires au prorata.
    expect(r.perBeneficiary.E2.baseHorsAV).toBe(249348);
    expect(r.perBeneficiary.E1.baseHorsAV).toBe(324152);
  });

  it('donation de plus de 15 ans : sans effet sur le seuil', () => {
    const r = calcul([{ id: 'd', date: '2010-01-01', donorId: 'D', doneeId: 'E1', valeurDon: 300000, valeurRuraleAgricole: 300000 }]);
    expect(r.perBeneficiary.E1.baseHorsAV).toBe(r.perBeneficiary.E2.baseHorsAV);
  });

  it('part rurale d\'une donation déduite des biens donnés et de leur fiche', () => {
    const { liberalites } = buildTransmissionLiberalites([{
      type: 'donation', beneficiaire_id: 'E1', beneficiaire_nom: 'E1', denomination: 'Don', montant: 400000,
      date_acte: '2018-01-01', biens: [{ asset_id: 'gfa', valeur: 300000 }, { asset_id: 'cpt', valeur: 100000 }]
    }], [
      { id: 'gfa', nature: 'Parts de GFA, GAF, GFV et GFR', regime_exoneration_rural: 'agricole', conditions_exoneration_rural: true },
      { id: 'cpt', nature: 'Comptes courants' }
    ]);
    expect(liberalites[0].partRuraleAgricole).toBe(0.75);
  });
});

describe('#18 — Dutreil après la LF 2026 (art. 787 B CGI)', () => {
  const famille: FamilyGraph = {
    persons: [
      { id: 'D', nom: 'D', prenom: 'D', dateNaissance: '1950-01-01' },
      { id: 'E1', nom: 'E1', prenom: 'E1', lienFamilial: 'Enfant', dateNaissance: '1975-01-01' }
    ],
    links: [{ from: 'D', to: 'E1', relation: 'child' }],
    marriages: [], decedentId: 'D', hasSurvivingSpouse: false, childrenOfDecedent: ['E1'], childrenCommonWithSpouse: [], hasDDV: false
  };
  const titres: RawAssetInput = {
    id: 'titres', denomination: 'Parts SAS', valeur_estimee: 1000000, nature: 'Droits sociaux',
    qualification_bien: 'Bien propre', detenteur: 'user', societe_id: 'soc1'
  };
  const run = (referenceDate: string, parts?: Record<string, number | null>) => computeTransmission({
    family: famille, patrimony: { date: referenceDate, biensExistants: 1000000, passifs: 0 }, liberalites: [],
    params: { inventaireNotarieProduit: true } as never, referenceDate, rawAssets: [titres],
    societesDutreil: ['soc1'], dutreilPartsNonAffectees: parts
  });

  it('depuis le 21/02/2026 : part des biens non affectés obligatoire, jamais présumée', () => {
    expect(() => run(REF)).toThrow(BienNonQualifieError);
    expect(() => run(REF, { soc1: null })).toThrow(BienNonQualifieError);
  });

  it('biens non affectés exclus de l\'exonération, engagement de 6 ans signalé', () => {
    const r = run(REF, { soc1: 20 });
    // 1 000 000 × (1 − 75 % × 80 %) − 1 500 de frais funéraires.
    expect(r.dmtg.perBeneficiary.E1.baseHorsAV).toBe(398500);
    expect((r.explicationsTexte || []).join(' ')).toContain('pendant 6 ans');
  });

  it('avant le 21/02/2026 : régime antérieur (4 ans, 75 % de toute la valeur)', () => {
    const r = run('2026-01-15');
    expect(r.dmtg.perBeneficiary.E1.baseHorsAV).toBe(248500);
    expect((r.explicationsTexte || []).join(' ')).toContain('pendant 4 ans');
  });
});
