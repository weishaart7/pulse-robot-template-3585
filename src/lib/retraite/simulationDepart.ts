/**
 * Simulation d'un départ à une date d'effet donnée, tous régimes — extraite
 * de `Trimestres.tsx` (phase 6a de l'audit Retraite, 2026-09-29) pour être
 * partagée par l'onglet Optimisation et le moteur de décision
 * (`decisionDepart.ts`). Fonctions pures, aucune règle modifiée par
 * l'extraction.
 *
 * Diffère de `calculerPensionConsolidee()` (scénario « départ à l'âge légal »
 * de Carrière/Synthèse) : date d'effet libre, trimestres futurs supposés
 * cotisés pour la surcote, départs anticipés (carrière longue, départ
 * confirmé par la caisse), pas de MICO ni de majoration enfants au régime
 * général (décision produit documentée, docs/retraite.md §3).
 */

import {
  DateNaissance,
  ageEnMois,
  ageLegalPourGeneration,
  ageLegalAtteint,
  ageLegalParentaleEligible,
  dateAnniversaireLegal,
  dateEffetDepartAgeLegal,
  decoteApplicable,
  decoteSurAge,
  decoteSurTrimestres,
  pensionBase,
  pensionComplementaireAnnuelle,
  surcoteParentale,
  surcotePourTrimestresCotises,
  surcoteTotale,
  tauxProratisation,
  trimestresRequisPourGeneration,
  trimestresSurcoteClassique,
} from './calcul';
import { RegimeDetecte } from './parseRIS';
import { ResultatTrimestresCotisesEtAssimiles } from './calculTrimestres';
import { trimestresProjetesParAnnee } from './hypotheseRevenuFutur';
import {
  calculerResultatFonctionPublique,
  calculerResultatCNAVPL,
  DonneesFonctionPublique,
  DonneesCNAVPL,
} from './pensionConsolidee';
import {
  separerRegimesPoints,
  pensionAgircArrco,
  pointsAgircArrcoAnnuels,
  coefficientAnticipationAgircArrco,
} from './calculAgircArrco';
import { evaluerCarriereLongue, carriereLongueOuverteA, ResultatCarriereLongue } from './calculCarriereLongue';

export interface ContexteSimulationDepart {
  dateNaissance: DateNaissance;
  aujourdHui: Date;
  trimestresValidesActuels: number;
  salaireAnnuelMoyen: number;
  regimesPoints: RegimeDetecte[];
  auMoinsUnTrimestreMajorationEnfant: boolean;
  trimestresCarriere: ResultatTrimestresCotisesEtAssimiles;
  fonctionPublique: DonneesFonctionPublique | null;
  cnavpl: DonneesCNAVPL | null;
  nombreEnfantsEligibles: number;
  /** Salaire de projection des points Agirc-Arrco, `null` si inconnu. */
  salaireComplementaire: number | null;
  /** Âge d'ouverture d'un départ anticipé confirmé par la caisse, `null` sinon. */
  ageDepartAnticipeConfirme: number | null;
}

export type MotifDepartAnticipe = 'carriere_longue' | 'confirme';

export interface ResultatSimulationDepart {
  dateEffet: Date;
  ageDepartAnnees: number;
  avantAgeLegal: boolean;
  departAnticipe: MotifDepartAnticipe | null;
  trimestresProjetes: number;
  trimestresValidesProjetes: number;
  trimestresTousRegimes: number;
  trimestresRequis: number;
  decote: number;
  surcoteTotalePct: number;
  pensionBaseBrute: number;
  pensionBaseValue: number;
  pensionComplementaires: number;
  pensionAutresRegimes: number;
  rafpCapital: number;
  pensionTotale: number;
}

export interface SimulateurDepart {
  carriereLongue: ResultatCarriereLongue;
  dateEffetDepartConfirme: Date | null;
  dateEffetAgeLegal: Date | null;
  /** Première date de départ possible (âge légal ou départ anticipé), au plus tôt le mois prochain. */
  dateDepartAuPlusTot: Date | null;
  departAnticipeOuvertA: (dateEffet: Date) => MotifDepartAnticipe | null;
  trimestresProjetesJusqua: (dateEffet: Date) => number;
  complementairesPourDepart: (
    decoteBase: number,
    ageDepartAnnees: number,
    trimestresManquants: number,
    trimestresProjetes: number
  ) => number;
  simuler: (dateEffet: Date) => ResultatSimulationDepart;
}

const premierJourMoisSuivant = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

