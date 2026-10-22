/**
 * Projection de la carrière future selon le statut actuel de la personne —
 * fonctions pures. Paramètres : bloc `projectionStatut` et millésime courant
 * de `params-retraite.json`.
 *
 * Règles validées le 2026-10-22 (phase 3.1) :
 * - Statut unique conservé jusqu'au départ (pas de changement de statut).
 * - Carrière continue : les trimestres projetés (`trimestresProjetes`, 4 par
 *   année civile, cf. hypotheseRevenuFutur.ts) vont au régime du statut.
 * - Régime général et alignés (salarié du privé, contractuel public,
 *   indépendant SSI, artiste-auteur) : trimestres et salaire annuel moyen
 *   projetés au régime général (comportement antérieur). Points Agirc-Arrco
 *   projetés pour le seul salarié du privé ; points RCI pour l'indépendant
 *   (moteur des caisses à points) ; points Ircantec pour le contractuel
 *   (même moteur) ; artiste (RAAP) non projeté.
 * - Fonctionnaire : trimestres liquidables FP ; points RAFP = 10 % des
 *   primes plafonnées à 20 % du TIB ÷ valeur d'acquisition, au prorata des
 *   trimestres projetés. TIB et primes suivent l'évolution des revenus
 *   (pension sur le TIB de la dernière année projetée).
 * - Libéral : trimestres CNAVPL ; points de base = 557 × min(revenu, PASS) ÷
 *   PASS + 25 × min(revenu, 5 PASS) ÷ 5 PASS par année (cotisation
 *   proportionnelle au revenu), au prorata des trimestres projetés.
 * - Avocat : trimestres CNBF (base forfaitaire) ; la complémentaire CNBF est
 *   projetée par le moteur des caisses à points (caisse `CNBF`).
 * - Le régime cible doit être renseigné (fonction publique, CNAVPL ou CNBF coché) :
 *   sinon la projection est perdue et `avertissement` le signale.
 */

import { TrajectoireRevenu, sommeSurAnneesProjetees, revenuFinDeProjection } from './hypotheseRevenuFutur';
import type { DonneesFonctionPublique, DonneesCNAVPL } from './pensionConsolidee';
import type { DonneesCNBF } from './calculCNBF';
import { MILLESIME_COURANT, PARAMETRES_PROJECTION_STATUT } from './parametres';

export type StatutActuel =
  | 'salarie_prive'
  | 'contractuel_public'
  | 'fonctionnaire'
  | 'liberal'
  | 'independant_ssi'
  | 'avocat_cnbf'
  | 'artiste_auteur';

export const LIBELLES_STATUT_ACTUEL: Record<StatutActuel, string> = {
  salarie_prive: 'Salarié du privé',
  contractuel_public: 'Contractuel de la fonction publique',
  fonctionnaire: 'Fonctionnaire (SRE, CNRACL)',
  liberal: 'Profession libérale (CNAVPL)',
  independant_ssi: 'Indépendant (SSI)',
  avocat_cnbf: 'Avocat (CNBF)',
  artiste_auteur: 'Artiste-auteur',
};

/** Libellé du revenu futur selon le statut. */
export const LIBELLES_REVENU_STATUT: Record<StatutActuel, string> = {
  salarie_prive: 'salaire brut annuel',
  contractuel_public: 'salaire brut annuel',
  fonctionnaire: 'traitement indiciaire brut annuel',
  liberal: 'bénéfice net annuel',
  independant_ssi: 'bénéfice net annuel',
  avocat_cnbf: 'bénéfice net annuel',
  artiste_auteur: 'revenus artistiques annuels',
};

export function statutActuelDepuisTexte(valeur: string | null | undefined): StatutActuel {
  return valeur && valeur in LIBELLES_STATUT_ACTUEL ? (valeur as StatutActuel) : 'salarie_prive';
}

