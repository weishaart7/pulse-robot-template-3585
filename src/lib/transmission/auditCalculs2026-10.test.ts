/**
 * Audit des calculs du 2026-10-12, phase 1 (cf. docs/transmission.md §3) :
 * #2 usufruit viager du défunt hors succession, #5 masse de l'art. 758-5 sans
 * double compte des legs « sur part successorale ». Le #1 (récompenses) est
 * couvert par recompensesCreances.branchement.test.ts. Phase 2 : #3 donateur
 * des donations, #4 libéralités au 2nd décès.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, Liberalite, TransmissionParams, liberalitesDuDefunt } from './index';
import { buildPatrimonySnapshot, buildTransmissionLiberalites } from '@/utils/transmissionHelpers';
import { computeValeurNueProprieteDonationParDonateurs } from '@/lib/patrimoine/bareme669CGI';
import type { Asset } from '@/services/assetService';
import transmissionParamsData from '../../data/transmission-params.json';

const params = {
  abattements: { ...transmissionParamsData.abattements, conjoint: Infinity },
  bareme: transmissionParamsData.bareme,
  prelevement990I: transmissionParamsData.prelevement990I
} as unknown as TransmissionParams;

const REF = '2026-10-12';

function famille(avecConjoint: boolean): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'D', prenom: 'Jean', dateNaissance: '1960-01-01' },
      ...(avecConjoint ? [{ id: 'conjoint', nom: 'D', prenom: 'Marie', lienFamilial: 'conjoint', dateNaissance: '1962-01-01' }] : []),
      { id: 'e1', nom: 'D', prenom: 'A', lienFamilial: 'Enfant', dateNaissance: '1990-01-01' },
      { id: 'e2', nom: 'D', prenom: 'B', lienFamilial: 'Enfant', dateNaissance: '1992-01-01' }
    ],
    links: [{ from: 'defunt', to: 'e1', relation: 'child' }, { from: 'defunt', to: 'e2', relation: 'child' }],
    marriages: avecConjoint ? [{ spouseA: 'defunt', spouseB: 'conjoint' }] : [],
    decedentId: 'defunt',
    hasSurvivingSpouse: avecConjoint,
    survivingSpouseId: avecConjoint ? 'conjoint' : undefined,
    childrenOfDecedent: ['e1', 'e2'],
    childrenCommonWithSpouse: avecConjoint ? ['e1', 'e2'] : [],
    hasDDV: false
  };
}

describe('#2 — usufruit viager détenu par le défunt', () => {
  const maisonEnUsufruit = {
    id: 'maison', denomination: 'Maison (NP donnée)', valeur_estimee: 500000, nature: 'Résidences secondaires',
    mode_detention: 'Usufruit', detenteur: 'user', qualification_bien: 'Bien propre'
  };
  const comptes = {
    id: 'cc', denomination: 'Comptes', valeur_estimee: 300000, nature: 'Comptes courants',
    mode_detention: 'Pleine propriété', detenteur: 'user', qualification_bien: 'Bien propre'
  };
  const ctxDemembrement = { familyProfile: { date_naissance: '1960-01-01' } };

  it('n\'entre pas dans la masse civile (art. 617 C. civ.)', () => {
    const snap = buildPatrimonySnapshot([maisonEnUsufruit, comptes] as unknown as Asset[], [], 0, [], ctxDemembrement);
    expect(snap.biensExistants).toBe(300000);
  });

  it('n\'entre pas dans l\'assiette des droits (art. 1133 CGI) et le résultat le signale', () => {
    const result = computeTransmission({
      family: famille(false),
      patrimony: { date: REF, biensExistants: 300000, passifs: 0 },
      liberalites: [],
      params,
      referenceDate: REF,
      rawAssets: [maisonEnUsufruit, comptes],
      demembrementCtx: ctxDemembrement
    });
    // Comptes seuls : 150 000 € par enfant − 750 € de frais funéraires
    // + 7 500 € de forfait mobilier − 100 000 € d'abattement.
    expect(result.dmtg.perBeneficiary['e1'].taxableAfterAllowance).toBe(56750);
    expect(result.explicationsTexte.some(t => t.includes('art. 617'))).toBe(true);
  });

  it('la nue-propriété détenue par le défunt reste évaluée au barème 669', () => {
    const np = { ...maisonEnUsufruit, mode_detention: 'Nue-propriété' };
    const snap = buildPatrimonySnapshot([np] as unknown as Asset[], [], 0, [], ctxDemembrement);
    // Usufruitier = contrepartie non renseignée → valeur non calculable (0),
    // comportement inchangé ; avec un usufruitier de 66 ans : 60 % de NP.
    const snapAvecUsufruitier = buildPatrimonySnapshot(
      [np] as unknown as Asset[], [],
      0,
      [{ asset_id: 'maison', type_partie: 'tiers', date_naissance_tiers: '1960-01-01' } as never],
      ctxDemembrement
    );
    expect(snap.biensExistants).toBe(0);
    expect(snapAvecUsufruitier.biensExistants).toBe(300000);
  });
});

describe('#5 — masse de l\'art. 758-5 et legs sur part successorale', () => {
  it('le legs, déjà dans les biens existants, n\'est pas réuni une seconde fois', () => {
    const legs: Liberalite[] = [{ id: 'l1', type: 'legs', beneficiaireId: 'e1', valeur: 200000, date: REF, typeImputation: 'avance_part' }];
    const result = computeTransmission({
      family: famille(true),
      patrimony: { date: REF, biensExistants: 800000, passifs: 0 },
      liberalites: legs,
      params,
      conjointOption: 'quart_pp',
      referenceDate: REF
    });
    const recu = (id: string) => result.heirs.filter(h => h.personId === id).reduce((s, h) => s + h.recuSuccession, 0);
    expect(recu('conjoint')).toBeCloseTo(200000, 0);
    expect(recu('e1')).toBeCloseTo(300000, 0);
    expect(recu('e2')).toBeCloseTo(300000, 0);
  });
});

describe('#3 — donateur des donations (realise_par)', () => {
  const donation = (donateur: Liberalite['donateur']): Liberalite => ({
    id: 'd1', type: 'donation', beneficiaireId: 'e1', valeur: 200000, valeurFiscaleActe: 200000,
    valeurPartage: 220000, date: '2018-01-01', typeImputation: 'avance_part', donateur
  });

  it('realise_par est traduit en donateur (défaut : Utilisateur)', () => {
    const rows = ['epoux1', 'epoux2', 'communaute', null].map((r, i) => ({
      id: `d${i}`, type: 'donation', beneficiaire_nom: 'A', montant: 1000, denomination: 'D', realise_par: r
    }));
    const { liberalites } = buildTransmissionLiberalites(rows, []);
    expect(liberalites.map(l => l.donateur)).toEqual(['user', 'spouse', 'communaute', 'user']);
  });

  it('pondération : 100 % donateur seul, 50 % biens communs, 0 % autre époux ; legs à l\'Utilisateur seulement', () => {
    const legs: Liberalite = { id: 'l1', type: 'legs', beneficiaireId: 'e2', valeur: 50000, date: REF };
    const libs = [donation('user'), { ...donation('communaute'), id: 'd2' }, { ...donation('spouse'), id: 'd3' }, legs];
    const user = liberalitesDuDefunt(libs, 'user');
    expect(user.map(l => [l.id, l.valeur])).toEqual([['d1', 200000], ['d2', 100000], ['l1', 50000]]);
    expect(user[1].valeurFiscaleActe).toBe(100000);
    expect(user[1].valeurPartage).toBe(110000);
    expect(liberalitesDuDefunt(libs, 'spouse').map(l => [l.id, l.valeur])).toEqual([['d2', 100000], ['d3', 200000]]);
  });

  it('donation de biens communs : rappel fiscal pour moitié dans la succession de l\'Utilisateur', () => {
    const r = computeTransmission({
      family: famille(true), patrimony: { date: REF, biensExistants: 800000, passifs: 0 },
      liberalites: [donation('communaute')], params, conjointOption: 'quart_pp', referenceDate: REF
    });
    const e1 = r.dmtg.perBeneficiary['e1'];
    expect(e1.allowanceGeneralResidual).toBe(0);
    expect(e1.consumedBracketsAmount).toBe(0);
    // Masse de calcul : 800 000 + 100 000 (moitié de la donation).
    expect(r.masseCalcul).toBe(900000);
  });

  it('donation du conjoint seul : absente de la succession de l\'Utilisateur, présente dans celle du conjoint', () => {
    const rUser = computeTransmission({
      family: famille(true), patrimony: { date: REF, biensExistants: 800000, passifs: 0 },
      liberalites: [donation('spouse')], params, conjointOption: 'quart_pp', referenceDate: REF
    });
    expect(rUser.masseCalcul).toBe(800000);
    expect(rUser.dmtg.perBeneficiary['e1'].allowanceGeneralResidual).toBe(100000);

    const familleConjoint: FamilyGraph = {
      ...famille(false),
      persons: famille(false).persons.map(p => p.id === 'defunt' ? { ...p, id: 'conjoint-defunt' } : p),
      links: famille(false).links.map(l => ({ ...l, from: 'conjoint-defunt' })),
      decedentId: 'conjoint-defunt',
      conjointPredecede: true
    };
    const rConjoint = computeTransmission({
      family: familleConjoint, patrimony: { date: REF, biensExistants: 400000, passifs: 0 },
      liberalites: [donation('spouse')], params, referenceDate: REF
    });
    expect(rConjoint.masseCalcul).toBe(600000);
    expect(rConjoint.dmtg.perBeneficiary['e1'].consumedBracketsAmount).toBe(100000);
  });

  it('nue-propriété d\'une donation de biens communs : chaque moitié à l\'âge de son donateur', () => {
    // 60 ans (NP 50 %) et 70 ans (NP 60 %) à l'acte, 400 000 € en PP.
    const r = computeValeurNueProprieteDonationParDonateurs(400000, ['1960-01-01', '1950-01-01'], '2020-06-01');
    expect(r?.valeur).toBe(220000);
    expect(r?.ages).toEqual([60, 70]);
    expect(computeValeurNueProprieteDonationParDonateurs(400000, ['1960-01-01', null], '2020-06-01')).toBeNull();
  });
});

describe('#4 — libéralités de l\'Utilisateur à son décès après celui du conjoint', () => {
  const veuf = (): FamilyGraph => ({ ...famille(false), conjointPredecede: true });

  it('le rappel fiscal de ses donations s\'applique', () => {
    const r = computeTransmission({
      family: veuf(), patrimony: { date: REF, biensExistants: 600000, passifs: 0 },
      liberalites: [{ id: 'd1', type: 'donation', beneficiaireId: 'e1', valeur: 100000, valeurFiscaleActe: 100000, date: '2021-01-01', typeImputation: 'avance_part' }],
      params, referenceDate: REF
    });
    expect(r.dmtg.perBeneficiary['e1'].allowanceGeneralResidual).toBe(0);
  });

  it('un legs au conjoint prédécédé est caduc ; une donation à ce conjoint reste dans la masse', () => {
    const r = computeTransmission({
      family: veuf(), patrimony: { date: REF, biensExistants: 600000, passifs: 0 },
      liberalites: [
        { id: 'l1', type: 'legs', beneficiaireId: 'conjoint', beneficiaireName: 'Marie', valeur: 100000, date: REF },
        { id: 'd1', type: 'donation', beneficiaireId: 'conjoint', valeur: 50000, date: '2015-01-01', typeImputation: 'hors_part' }
      ],
      params, referenceDate: REF
    });
    expect(r.legataires).toHaveLength(0);
    expect(r.masseCalcul).toBe(650000);
    expect(r.heirs.reduce((s, h) => s + h.recuSuccession, 0)).toBeCloseTo(600000, 0);
    expect(r.explicationsTexte.some(t => t.includes('art. 1039'))).toBe(true);
  });
});

import { buildFamilyGraph, coteFamilial } from '@/utils/transmissionHelpers';
import type { FamilyLink } from '@/services/familyService';

describe('#13 — famille du conjoint distincte de celle du défunt', () => {
  const lien = (id: string, lien_familial: string, extra: Partial<FamilyLink> = {}) =>
    ({ id, nom: id, prenom: '', lien_familial, ...extra }) as FamilyLink;
  const links = [
    lien('pereU', 'Parent', { enfant_de: 'user' }),
    lien('pereC', 'Parent', { enfant_de: 'spouse' }),
    lien('mereC', 'Parent', { enfant_de: 'spouse' }),
    lien('gpC', 'Grand-parent', { enfant_de: 'pereC', branche_familiale: 'Branche paternelle' }),
    lien('soeurC', 'Frère/Sœur', { enfant_de: 'spouse' }),
    lien('neveuC', 'Neveu/Nièce', { enfant_de: 'soeurC' }),
    lien('frereU', 'Frère/Sœur'),
  ];
  const profile = { id: 'U', nom: 'D', prenom: 'Jean', date_naissance: '1960-01-01' } as never;
  const marie = { statut_couple: 'Marié(e)', nom_conjoint: 'D', prenom_conjoint: 'Marie', date_naissance_conjoint: '1962-01-01' } as never;

  it('remonte enfant_de jusqu\'à l\'époux de rattachement (défaut : Utilisateur)', () => {
    expect(links.map(l => coteFamilial(l, links))).toEqual(['user', 'spouse', 'spouse', 'spouse', 'spouse', 'spouse', 'user']);
  });

  it('couple marié sans enfant : les beaux-parents n\'héritent pas (art. 757-1 : conjoint 3/4, père 1/4)', () => {
    const family = buildFamilyGraph(profile, marie, links);
    const r = computeTransmission({ family, patrimony: { date: REF, biensExistants: 400000, passifs: 0 }, liberalites: [], params, referenceDate: REF });
    const parts = Object.fromEntries(r.heirs.map(h => [h.personId, h.partCivile]));
    expect(parts).toEqual({ [family.survivingSpouseId!]: 300000, pereU: 100000 });
  });

  it('beau-parent légataire : taxé comme un tiers (60 %), pas en ligne directe', () => {
    const family = buildFamilyGraph(profile, marie, links);
    const r = computeTransmission({
      family, patrimony: { date: REF, biensExistants: 400000, passifs: 0 }, params, referenceDate: REF,
      liberalites: [{ id: 'l1', type: 'legs', beneficiaireId: 'mereC', valeur: 50000, date: REF }],
      rawAssets: [{ id: 'cc', denomination: 'Comptes', valeur_estimee: 400000, nature: 'Comptes courants', qualification_bien: 'Bien propre', detenteur: 'user' }]
    });
    const legataire = r.dmtg.perBeneficiary['mereC'];
    expect(r.legataires.map(l => l.personId)).toEqual(['mereC']);
    expect(legataire.allowanceGeneralResidual).toBe(1594);
    expect(legataire.droitsTotaux).toBe(Math.round((legataire.taxableAfterAllowance) * 0.6));
  });
});
