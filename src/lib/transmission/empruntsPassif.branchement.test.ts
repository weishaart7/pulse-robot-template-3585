/**
 * Tests de branchement des emprunts dans le passif transmis.
 *
 * Trou comblé ici (audit du module Patrimoine/Transmission) : seule la table
 * `passifs` alimentait le calcul de transmission, `emprunts.capital_restant_du`
 * n'était chargé par aucun écran. Un crédit en cours n'était donc déduit ni de
 * la masse successorale civile, ni de l'assiette DMTG, ni de la base du droit
 * de partage.
 *
 * Pondération attendue : un emprunt « Bien commun » est compté à 100%, pas à
 * 50% — exactement le traitement des `passifs` aujourd'hui (cf.
 * avantagesMatrimoniaux.ts::getFractionPassifAjustee, qui ne renvoie une
 * fraction qu'en présence d'une clause de partage inégal). Cette tâche ajoute
 * les emprunts au passif existant, elle ne rouvre pas la pondération des
 * passifs communs.
 */
import { describe, it, expect } from 'vitest';
import { computeTransmission, FamilyGraph, TransmissionParams } from './index';
import { buildPatrimonySnapshot, buildPassifLines } from '../../utils/transmissionHelpers';
import transmissionParamsData from '../../data/transmission-params.json';

function buildParams(): TransmissionParams {
  return {
    abattements: {
      ...transmissionParamsData.abattements,
      conjoint: transmissionParamsData.abattements.conjoint === 'Infinity' ? Infinity : Number(transmissionParamsData.abattements.conjoint)
    },
    bareme: transmissionParamsData.bareme,
    prelevement990I: transmissionParamsData.prelevement990I
  };
}

function buildFamily(): FamilyGraph {
  return {
    persons: [
      { id: 'defunt', nom: 'Dupont', prenom: 'Jean' },
      { id: 'conjoint', nom: 'Dupont', prenom: 'Marie', lienFamilial: 'Conjoint' },
      { id: 'enfant1', nom: 'Dupont', prenom: 'Léo', lienFamilial: 'Enfant' }
    ],
    links: [{ from: 'defunt', to: 'enfant1', relation: 'child' }],
    marriages: [{ spouseA: 'defunt', spouseB: 'conjoint' }],
    decedentId: 'defunt',
    hasSurvivingSpouse: true,
    survivingSpouseId: 'conjoint',
    childrenOfDecedent: ['enfant1'],
    childrenCommonWithSpouse: ['enfant1'],
    hasDDV: false
  };
}

describe('buildPassifLines — fusion passifs + emprunts', () => {
  it('mappe capital_restant_du vers montant_du en conservant qualification_bien', () => {
    const lignes = buildPassifLines(
      [],
      [{ capital_restant_du: 120000, qualification_bien: 'Bien commun', societe_id: null }]
    );
    expect(lignes).toEqual([{ montant_du: 120000, qualification_bien: 'Bien commun' }]);
  });

  it('concatène les deux sources sans en perdre ni en pondérer aucune', () => {
    const lignes = buildPassifLines(
      [{ montant_du: 30000, qualification_bien: 'Bien propre' }],
      [{ capital_restant_du: 70000, qualification_bien: 'Bien commun', societe_id: null }]
    );
    expect(lignes).toHaveLength(2);
    expect(lignes.reduce((s, l) => s + l.montant_du, 0)).toBe(100000);
  });

  it('exclut les emprunts portés par une société (double emploi avec la valorisation des parts)', () => {
    const lignes = buildPassifLines(
      [],
      [
        { capital_restant_du: 200000, qualification_bien: 'Bien commun', societe_id: 'societe-1' },
        { capital_restant_du: 50000, qualification_bien: 'Bien commun', societe_id: null }
      ]
    );
    expect(lignes).toEqual([{ montant_du: 50000, qualification_bien: 'Bien commun' }]);
  });

  it('traite un capital_restant_du absent comme 0 (colonne nullable, jamais deviné)', () => {
    const lignes = buildPassifLines([], [{ qualification_bien: 'Bien commun', societe_id: null }]);
    expect(lignes).toEqual([{ montant_du: 0, qualification_bien: 'Bien commun' }]);
  });
});

