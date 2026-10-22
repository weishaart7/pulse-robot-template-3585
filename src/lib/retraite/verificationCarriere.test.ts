import { describe, it, expect } from 'vitest';
import { detecterAnomalies, estimerGains, appliquerCorrection, ContexteVerification } from './verificationCarriere';
import { PeriodeCarriere } from './parseRIS';
import { EntreePensionConsolidee } from './pensionConsolidee';
import { pointsAgircArrcoAnnuels } from './calculAgircArrco';
import { pointsAnnuelsCaisse } from './calculCaissesPoints';
import { PARAMETRES_CAISSES_POINTS } from './parametres';
import { AUCUN_TRIMESTRE_ENFANT, TrimestresEnfantsParRegime } from './trimestresEnfants';

const periode = (p: Partial<PeriodeCarriere> & Pick<PeriodeCarriere, 'dateDebut' | 'dateFin'>): PeriodeCarriere => ({
  employeur: 'ACME',
  typeActivite: 'employeur',
  revenu: 40000,
  estChiffreAffaires: false,
  regimes: ["L'Assurance retraite"],
  ...p,
});
const annee = (a: number, p: Partial<PeriodeCarriere> = {}) =>
  periode({ dateDebut: `${a}-01-01`, dateFin: `${a}-12-31`, ...p });
const avecArrco = (a: number) => [annee(a), annee(a, { regimes: ['Agirc-Arrco'] })];

const ctx = (periodes: PeriodeCarriere[], extra: Partial<ContexteVerification> = {}): ContexteVerification => ({
  periodes,
  trimestresRISRegimeGeneral: 0,
  historique: { total: 0, parAnnee: [] },
  trimestresEnfants: AUCUN_TRIMESTRE_ENFANT,
  mdaDejaAuRis: false,
  ...extra,
});
const types = (r: ReturnType<typeof detecterAnomalies>) => r.map((a) => a.type);

describe('detecterAnomalies', () => {
  it('carrière complète, Agirc-Arrco sur une ligne séparée : aucune anomalie', () => {
    expect(detecterAnomalies(ctx([...avecArrco(2018), ...avecArrco(2019), ...avecArrco(2020)]))).toEqual([]);
  });
  it('année sans aucune période entre deux années renseignées : 4 trimestres à justifier', () => {
    const r = detecterAnomalies(ctx([...avecArrco(2018), ...avecArrco(2020)]));
    expect(types(r)).toEqual(['annee_manquante']);
    expect(r[0].annees).toEqual([2019]);
    expect(r[0].correction.trimestres).toBe(4);
  });
  it('total RIS inférieur au total recalculé : écart en trimestres', () => {
    const r = detecterAnomalies(
      ctx(avecArrco(2020), {
        trimestresRISRegimeGeneral: 10,
        historique: { total: 12, parAnnee: [{ annee: 2019, cotises: 4 }, { annee: 2020, cotises: 2 }] },
      })
    );
    expect(types(r)).toEqual(['trimestres_sous_comptes']);
    expect(r[0].correction.trimestres).toBe(2);
    expect(r[0].annees).toEqual([2019]);
  });
  it('salarié sans ligne Agirc-Arrco : points estimés sur le salaire de l’année', () => {
    const r = detecterAnomalies(ctx([...avecArrco(2019), annee(2020)]));
    expect(types(r)).toEqual(['agirc_arrco_absent']);
    expect(r[0].correction.pointsAgircArrco).toBeCloseTo(pointsAgircArrcoAnnuels(40000), 6);
  });
  it('contractuel avec ligne Ircantec : pas d’anomalie Agirc-Arrco', () => {
    expect(detecterAnomalies(ctx([annee(2020), annee(2020, { regimes: ['Ircantec'] })]))).toEqual([]);
  });
  it('salarié avant 1962 : pas de contrôle Agirc-Arrco', () => {
    expect(types(detecterAnomalies(ctx([annee(1960)])))).toEqual([]);
  });
  it('indépendant sans ligne RCI ; avec RCI : rien', () => {
    const artisan = annee(2020, { employeur: 'ARTISAN', regimes: ["L'Assurance retraite"] });
    const r = detecterAnomalies(ctx([artisan]));
    expect(types(r)).toEqual(['rci_absent']);
    expect(r[0].correction.pointsRCI).toBeCloseTo(pointsAnnuelsCaisse(PARAMETRES_CAISSES_POINTS.rci, 40000), 6);
    expect(detecterAnomalies(ctx([{ ...artisan, regimes: ["L'Assurance retraite", 'RCI'] }]))).toEqual([]);
  });
  it('chômage indemnisé sans points : estimé sur le salaire de l’année précédente, au prorata', () => {
    const chomage = periode({
      employeur: 'CHOMAGE',
      typeActivite: 'chomage',
      revenu: null,
      regimes: ["L'Assurance retraite"],
      dateDebut: '2020-01-01',
      dateFin: '2020-06-30',
    });
    const r = detecterAnomalies(ctx([...avecArrco(2019), chomage]));
    expect(types(r)).toEqual(['chomage_sans_points']);
    expect(r[0].correction.pointsAgircArrco).toBeCloseTo(pointsAgircArrcoAnnuels(40000) * (182 / 365.25), 3);
  });
  it('trimestres enfants non reportés au RIS : signalés, sauf si déjà comptés', () => {
    const enfants: TrimestresEnfantsParRegime = { ...AUCUN_TRIMESTRE_ENFANT, total: 8 };
    expect(types(detecterAnomalies(ctx(avecArrco(2020), { trimestresEnfants: enfants })))).toEqual(['trimestres_enfants']);
    expect(detecterAnomalies(ctx(avecArrco(2020), { trimestresEnfants: enfants, mdaDejaAuRis: true }))).toEqual([]);
  });
});

