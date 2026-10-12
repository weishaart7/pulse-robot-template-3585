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

import { splitPrimesAvantApres70 } from '@/utils/transmissionHelpers';
import type { AVContract } from '@/lib/dmtg/types';

describe('#7 — bénéficiaire d\'assurance-vie non héritier : lien fiscal pour les primes après 70 ans', () => {
  const avPour = (id: string): AVContract => ({
    id: 'av1', niveaux: [{ beneficiaires: [{ beneficiaryId: id, quotePart: 1 }] }],
    capitalDeces: 230500, primesAvant70: 0, primesApres70: 230500, detenteur: 'user', dateSouscriptionConnue: true
  });
  const familleEtendue = (): FamilyGraph => {
    const f = famille(true);
    return {
      ...f,
      persons: [
        ...f.persons.map(p => p.id === 'e2' ? { ...p, renoncant: true, renoncantDe: 'defunt' } : p),
        { id: 'pe1', nom: 'D', prenom: 'PE', lienFamilial: 'Petit-enfant' },
        { id: 'nev', nom: 'D', prenom: 'N', lienFamilial: 'Neveu/Nièce' }
      ],
      links: [...f.links, { from: 'e1', to: 'pe1', relation: 'child' }]
    };
  };
  const droits = (id: string) => computeTransmission({
    family: familleEtendue(), patrimony: { date: REF, biensExistants: 0, passifs: 0 }, liberalites: [], params,
    conjointOption: 'quart_pp', referenceDate: REF, avContracts: [avPour(id)]
  }).dmtg.perBeneficiary[id];

  it('petit-enfant : barème en ligne directe, abattement de 1 594 € (37 876 € et non 119 044 €)', () => {
    expect(droits('pe1').droitsTotaux).toBe(37876);
  });

  it('enfant renonçant : abattement de 100 000 € conservé', () => {
    expect(droits('e2').allowanceGeneralResidual).toBe(100000);
    // 200 000 − 100 000 = 100 000 € taxables en ligne directe.
    expect(droits('e2').droitsTotaux).toBe(18194);
  });

  it('neveu : 55 % après 7 967 €', () => {
    expect(droits('nev').droitsTotaux).toBe(Math.round((200000 - 7967) * 0.55));
  });
});

describe('#8 — régimes transitoires de l\'assurance-vie', () => {
  const ops = [
    { type_operation: 'versement', montant: 10000, date_operation: '1990-01-01' },  // 40 ans, avant 1998
    { type_operation: 'versement', montant: 20000, date_operation: '2005-01-01' },  // 55 ans
    { type_operation: 'versement', montant: 30000, date_operation: '2025-01-01' }   // 75 ans
  ];
  const naissance = '1950-01-01';

  it('contrat souscrit depuis le 20/11/1991 : primes avant 1998 exonérées, après 70 ans en 757 B', () => {
    expect(splitPrimesAvantApres70(ops, naissance, 'C', '1995-01-01'))
      .toEqual({ primesAvant70: 20000, primesApres70: 30000, primesExonerees: 10000 });
  });

  it('contrat souscrit avant le 20/11/1991 : jamais de 757 B, 990 I sur les primes depuis le 13/10/1998', () => {
    expect(splitPrimesAvantApres70(ops, naissance, 'C', '1989-06-01'))
      .toEqual({ primesAvant70: 50000, primesApres70: 0, primesExonerees: 10000 });
  });

  it('les primes exonérées emportent leur part du capital, hors 990 I', () => {
    const r = computeTransmission({
      family: famille(true), patrimony: { date: REF, biensExistants: 0, passifs: 0 }, liberalites: [], params,
      conjointOption: 'quart_pp', referenceDate: REF,
      avContracts: [{
        id: 'av', niveaux: [{ beneficiaires: [{ beneficiaryId: 'e1', quotePart: 1 }] }],
        capitalDeces: 600000, primesAvant70: 200000, primesApres70: 0, primesExonerees: 100000, detenteur: 'user', dateSouscriptionConnue: true
      }]
    });
    // 990 I sur 2/3 du capital : 400 000 − 152 500 = 247 500 × 20 %.
    expect(r.dmtg.perBeneficiary['e1'].prelev990I).toBe(49500);
    expect(r.dmtg.perBeneficiary['e1'].capitalAVNet).toBe(600000 - 49500);
  });
});

