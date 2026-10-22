import { describe, it, expect } from 'vitest';
import {
  trimestresEnfants,
  EntreeTrimestresEnfants,
  liensFamiliauxDeLaPersonne,
  AUCUN_TRIMESTRE_ENFANT,
} from './trimestresEnfants';
import { calculerPensionConsolidee, EntreePensionConsolidee, tauxProratisationFonctionPublique } from './pensionConsolidee';
import { FamilyLink } from '@/services/familyService';

const enfant = (id: string, dateNaissance: string, extra: Partial<FamilyLink> = {}): FamilyLink => ({
  id,
  lien_familial: 'Enfant',
  nom: 'T',
  prenom: id,
  date_naissance: dateNaissance,
  parent_de: 'both_parents',
  enfant_adopte: 'Non',
  ...extra,
});

const base: EntreeTrimestresEnfants = {
  familyLinks: [enfant('a', '2012-05-01')],
  attributions: [],
  personne: 'utilisateur',
  civiliteUtilisateur: 'Mme',
  civiliteConjoint: 'M.',
  droits: { rg: true, fp: false, cnavpl: false },
  dateEffet: new Date(2040, 0, 1),
  dureeTousRegimesHorsMDA: 120,
  mdaDejaAuRis: false,
};

describe('trimestresEnfants — régime général (art. L. 351-4 CSS)', () => {
  it('mère : 4 maternité + 4 éducation par défaut', () => {
    const r = trimestresEnfants(base);
    expect(r.rg).toBe(8);
    expect(r.auMoinsUn).toBe(true);
  });
  it('père : aucun trimestre par défaut', () => {
    expect(trimestresEnfants({ ...base, personne: 'conjoint' }).rg).toBe(0);
  });
  it('éducation réattribuée au père : 4 + 0 pour la mère, 4 pour le père', () => {
    const attributions = [
      { family_link_id: 'a', maternite_adoption_client: null, education_client: 0, regime_attribution: null, bonification_fp: false },
    ];
    expect(trimestresEnfants({ ...base, attributions }).rg).toBe(4);
    expect(trimestresEnfants({ ...base, attributions, personne: 'conjoint' }).rg).toBe(4);
  });
  it('éducation acquise année par année : enfant de 2 ans → 4 + 2', () => {
    const r = trimestresEnfants({ ...base, familyLinks: [enfant('a', '2038-01-01')] });
    expect(r.rg).toBe(6);
  });
  it('enfant né après la date d’effet ou sans date : non compté', () => {
    expect(trimestresEnfants({ ...base, familyLinks: [enfant('a', '2041-01-01')] }).rg).toBe(0);
  });
  it('moins de 8 trimestres tous régimes : maternité seulement', () => {
    expect(trimestresEnfants({ ...base, dureeTousRegimesHorsMDA: 4 }).rg).toBe(4);
  });
  it('enfant du seul conjoint : rien pour l’utilisateur, tout pour le conjoint même père', () => {
    const familyLinks = [enfant('a', '2012-05-01', { parent_de: 'spouse' })];
    expect(trimestresEnfants({ ...base, familyLinks }).rg).toBe(0);
    expect(trimestresEnfants({ ...base, familyLinks, personne: 'conjoint' }).rg).toBe(8);
  });
  it('civilités inconnues, naissance : non attribué et signalé', () => {
    const r = trimestresEnfants({ ...base, civiliteUtilisateur: null, civiliteConjoint: null });
    expect(r.rg).toBe(0);
    expect(r.detail[0].avertissements.length).toBeGreaterThan(0);
  });
  it('couple sans mère identifiable, adoption : moitié-moitié', () => {
    const familyLinks = [enfant('a', '2012-05-01', { enfant_adopte: 'Adoption plénière' })];
    const r = trimestresEnfants({ ...base, familyLinks, civiliteUtilisateur: 'M.', civiliteConjoint: 'M.' });
    expect(r.rg).toBe(4);
  });
  it('avant le 1er avril 2010, éducation au père : avertissement', () => {
    const attributions = [
      { family_link_id: 'a', maternite_adoption_client: null, education_client: 0, regime_attribution: null, bonification_fp: false },
    ];
    const r = trimestresEnfants({ ...base, familyLinks: [enfant('a', '2005-05-01')], attributions });
    expect(r.detail[0].avertissements.some((m) => m.includes('élevé seul'))).toBe(true);
  });
  it('déjà au RIS : rien ajouté, surcote parentale ouverte', () => {
    const r = trimestresEnfants({ ...base, mdaDejaAuRis: true });
    expect(r.total).toBe(0);
    expect(r.auMoinsUn).toBe(true);
  });
});