const entree: EntreePensionConsolidee = {
  salaireAnnuelMoyen: 30000,
  trimestresValides: 160,
  trimestresRequis: 172,
  dateNaissance: { annee: 1990, mois: 6 },
  dateEffet: new Date(Date.UTC(2054, 6, 1)),
  regimesPoints: [{ nom: 'Agirc-Arrco', type: 'points', points: 5000 }],
  detailCarriere: [],
  familyLinks: [],
  auMoinsUnTrimestreMajorationEnfant: false,
  autresPensionsMensuelles: 0,
  fonctionPublique: null,
  cnavpl: null,
};

describe('estimerGains', () => {
  it('appliquerCorrection ajoute trimestres et points (régime RCI créé s’il manque)', () => {
    const e = appliquerCorrection(entree, { trimestres: 4, pointsAgircArrco: 100, pointsRCI: 50 });
    expect(e.trimestresValides).toBe(164);
    expect(e.regimesPoints.find((r) => r.nom === 'Agirc-Arrco')!.points).toBe(5100);
    expect(e.regimesPoints.find((r) => r.nom === 'RCI')!.points).toBe(50);
  });
  it('gain positif par correction ; total avec effet de seuil supérieur à la somme', () => {
    const anomalies = [
      { type: 'annee_manquante' as const, annees: [2019], libelle: '', correction: { trimestres: 6 }, estimation: true, aJustifier: true },
      { type: 'annee_manquante' as const, annees: [2018], libelle: '', correction: { trimestres: 6 }, estimation: true, aJustifier: true },
    ];
    const r = estimerGains(entree, anomalies);
    expect(r.anomalies[0].gainMensuel).toBeGreaterThan(0);
    // 160 + 12 = 172 : taux plein atteint seulement avec les deux corrections.
    expect(r.gainMensuelTotal).toBeGreaterThan(r.anomalies[0].gainMensuel + r.anomalies[1].gainMensuel);
  });
  it('points Agirc-Arrco ajoutés : gain = points × valeur du point ÷ 12 (taux plein)', () => {
    const plein = { ...entree, trimestresValides: 172 };
    const r = estimerGains(plein, [
      { type: 'agirc_arrco_absent', annees: [2020], libelle: '', correction: { pointsAgircArrco: 120 }, estimation: true, aJustifier: true },
    ]);
    expect(r.anomalies[0].gainMensuel).toBeGreaterThan(0);
    expect(r.gainMensuelTotal).toBeCloseTo(r.anomalies[0].gainMensuel, 6);
  });
  it('trimestres enfants : gain mesuré mais hors du total (déjà dans la pension estimée)', () => {
    const avecEnfants = { ...entree, trimestresEnfants: { ...AUCUN_TRIMESTRE_ENFANT, rg: 8, total: 8 } };
    const r = estimerGains(avecEnfants, [
      { type: 'trimestres_enfants', annees: [], libelle: '', correction: { retirerTrimestresEnfants: true }, estimation: false, aJustifier: true },
    ]);
    expect(r.gainMensuelTotal).toBe(0);
  });
});