describe('#9 — neveux : représentation fiscale seulement s\'il y a plusieurs souches', () => {
  const graphe = (avecFrereVivant: boolean): FamilyGraph => ({
    persons: [
      { id: 'defunt', nom: 'D', prenom: 'J' },
      { id: 'soeur', nom: 'S', prenom: 'S', lienFamilial: 'Frère/Sœur', estDecede: true },
      { id: 'n1', nom: 'N1', prenom: '', lienFamilial: 'Neveu/Nièce' },
      { id: 'n2', nom: 'N2', prenom: '', lienFamilial: 'Neveu/Nièce' },
      ...(avecFrereVivant ? [{ id: 'frere', nom: 'F', prenom: 'F', lienFamilial: 'Frère/Sœur' }] : [])
    ],
    links: [{ from: 'soeur', to: 'n1', relation: 'child' }, { from: 'soeur', to: 'n2', relation: 'child' }],
    marriages: [], decedentId: 'defunt', hasSurvivingSpouse: false, childrenOfDecedent: [], childrenCommonWithSpouse: []
  });
  const calcul = (g: FamilyGraph) => computeTransmission({
    family: g, patrimony: { date: REF, biensExistants: 300000, passifs: 0 }, liberalites: [], params, referenceDate: REF,
    rawAssets: [{ id: 'cc', denomination: 'Comptes', valeur_estimee: 300000, nature: 'Comptes courants', qualification_bien: 'Bien propre', detenteur: 'user' }]
  }).dmtg.perBeneficiary['n1'];

  it('souche unique : neveux de leur chef, 7 967 € et 55 % (BOI-ENR-DMTG-10-50-80 § 330)', () => {
    const n1 = calcul(graphe(false));
    expect(n1.allowanceGeneralResidual).toBe(7967);
    expect(n1.droitsTotaux).toBe(Math.round(n1.taxableAfterAllowance * 0.55));
  });

  it('plusieurs souches : tarif frères et sœurs, 15 932 € partagés', () => {
    const n1 = calcul(graphe(true));
    expect(n1.allowanceGeneralResidual).toBe(7966);
    expect(n1.droitsTotaux).toBe(Math.round(24430 * 0.35 + (n1.taxableAfterAllowance - 24430) * 0.45));
  });
});

describe('#10 — dons exonérés de l\'art. 790 A bis', () => {
  const don = (valeur: number, date: string, nature = "Don d'argent pour résidence principale (2025)"): Liberalite => ({
    id: `d-${valeur}-${date}`, type: 'donation', beneficiaireId: 'e1', valeur, valeurFiscaleActe: valeur, date, typeImputation: 'avance_part', nature
  });
  const e1 = (libs: Liberalite[]) => {
    const r = computeTransmission({
      family: famille(false), patrimony: { date: REF, biensExistants: 400000, passifs: 0 }, liberalites: libs, params, referenceDate: REF
    });
    return { b: r.dmtg.perBeneficiary['e1'], textes: r.explicationsTexte };
  };

  it('100 000 € exonérés : non rappelés, abattement de 100 000 € intact', () => {
    expect(e1([don(100000, '2025-06-01')]).b.allowanceGeneralResidual).toBe(100000);
  });

  it('150 000 € : seuls 50 000 € sont rappelés', () => {
    const { b } = e1([don(150000, '2025-06-01')]);
    expect(b.allowanceGeneralResidual).toBe(50000);
    expect(b.consumedBracketsAmount).toBe(0);
  });

  it('hors période ou nature imprécise : donation ordinaire, signalée', () => {
    const horsPeriode = e1([don(100000, '2024-06-01')]);
    expect(horsPeriode.b.allowanceGeneralResidual).toBe(0);
    expect(horsPeriode.textes.some(t => t.includes('790 A bis non retenue'))).toBe(true);
    const imprecis = e1([don(100000, '2025-06-01', "Don d'argent exonéré")]);
    expect(imprecis.b.allowanceGeneralResidual).toBe(0);
    expect(imprecis.textes.some(t => t.includes('régime d\'exonération non précisé'))).toBe(true);
  });
});

describe('#12 — valeur d\'un legs selon les droits du testateur', () => {
  const legsDe = (asset: Record<string, unknown>) => buildTransmissionLiberalites(
    [{ id: 'L', type: 'legs', beneficiaire_nom: 'Ami', denomination: 'Legs', biens: [{ asset_id: 'b' }] }],
    [{ id: 'b', valeur_estimee: 400000, denomination: 'Bien', ...asset }],
    false,
    { assetDemembrements: [{ asset_id: 'b', type_partie: 'tiers', date_naissance_tiers: '1960-01-01' } as never], demembrementCtx: { familyProfile: { date_naissance: '1960-01-01' } } }
  ).liberalites[0].valeur;

  it('usufruit : 0 ; nue-propriété : barème 669 ; bien propre du conjoint : 0', () => {
    expect(legsDe({ qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Usufruit' })).toBe(0);
    // Usufruitier tiers de 66 ans : nue-propriété 60 %.
    expect(legsDe({ qualification_bien: 'Bien propre', detenteur: 'user', mode_detention: 'Nue-propriété' })).toBe(240000);
    expect(legsDe({ qualification_bien: 'Bien propre', detenteur: 'spouse', mode_detention: 'Pleine propriété' })).toBe(0);
  });

  it('bien commun : valeur totale (art. 1423 al. 2) ; indivision : quote-part du testateur', () => {
    expect(legsDe({ qualification_bien: 'Bien commun', mode_detention: 'Pleine propriété' })).toBe(400000);
    expect(legsDe({ qualification_bien: 'Indivision', pourcentage_utilisateur: 30, mode_detention: 'Pleine propriété' })).toBe(120000);
  });
});