/** Caisse complémentaire projetée : CNBF (avocat), RCI (indépendant), Ircantec (contractuel), caisse déclarée (libéral). */
export function caisseProjetee(statut: StatutActuel, caisseLiberale: string | null): string | null {
  if (statut === 'avocat_cnbf') return 'CNBF';
  if (statut === 'contractuel_public') return 'IRCANTEC';
  if (statut === 'independant_ssi') return 'RCI';
  return statut === 'liberal' ? caisseLiberale : null;
}

export function projeteAuRegimeGeneral(statut: StatutActuel): boolean {
  return (
    statut === 'salarie_prive' ||
    statut === 'contractuel_public' ||
    statut === 'independant_ssi' ||
    statut === 'artiste_auteur'
  );
}

/** Points RAFP acquis sur une année complète. */
export function pointsRAFPAnnuels(primesAnnuelles: number, traitementIndiciaireBrut: number): number {
  const { rafpTauxCotisationTotal, rafpPlafondPrimesEnPartDuTIB } = PARAMETRES_PROJECTION_STATUT;
  const assiette = Math.max(0, Math.min(primesAnnuelles, traitementIndiciaireBrut * rafpPlafondPrimesEnPartDuTIB));
  return (assiette * rafpTauxCotisationTotal) / MILLESIME_COURANT.rafpValeurAcquisitionPoint;
}

/** Points de base CNAVPL acquis sur une année complète (cotisation proportionnelle au revenu). */
export function pointsCNAVPLAnnuels(revenuAnnuel: number): number {
  if (revenuAnnuel <= 0) return 0;
  const { cnavplPointsMaxT1, cnavplPointsMaxT2, cnavplPlafondT2EnPass } = PARAMETRES_PROJECTION_STATUT;
  const pass = MILLESIME_COURANT.pass;
  const plafondT2 = cnavplPlafondT2EnPass * pass;
  return (
    (cnavplPointsMaxT1 * Math.min(revenuAnnuel, pass)) / pass +
    (cnavplPointsMaxT2 * Math.min(revenuAnnuel, plafondT2)) / plafondT2
  );
}

export interface EntreeProjectionStatut {
  statut: StatutActuel;
  /** Trimestres projetés jusqu'à la date d'effet (carrière continue). */
  trimestresProjetes: number;
  /** Revenu futur (sens selon le statut), `null` si inconnu. */
  revenuAnnuel: number | null;
  primesAnnuellesFP: number | null;
  /** Données RIS, sans projection. */
  trimestresValidesRG: number;
  salaireAnnuelMoyenRIS: number;
  /** Salaire annuel moyen recalculé avec les années projetées (régime général). */
  salaireAnnuelMoyenProjete: number;
  fonctionPublique: DonneesFonctionPublique | null;
  cnavpl: DonneesCNAVPL | null;
  cnbf?: DonneesCNBF | null;
  /** Évolution des revenus futurs (absente = revenu constant). */
  trajectoire?: TrajectoireRevenu;
}

export interface ResultatProjectionStatut {
  trimestresValidesRG: number;
  salaireAnnuelMoyen: number;
  fonctionPublique: DonneesFonctionPublique | null;
  cnavpl: DonneesCNAVPL | null;
  cnbf: DonneesCNBF | null;
  /** Points Agirc-Arrco futurs projetés (salarié du privé seulement). */
  projeterAgircArrco: boolean;
  /** Détail de ce qui a été projeté hors régime général, pour l'écran. */
  trimestresFPProjetes: number;
  pointsRAFPProjetes: number;
  trimestresCNAVPLProjetes: number;
  pointsCNAVPLProjetes: number;
  trimestresCNBFProjetes: number;
  /** Caisse complémentaire alimentée par la projection (libéral : caisse déclarée, avocat : CNBF). */
  trimestresCaisseProjetes: number;
  avertissement: string | null;
}

