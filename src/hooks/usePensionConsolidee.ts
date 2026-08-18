import { useMemo } from 'react';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { useProfilFamilialRetraite } from '@/hooks/useProfilFamilialRetraite';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';
import {
  calculerPensionConsolidee,
  ResultatPensionConsolidee,
} from '@/lib/retraite/pensionConsolidee';
import { trimestresRequisPourGeneration } from '@/lib/retraite/calcul';
import { calculerProjectionRevenuFutur } from '@/lib/retraite/hypotheseRevenuFutur';

export interface UsePensionConsolideeResult extends ResultatPensionConsolidee {
  loading: boolean;
  // Vrai dès que des données retraite ont été saisies pour cette personne
  // (salaire annuel moyen ou trimestres validés) — permet à l'appelant de
  // savoir s'il y a quelque chose de significatif à afficher, notamment pour
  // la colonne conjoint (cf. Synthese.tsx : n'afficher la carte conjoint que
  // si son profil retraite contient des données).
  aDesDonnees: boolean;
  // Trimestres requis/validés tous régimes — exposés pour la carte
  // "trimestres manquants" de Synthese.tsx, qui n'a pas besoin du montant de
  // pension mais a besoin de ces deux nombres (même périmètre "tous régimes"
  // que le calcul de décote/MICO ci-dessus, validé avec l'utilisateur).
  trimestresRequis: number;
  trimestresValidesTousRegimes: number;
}

/**
 * Pension consolidée tous régimes pour une personne (utilisateur ou
 * conjoint) — charge les mêmes sources que Carriere.tsx (retraite_data,
 * détail de carrière, date de naissance, liens familiaux) et applique le
 * même pipeline via pensionConsolidee.ts. Date de naissance/liens familiaux
 * partagés avec Carriere.tsx via useProfilFamilialRetraite() plutôt que
 * chargés séparément (cf. docs/audit/audit-pension-consolidation.md, étape 3
 * de la fusion).
 */
export const usePensionConsolidee = (personne: Personne = 'utilisateur'): UsePensionConsolideeResult => {
  const { data, loading: loadingRetraiteData } = useRetraiteData(personne);
  const { periodes: detailCarriere, loading: loadingCarriereDetail } = useCarriereDetail(personne);
  const { dateNaissanceDetail, dateNaissanceISO, familyLinks, loading: loadingProfil } =
    useProfilFamilialRetraite(personne);

  const loading = loadingRetraiteData || loadingCarriereDetail || loadingProfil;

  const trimestresRequis = dateNaissanceDetail
    ? trimestresRequisPourGeneration(dateNaissanceDetail, new Date())
    : 172;

  const ageActuel = computeAge(dateNaissanceISO);

  const salaireAnnuelMoyen = data.salaire_annuel_moyen ?? 0;
  const trimestresValides = data.trimestres_valides ?? 0;

  const detailCarriereSansId = useMemo(
    () => detailCarriere.map(({ id: _id, ...periode }) => periode),
    [detailCarriere]
  );

  // Hypothèse de revenu futur (cf. hypotheseRevenuFutur.ts) : complète les
  // années manquantes entre l'année en cours et l'âge légal réel par un
  // revenu hypothétique (dernière année connue du RIS annualisée, ou saisie
  // manuelle), pour estimer les trimestres futurs et la pension. Purement
  // additif — ne modifie jamais `data.trimestres_valides`/`salaire_annuel_moyen`
  // en base (cf. règle documentée dans Carriere.tsx : le RIS/l'hypothèse ne
  // sont jamais une source concurrente des totaux validés par le
  // conseiller), seulement l'estimation live retournée par ce hook. Même
  // fonction que Carriere.tsx (cf. docs/audit/audit-pension-consolidation.md,
  // étape 2 de la fusion) — glue extraite dans calculerProjectionRevenuFutur()
  // pour n'exister qu'à un seul endroit.
  const modeHypothese = data.mode_hypothese_revenu_futur ?? 'derniere_annee_connue';
  const { salaireAnnuelMoyenProjete, trimestresValidesProjetes: trimestresProjetes } = useMemo(
    () =>
      calculerProjectionRevenuFutur(
        dateNaissanceDetail,
        detailCarriereSansId,
        salaireAnnuelMoyen,
        modeHypothese,
        data.revenu_hypothese_manuel ?? null,
        new Date()
      ),
    [dateNaissanceDetail, detailCarriereSansId, salaireAnnuelMoyen, modeHypothese, data.revenu_hypothese_manuel]
  );

  const resultat = calculerPensionConsolidee({
    salaireAnnuelMoyen: salaireAnnuelMoyenProjete,
    trimestresValides: trimestresValides + trimestresProjetes,
    trimestresRequis,
    dateNaissance: dateNaissanceDetail,
    ageActuel,
    regimesPoints: data.regimes_points ?? [],
    detailCarriere: detailCarriereSansId,
    familyLinks,
    auMoinsUnTrimestreMajorationEnfant: data.au_moins_un_trimestre_majoration_enfant ?? false,
    autresPensionsMensuelles: data.autres_pensions_mensuelles ?? 0,
    fonctionPublique: data.has_fonction_publique
      ? {
          traitementIndiciaireBrut: data.traitement_indiciaire_brut ?? 0,
          trimestresLiquidables: data.trimestres_liquidables_fp ?? 0,
          pointsRAFP: data.points_rafp ?? 0,
          departAnticipeCategorieActive: data.depart_anticipe_categorie_active ?? false,
          ageDepartAnticipe: data.age_depart_anticipe,
          ageAnnulationDecote: data.age_annulation_decote,
          departPourInvalidite: data.depart_pour_invalidite ?? false,
          anneeOuvertureDroits: data.annee_ouverture_droits,
        }
      : null,
    cnavpl: data.has_cnavpl
      ? {
          trimestresCNAVPL: data.trimestres_cnavpl ?? 0,
          pointsCNAVPL: data.points_cnavpl ?? 0,
          valeurPointCNAVPL: data.valeur_point_cnavpl ?? 0,
        }
      : null,
  });

  const aDesDonnees = salaireAnnuelMoyen > 0 || trimestresValides > 0;

  const trimestresValidesTousRegimes =
    trimestresValides +
    trimestresProjetes +
    (data.has_fonction_publique ? data.trimestres_liquidables_fp ?? 0 : 0) +
    (data.has_cnavpl ? data.trimestres_cnavpl ?? 0 : 0);

  return {
    ...resultat,
    loading,
    aDesDonnees,
    trimestresRequis,
    trimestresValidesTousRegimes,
  };
};