describe('trimestresEnfants — régime d’attribution', () => {
  it('CNAVPL seule : comptés à la CNAVPL', () => {
    const r = trimestresEnfants({ ...base, droits: { rg: false, fp: false, cnavpl: true } });
    expect(r.cnavpl).toBe(8);
    expect(r.rg).toBe(0);
  });
  it('FP, enfant né depuis 2004 : 2 trimestres de durée à la mère', () => {
    const r = trimestresEnfants({ ...base, droits: { rg: false, fp: true, cnavpl: false } });
    expect(r.fpMajorationDuree).toBe(2);
    expect(trimestresEnfants({ ...base, personne: 'conjoint', droits: { rg: false, fp: true, cnavpl: false } }).total).toBe(0);
  });
  it('FP, enfant né avant 2004 : bonification de 4 trimestres seulement si cochée', () => {
    const familyLinks = [enfant('a', '2001-05-01')];
    const droits = { rg: false, fp: true, cnavpl: false };
    expect(trimestresEnfants({ ...base, familyLinks, droits }).fpBonification).toBe(0);
    const attributions = [
      { family_link_id: 'a', maternite_adoption_client: null, education_client: null, regime_attribution: null, bonification_fp: true },
    ];
    expect(trimestresEnfants({ ...base, familyLinks, droits, attributions }).fpBonification).toBe(4);
  });
  it('régime saisi prioritaire sur le défaut', () => {
    const attributions = [
      { family_link_id: 'a', maternite_adoption_client: null, education_client: null, regime_attribution: 'cnavpl', bonification_fp: false },
    ];
    expect(trimestresEnfants({ ...base, attributions }).cnavpl).toBe(8);
  });
});

describe('liensFamiliauxDeLaPersonne', () => {
  it('garde les enfants communs et ceux de la personne', () => {
    const liens = [
      enfant('a', '2010-01-01'),
      enfant('b', '2010-01-01', { parent_de: 'spouse' }),
      enfant('c', '2010-01-01', { parent_de: 'user' }),
    ];
    expect(liensFamiliauxDeLaPersonne(liens, 'utilisateur').map((l) => l.id)).toEqual(['a', 'c']);
    expect(liensFamiliauxDeLaPersonne(liens, 'conjoint').map((l) => l.id)).toEqual(['a', 'b']);
  });
});

describe('calculerPensionConsolidee — effet des MDA', () => {
  const entree: EntreePensionConsolidee = {
    salaireAnnuelMoyen: 30000,
    trimestresValides: 160,
    trimestresRequis: 172,
    dateNaissance: { annee: 1990, mois: 6 },
    dateEffet: new Date(Date.UTC(2054, 6, 1)),
    regimesPoints: [],
    detailCarriere: [],
    familyLinks: [],
    auMoinsUnTrimestreMajorationEnfant: false,
    autresPensionsMensuelles: 0,
    fonctionPublique: null,
    cnavpl: null,
  };
  const mda = { ...AUCUN_TRIMESTRE_ENFANT, rg: 8, total: 8, auMoinsUn: true };

  it('MDA RG : trimestres validés, décote réduite de 8 trimestres', () => {
    const sans = calculerPensionConsolidee(entree);
    const avec = calculerPensionConsolidee({ ...entree, trimestresEnfants: mda });
    expect(avec.assietteReversion.trimestresRegimeGeneral).toBe(168);
    expect(avec.detailRegimeGeneral.decote - sans.detailRegimeGeneral.decote).toBeCloseTo(10, 6);
    expect(avec.trimestresEnfants.rg).toBe(8);
  });
});

describe('tauxProratisationFonctionPublique — bonifications jusqu’à 80 %', () => {
  it('sans bonification : plafonné à la durée requise', () => {
    expect(tauxProratisationFonctionPublique({ trimestresLiquidables: 180 }, 172)).toBe(1);
  });
  it('avec bonification : au-delà de 75 %, plafonné à 80 %', () => {
    expect(tauxProratisationFonctionPublique({ trimestresLiquidables: 172, bonificationEnfants: 4 }, 172)).toBeCloseTo(176 / 172, 6);
    expect(tauxProratisationFonctionPublique({ trimestresLiquidables: 172, bonificationEnfants: 40 }, 172)).toBeCloseTo(80 / 75, 6);
  });
});