describe('Branchement — un emprunt seul réduit le patrimoine transmis', () => {
  it('emprunt « Bien commun » sans aucun passif : compté à 100% dans patrimony.passifs, comme un passif', () => {
    const emprunts = [{ capital_restant_du: 100000, qualification_bien: 'Bien commun', societe_id: null }];
    const patrimony = buildPatrimonySnapshot([], buildPassifLines([], emprunts));
    expect(patrimony.passifs).toBe(100000);
  });

  it('emprunt seul : la masse partageable est réduite du capital restant dû', () => {
    const family = buildFamily();
    const rawAssets = [
      { id: 'actif', denomination: 'Actif commun', valeur_estimee: 500000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const emprunts = [{ capital_restant_du: 100000, qualification_bien: 'Bien commun', societe_id: null }];

    const patrimony = buildPatrimonySnapshot(rawAssets as any, buildPassifLines([], emprunts), 0);
    // Actif commun pondéré à 50% (getPartSuccessorale), emprunt commun à 100%.
    expect(patrimony.biensExistants).toBeCloseTo(250000, 0);
    expect(patrimony.passifs).toBe(100000);

    const result = computeTransmission({
      family,
      patrimony,
      liberalites: [],
      params: buildParams(),
      conjointOption: 'quart_pp',
      referenceDate: '2026-07-28',
      rawAssets
    });

    // Masse partageable = 250 000 − 100 000 (computeMasseCalcul nette le passif).
    const totalPartsCiviles = result.heirs.reduce((s, h) => s + h.partFinale, 0);
    expect(totalPartsCiviles).toBeCloseTo(150000, 0);
  });

  it('régression : sans emprunt, le résultat est strictement celui d\'avant le branchement', () => {
    const rawAssets = [
      { id: 'actif', denomination: 'Actif commun', valeur_estimee: 500000, nature: 'valeur_mobiliere', qualification_bien: 'Bien commun' }
    ];
    const passifs = [{ montant_du: 40000, qualification_bien: 'Bien commun' }];

    const avant = buildPatrimonySnapshot(rawAssets as any, passifs, 0);
    const apres = buildPatrimonySnapshot(rawAssets as any, buildPassifLines(passifs, []), 0);

    expect(apres.biensExistants).toBe(avant.biensExistants);
    expect(apres.passifs).toBe(avant.passifs);
  });
});

describe('buildPassifLines — déduction de la part couverte par l\'assurance décès', () => {
  it('capital_garanti_deces renseigné : prime sur la quotité, montant fixe déduit', () => {
    const lignes = buildPassifLines(
      [],
      [{
        capital_restant_du: 150000,
        qualification_bien: 'Bien commun',
        societe_id: null,
        capital_garanti_deces: 100000,
        quotite_assuree_utilisateur: 50 // doit être ignorée, capital_garanti_deces prime
      }],
      'user'
    );
    expect(lignes).toEqual([{ montant_du: 50000, qualification_bien: 'Bien commun' }]);
  });

  it('quotite_assuree_utilisateur seule, defunt = user : réduit le montant net en proportion', () => {
    const lignes = buildPassifLines(
      [],
      [{
        capital_restant_du: 100000,
        qualification_bien: 'Bien commun',
        societe_id: null,
        quotite_assuree_utilisateur: 60
      }],
      'user'
    );
    expect(lignes).toEqual([{ montant_du: 40000, qualification_bien: 'Bien commun' }]);
  });

  it('quotite_assuree_conjoint seule, defunt = spouse : s\'applique, pas la quotité utilisateur', () => {
    const lignes = buildPassifLines(
      [],
      [{
        capital_restant_du: 100000,
        qualification_bien: 'Bien commun',
        societe_id: null,
        quotite_assuree_utilisateur: 100,
        quotite_assuree_conjoint: 30
      }],
      'spouse'
    );
    expect(lignes).toEqual([{ montant_du: 70000, qualification_bien: 'Bien commun' }]);
  });

  it('quotité hors bornes (150 ou -20) : clampée avant calcul', () => {
    const lignesTropHaute = buildPassifLines(
      [],
      [{ capital_restant_du: 100000, qualification_bien: 'Bien commun', societe_id: null, quotite_assuree_utilisateur: 150 }],
      'user'
    );
    expect(lignesTropHaute).toEqual([{ montant_du: 0, qualification_bien: 'Bien commun' }]);

    const lignesNegative = buildPassifLines(
      [],
      [{ capital_restant_du: 100000, qualification_bien: 'Bien commun', societe_id: null, quotite_assuree_utilisateur: -20 }],
      'user'
    );
    expect(lignesNegative).toEqual([{ montant_du: 100000, qualification_bien: 'Bien commun' }]);
  });

  it('capital_garanti_deces > capital_restant_du : montant net à 0, jamais négatif', () => {
    const lignes = buildPassifLines(
      [],
      [{ capital_restant_du: 50000, qualification_bien: 'Bien commun', societe_id: null, capital_garanti_deces: 80000 }],
      'user'
    );
    expect(lignes).toEqual([{ montant_du: 0, qualification_bien: 'Bien commun' }]);
  });

  it('non-régression : sans defunt fourni, aucune déduction (comportement historique)', () => {
    const lignes = buildPassifLines(
      [],
      [{
        capital_restant_du: 100000,
        qualification_bien: 'Bien commun',
        societe_id: null,
        capital_garanti_deces: 100000,
        quotite_assuree_utilisateur: 100
      }]
      // pas de 3e argument
    );
    expect(lignes).toEqual([{ montant_du: 100000, qualification_bien: 'Bien commun' }]);
  });

  it('non-régression : emprunt sans aucune donnée d\'assurance, defunt fourni : capital transmis intégralement', () => {
    const lignes = buildPassifLines(
      [],
      [{ capital_restant_du: 100000, qualification_bien: 'Bien commun', societe_id: null }],
      'user'
    );
    expect(lignes).toEqual([{ montant_du: 100000, qualification_bien: 'Bien commun' }]);
  });
});

describe('Succession2ndDeces — les deux variantes passifLinesUtilisateur/passifLinesBrut', () => {
  // Reproduit le motif exact de Succession2ndDeces.tsx : `buildPatrimonySnapshot`
  // modélise toujours le patrimoine de l'Utilisateur (jamais celui du
  // conjoint), donc `passifLinesUtilisateur` doit systématiquement recevoir
  // `defunt: 'user'` — quel que soit l'ordre de décès simulé (normal ou
  // inversé). `passifLinesBrut` (sans `defunt`) alimente les deux fonctions
  // qui approximent le passif du conjoint et reste volontairement non netté.
  const emprunts = [{
    capital_restant_du: 100000,
    qualification_bien: 'Bien commun',
    societe_id: null,
    quotite_assuree_utilisateur: 100,
    quotite_assuree_conjoint: 40
  }];

  it('passifLinesUtilisateur (defunt: \'user\') applique la quotité utilisateur, jamais celle du conjoint', () => {
    const passifLinesUtilisateur = buildPassifLines([], emprunts, 'user');
    // quotite_assuree_utilisateur = 100% → capital intégralement couvert.
    expect(passifLinesUtilisateur).toEqual([{ montant_du: 0, qualification_bien: 'Bien commun' }]);
  });

  it('passifLinesBrut (sans defunt) ignore les données d\'assurance, même présentes', () => {
    const passifLinesBrut = buildPassifLines([], emprunts);
    expect(passifLinesBrut).toEqual([{ montant_du: 100000, qualification_bien: 'Bien commun' }]);
  });

  it('la même donnée d\'emprunt produit deux résultats différents selon la variante utilisée', () => {
    const passifLinesUtilisateur = buildPassifLines([], emprunts, 'user');
    const passifLinesBrut = buildPassifLines([], emprunts);
    expect(passifLinesUtilisateur[0].montant_du).not.toBe(passifLinesBrut[0].montant_du);
  });
});
