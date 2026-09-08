import { describe, expect, it } from 'vitest';
import { calculerRevenuCapitauxMobiliers } from './calculerRevenuCapitauxMobiliers';
import { calculerPrelevementsSociauxCapitauxMobiliers } from './calculerPrelevementsSociauxCapitauxMobiliers';
import { calculerPartsFiscales } from './calculerPartsFiscales';
import { calculerImpot } from './calculerImpot';
import { FoyerFiscalInput, RevenusCapitauxMobiliersInput } from './types';

/**
 * Cas réel signalé par un utilisateur : célibataire, 2GO = 4 000 € et
 * 2CH = 6 000 € isolés (2OP décoché — PFU). Kairos annonçait 744 € de PS
 * (2GO seul, à 18,6 %) contre 1 860 € au simulateur officiel — 2CH était
 * exclu à tort du calcul PS (voir « Bug corrigé » dans
 * calculerPrelevementsSociauxCapitauxMobiliers.ts). L'IR (640 €) était déjà
 * correct des deux côtés.
 */
describe('régression : célibataire, 2GO=4000/2CH=6000, 2OP décoché', () => {
  it('retrouve les montants du simulateur officiel : 640 € d\'IR, 1 860 € de PS', () => {
    const revenus: RevenusCapitauxMobiliersInput = {
      case2dh: null, case2ch: 6000, case2uu: null, case2vv: null, case2ww: null,
      case2xx: null, case2yy: null, case2zz: null,
      case2dc: null, case2fu: null,
      case2tr: null, case2tt: null, case2tq: null, case2ts: null, case2tz: null, case2go: 4000,
      case2tu: null, case2tv: null, case2tw: null, case2tx: null, case2ty: null,
      case2cg: null, case2bh: null, case2df: null, case2dg: null, case2di: null,
      case2ca: null, case2ab: null, case2ck: null, case2ee: null,
      case2aa: null, case2al: null, case2am: null, case2an: null, case2aq: null, case2ar: null,
      case2vm: null, case2vn: null, case2vo: null, case2vp: null,
      case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null,
      case2op: false,
    };
    const foyer: FoyerFiscalInput = {
      situationFamille: 'celibataire', lieuResidence: 'metropole',
      enfantsCharge: [], personnesInvalidesCharge: [], enfantsMajeursRattaches: 0,
      parentIsole: false, ancienParentIsole: false,
      invaliditeDeclarant1: false, invaliditeDeclarant2: false,
      ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
      veufAncienCombattant: false, veuveDeGuerre: false,
    };

    const revenuCM = calculerRevenuCapitauxMobiliers(revenus, foyer.situationFamille);
    const ps = calculerPrelevementsSociauxCapitauxMobiliers(revenus);
    const parts = calculerPartsFiscales(foyer);

    const impot = calculerImpot(
      revenuCM.totalNetImposable,
      parts,
      foyer.situationFamille,
      0,
      foyer.lieuResidence,
      revenuCM.impotForfaitaire,
    );

    expect(impot.impotNet).toBe(640);
    expect(ps.prelevementsSociaux).toBeCloseTo(1860, 6);
  });
});

/**
 * Cas réel signalé par le même utilisateur, test de suivi : célibataire,
 * 2VV = 5 000 € isolé (2OP décoché — PFU). Confirme que la frontière n'est
 * pas « avant/après le 27.9.2017 » (2VV est postérieur, contrairement à 2CH,
 * et se comporte pourtant identiquement) mais « soumis au prélèvement
 * libératoire » ou non (voir « Bug corrigé » dans
 * calculerPrelevementsSociauxCapitauxMobiliers.ts). L'IR (30 €) était déjà
 * correct des deux côtés ; seul les PS (0 € contre 930 € au simulateur
 * officiel) étaient faux.
 */
describe('régression : célibataire, 2VV=5000 seul, 2OP décoché', () => {
  it('retrouve les montants du simulateur officiel : 30 € d\'IR, 930 € de PS', () => {
    const revenus: RevenusCapitauxMobiliersInput = {
      case2dh: null, case2ch: null, case2uu: null, case2vv: 5000, case2ww: null,
      case2xx: null, case2yy: null, case2zz: null,
      case2dc: null, case2fu: null,
      case2tr: null, case2tt: null, case2tq: null, case2ts: null, case2tz: null, case2go: null,
      case2tu: null, case2tv: null, case2tw: null, case2tx: null, case2ty: null,
      case2cg: null, case2bh: null, case2df: null, case2dg: null, case2di: null,
      case2ca: null, case2ab: null, case2ck: null, case2ee: null,
      case2aa: null, case2al: null, case2am: null, case2an: null, case2aq: null, case2ar: null,
      case2vm: null, case2vn: null, case2vo: null, case2vp: null,
      case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null,
      case2op: false,
    };
    const foyer: FoyerFiscalInput = {
      situationFamille: 'celibataire', lieuResidence: 'metropole',
      enfantsCharge: [], personnesInvalidesCharge: [], enfantsMajeursRattaches: 0,
      parentIsole: false, ancienParentIsole: false,
      invaliditeDeclarant1: false, invaliditeDeclarant2: false,
      ancienCombattantDeclarant1: false, ancienCombattantDeclarant2: false,
      veufAncienCombattant: false, veuveDeGuerre: false,
    };

    const revenuCM = calculerRevenuCapitauxMobiliers(revenus, foyer.situationFamille);
    const ps = calculerPrelevementsSociauxCapitauxMobiliers(revenus);
    const parts = calculerPartsFiscales(foyer);

    const impot = calculerImpot(
      revenuCM.totalNetImposable,
      parts,
      foyer.situationFamille,
      0,
      foyer.lieuResidence,
      revenuCM.impotForfaitaire,
    );

    expect(impot.impotNet).toBe(30);
    expect(ps.prelevementsSociaux).toBeCloseTo(930, 6);
  });
});