export function appliquerProjectionStatut(entree: EntreeProjectionStatut): ResultatProjectionStatut {
  const { statut, trimestresProjetes, revenuAnnuel, fonctionPublique, cnavpl } = entree;
  const sansProjection: ResultatProjectionStatut = {
    trimestresValidesRG: entree.trimestresValidesRG,
    salaireAnnuelMoyen: entree.salaireAnnuelMoyenRIS,
    fonctionPublique,
    cnavpl,
    cnbf: entree.cnbf ?? null,
    projeterAgircArrco: false,
    trimestresFPProjetes: 0,
    pointsRAFPProjetes: 0,
    trimestresCNAVPLProjetes: 0,
    pointsCNAVPLProjetes: 0,
    trimestresCNBFProjetes: 0,
    trimestresCaisseProjetes: 0,
    avertissement: null,
  };

  if (projeteAuRegimeGeneral(statut)) {
    return {
      ...sansProjection,
      trimestresValidesRG: entree.trimestresValidesRG + trimestresProjetes,
      salaireAnnuelMoyen: entree.salaireAnnuelMoyenProjete,
      projeterAgircArrco: statut === 'salarie_prive',
      // Indépendant (RCI) et contractuel (Ircantec) : points projetés sur les mêmes trimestres.
      trimestresCaisseProjetes:
        statut === 'independant_ssi' || statut === 'contractuel_public' ? trimestresProjetes : 0,
    };
  }
  if (trimestresProjetes <= 0) return sansProjection;

  if (statut === 'fonctionnaire') {
    if (!fonctionPublique) {
      return { ...sansProjection, avertissement: 'Statut fonctionnaire : renseignez la fonction publique pour projeter la carrière.' };
    }
    // Primes et TIB suivent l'évolution ; pension sur le TIB de la dernière année projetée.
    const tib = fonctionPublique.traitementIndiciaireBrut;
    const primes = entree.primesAnnuellesFP ?? 0;
    const pointsRAFPProjetes = sommeSurAnneesProjetees(trimestresProjetes, 1, entree.trajectoire, (facteur) =>
      pointsRAFPAnnuels(primes * facteur, tib * facteur)
    );
    return {
      ...sansProjection,
      fonctionPublique: {
        ...fonctionPublique,
        traitementIndiciaireBrut: revenuFinDeProjection(tib, trimestresProjetes, entree.trajectoire),
        trimestresLiquidables: fonctionPublique.trimestresLiquidables + trimestresProjetes,
        pointsRAFP: fonctionPublique.pointsRAFP + pointsRAFPProjetes,
      },
      trimestresFPProjetes: trimestresProjetes,
      pointsRAFPProjetes,
    };
  }
  if (statut === 'liberal') {
    if (!cnavpl) {
      return { ...sansProjection, avertissement: 'Statut libéral : renseignez la CNAVPL pour projeter la carrière.' };
    }
    const pointsCNAVPLProjetes = sommeSurAnneesProjetees(
      trimestresProjetes,
      revenuAnnuel ?? 0,
      entree.trajectoire,
      pointsCNAVPLAnnuels
    );
    return {
      ...sansProjection,
      cnavpl: {
        ...cnavpl,
        trimestresCNAVPL: cnavpl.trimestresCNAVPL + trimestresProjetes,
        pointsCNAVPL: cnavpl.pointsCNAVPL + pointsCNAVPLProjetes,
      },
      trimestresCNAVPLProjetes: trimestresProjetes,
      pointsCNAVPLProjetes,
      trimestresCaisseProjetes: trimestresProjetes,
    };
  }
  // avocat_cnbf
  if (!entree.cnbf) {
    return { ...sansProjection, avertissement: 'Statut avocat : renseignez la CNBF pour projeter la carrière.' };
  }
  return {
    ...sansProjection,
    cnbf: { ...entree.cnbf, trimestresCNBF: entree.cnbf.trimestresCNBF + trimestresProjetes },
    trimestresCNBFProjetes: trimestresProjetes,
    trimestresCaisseProjetes: trimestresProjetes,
  };
}