export function creerSimulateurDepart(ctx: ContexteSimulationDepart): SimulateurDepart {
  const { dateNaissance, aujourdHui, trimestresCarriere, fonctionPublique, cnavpl } = ctx;

  const trimestresAutresRegimes = (fonctionPublique?.trimestresLiquidables ?? 0) + (cnavpl?.trimestresCNAVPL ?? 0);
  const trimestresProjetesJusqua = (dateEffet: Date) =>
    trimestresProjetesParAnnee(trimestresCarriere.parAnnee, aujourdHui, dateEffet).reduce(
      (total, a) => total + a.trimestres,
      0
    );

  // Départs anticipés : carrière longue (calculée) et départ confirmé par la
  // caisse (saisi) — taux plein au régime général dans les deux cas.
  const carriereLongue = evaluerCarriereLongue({
    dateNaissance,
    trimestres: trimestresCarriere,
    trimestresAutresRegimes,
    trimestresProjetesJusqua,
    aujourdHui,
  });
  const dateEffetDepartConfirme =
    ctx.ageDepartAnticipeConfirme !== null
      ? (() => {
          const ans = Math.floor(ctx.ageDepartAnticipeConfirme!);
          return premierJourMoisSuivant(
            dateAnniversaireLegal(dateNaissance, { ans, mois: Math.round((ctx.ageDepartAnticipeConfirme! - ans) * 12) })
          );
        })()
      : null;
  const departAnticipeOuvertA = (dateEffet: Date): MotifDepartAnticipe | null =>
    dateEffetDepartConfirme && dateEffet.getTime() >= dateEffetDepartConfirme.getTime()
      ? 'confirme'
      : carriereLongueOuverteA(carriereLongue, dateEffet)
      ? 'carriere_longue'
      : null;

  const dateEffetAgeLegal = dateEffetDepartAgeLegal(dateNaissance, aujourdHui);
  const datesAuPlusTot = [dateEffetAgeLegal, carriereLongue.premiereDateEligible, dateEffetDepartConfirme].filter(
    (d): d is Date => d !== null
  );
  const moisProchain = premierJourMoisSuivant(aujourdHui);
  const dateDepartAuPlusTot =
    datesAuPlusTot.length > 0
      ? new Date(Math.max(moisProchain.getTime(), Math.min(...datesAuPlusTot.map((d) => d.getTime()))))
      : null;

  // Complémentaires : Agirc-Arrco (points acquis + projetés, coefficient
  // d'anticipation selon la décote de la base) + autres régimes à points.
  const { pointsAgircArrco, aUnRegimeAgircArrco, autresRegimes } = separerRegimesPoints(ctx.regimesPoints);
  const pensionAutresRegimesPoints = autresRegimes.reduce((total, regime) => {
    const pension = pensionComplementaireAnnuelle(regime);
    return pension !== undefined ? total + pension : total;
  }, 0);
  const complementairesPourDepart = (
    decoteBase: number,
    ageDepartAnnees: number,
    trimestresManquants: number,
    trimestresProjetes: number
  ): number => {
    if (!aUnRegimeAgircArrco) return pensionAutresRegimesPoints;
    const agirc = pensionAgircArrco({
      pointsAcquis: pointsAgircArrco,
      pointsProjetes:
        ctx.salaireComplementaire !== null
          ? (pointsAgircArrcoAnnuels(ctx.salaireComplementaire) * trimestresProjetes) / 4
          : 0,
      coefficientAnticipation: coefficientAnticipationAgircArrco(decoteBase < 0, ageDepartAnnees, trimestresManquants),
      nombreEnfantsEligibles: ctx.nombreEnfantsEligibles,
    });
    return agirc.pensionAnnuelle + pensionAutresRegimesPoints;
  };

  const simuler = (dateEffet: Date): ResultatSimulationDepart => {
    const ageDepartAnnees = ageEnMois(dateNaissance, dateEffet) / 12;
    const trimestresProjetes = trimestresProjetesJusqua(dateEffet);
    const trimestresValidesProjetes = ctx.trimestresValidesActuels + trimestresProjetes;
    const trimestresTousRegimes = trimestresValidesProjetes + trimestresAutresRegimes;
    const trimestresRequis = trimestresRequisPourGeneration(dateNaissance, dateEffet);
    const ageLegal = ageLegalPourGeneration(dateNaissance, dateEffet);

    // Avant le 1er du mois suivant l'anniversaire de l'âge légal : possible
    // seulement si un départ anticipé est ouvert à cette date.
    const departAnticipe = departAnticipeOuvertA(dateEffet);
    const avantAgeLegalBrut =
      ageLegal.stable &&
      dateEffet.getTime() < premierJourMoisSuivant(dateAnniversaireLegal(dateNaissance, ageLegal.age)).getTime();
    const avantAgeLegal = avantAgeLegalBrut && departAnticipe === null;
    const taux = tauxProratisation(trimestresValidesProjetes, trimestresRequis);

    // Décote : plus favorable des comptages durée tous régimes / âge, écrêtée
    // à 0 ; nulle en cas de départ anticipé (taux plein).
    const decote =
      departAnticipe !== null
        ? 0
        : Math.min(
            decoteApplicable(decoteSurTrimestres(trimestresTousRegimes, trimestresRequis), decoteSurAge(ageDepartAnnees)),
            0
          );

    // Surcote classique (trimestres cotisés après l'âge légal, trimestres
    // futurs supposés cotisés) et parentale, cumul additif (régime général).
    const dureeRequiseAtteinte = trimestresTousRegimes >= trimestresRequis;
    const trimestresSurcote = trimestresSurcoteClassique({
      parAnnee: trimestresCarriere.parAnnee,
      dateNaissance,
      dateEffet,
      trimestresTousRegimes,
      trimestresRequis,
      projeterDepuis: aujourdHui,
    });
    const anneeReferenceSurcoteParentale = ageLegal.stable
      ? dateAnniversaireLegal(dateNaissance, ageLegal.age).getUTCFullYear() - 1
      : null;
    const trimestresCotisesAnneeReferenceParentale =
      anneeReferenceSurcoteParentale !== null
        ? trimestresCarriere.parAnnee.find((a) => a.annee === anneeReferenceSurcoteParentale)?.cotises ?? 0
        : 0;
    const surcoteTotalePct = surcoteTotale(
      surcotePourTrimestresCotises(trimestresSurcote, ageLegalAtteint(dateNaissance, dateEffet), dureeRequiseAtteinte),
      surcoteParentale(
        ctx.auMoinsUnTrimestreMajorationEnfant,
        ageLegalParentaleEligible(dateNaissance, dateEffet),
        dureeRequiseAtteinte,
        trimestresCotisesAnneeReferenceParentale
      ),
      true
    );

    const pensionBaseBrute = pensionBase(ctx.salaireAnnuelMoyen, taux, 0);
    const pensionBaseValue = pensionBaseBrute * (1 + decote / 100) + pensionBaseBrute * (surcoteTotalePct / 100);

    const resultatFP = fonctionPublique
      ? calculerResultatFonctionPublique(
          fonctionPublique,
          trimestresRequis,
          trimestresValidesProjetes + (cnavpl?.trimestresCNAVPL ?? 0),
          dateNaissance,
          dateEffet,
          ctx.auMoinsUnTrimestreMajorationEnfant,
          ctx.nombreEnfantsEligibles
        )
      : { pensionFinale: 0, rafpAnnuelle: 0, rafpCapital: 0 };
    const resultatCNAVPL = cnavpl
      ? calculerResultatCNAVPL(
          cnavpl,
          trimestresRequis,
          trimestresValidesProjetes + (fonctionPublique?.trimestresLiquidables ?? 0),
          dateNaissance,
          dateEffet,
          ctx.auMoinsUnTrimestreMajorationEnfant,
          ctx.nombreEnfantsEligibles
        )
      : { pensionFinale: 0 };
    const pensionAutresRegimes = resultatFP.pensionFinale + resultatFP.rafpAnnuelle + resultatCNAVPL.pensionFinale;

    const pensionComplementaires = complementairesPourDepart(
      decote,
      ageDepartAnnees,
      trimestresRequis - trimestresTousRegimes,
      trimestresProjetes
    );

    return {
      dateEffet,
      ageDepartAnnees,
      avantAgeLegal,
      departAnticipe: avantAgeLegalBrut ? departAnticipe : null,
      trimestresProjetes,
      trimestresValidesProjetes,
      trimestresTousRegimes,
      trimestresRequis,
      decote,
      surcoteTotalePct,
      pensionBaseBrute,
      pensionBaseValue,
      pensionComplementaires,
      pensionAutresRegimes,
      rafpCapital: resultatFP.rafpCapital,
      pensionTotale: pensionBaseValue + pensionComplementaires + pensionAutresRegimes,
    };
  };

  return {
    carriereLongue,
    dateEffetDepartConfirme,
    dateEffetAgeLegal,
    dateDepartAuPlusTot,
    departAnticipeOuvertA,
    trimestresProjetesJusqua,
    complementairesPourDepart,
    simuler,
  };
}
