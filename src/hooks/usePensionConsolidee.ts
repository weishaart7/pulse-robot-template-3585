import { useEffect, useMemo, useState } from 'react';
import { useRetraiteData, Personne } from '@/hooks/useRetraiteData';
import { useCarriereDetail } from '@/hooks/useCarriereDetail';
import { familyService, FamilyLink } from '@/services/familyService';
import { computeAge } from '@/lib/patrimoine/bareme669CGI';
import {
  calculerPensionConsolidee,
  ResultatPensionConsolidee,
} from '@/lib/retraite/pensionConsolidee';
import {
  DateNaissance,
  dateNaissanceDepuisISO,
  trimestresRequisPourGeneration,
  ageLegalPourGeneration,
  dateAnniversaireLegal,
} from '@/lib/retraite/calcul';
import { trimestresCotisesEtAssimilesDepuisCarriere } from '@/lib/retraite/calculTrimestres';
import { calculerSAM } from '@/lib/retraite/calculSAM';
import {
  anneesManquantes,
  trimestresProjetesAnneesManquantes,
  periodesSynthetiquesAnneesManquantes,
  revenuAnnuelHypotheseDerniereAnneeConnue,
} from '@/lib/retraite/hypotheseRevenuFutur';

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
 * même pipeline via pensionConsolidee.ts.
 *
 * ⚠️ Cf. docs/audit/audit-retraite.md §5 : ce hook et Carriere.tsx chargent
 * et calculent en parallèle, pas encore fusionnés.
 */
export const usePensionConsolidee = (personne: Personne = 'utilisateur'): UsePensionConsolideeResult => {
  const { data, loading: loadingRetraiteData } = useRetraiteData(personne);
  const { periodes: detailCarriere, loading: loadingCarriereDetail } = useCarriereDetail(personne);

  const [dateNaissanceDetail, setDateNaissanceDetail] = useState<DateNaissance | null>(null);
  const [dateNaissanceISO, setDateNaissanceISO] = useState<string | null>(null);
  const [familyLinks, setFamilyLinks] = useState<FamilyLink[]>([]);
  const [loadingProfil, setLoadingProfil] = useState(true);

  useEffect(() => {
    const chargerDateNaissance = personne === 'conjoint'
      ? familyService.getMaritalStatus().then((statut) => statut?.date_naissance_conjoint ?? null)
      : familyService.getFamilyProfile().then((profil) => profil?.date_naissance ?? null);

    Promise.all([chargerDateNaissance, familyService.getFamilyLinks()])
      .then(([dateNaissance, liens]) => {
        if (dateNaissance) {
          setDateNaissanceDetail(dateNaissanceDepuisISO(dateNaissance));
          setDateNaissanceISO(dateNaissance);
        }
        setFamilyLinks(liens);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('Erreur lors du chargement du profil retraite:', error);
        }
      })
      .finally(() => setLoadingProfil(false));
  }, [personne]);

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
  // conseiller), seulement l'estimation live retournée par ce hook.
  const anneeLegaleResultat = dateNaissanceDetail
    ? ageLegalPourGeneration(dateNaissanceDetail, new Date())
    : null;
  const anneeRetraite =
    dateNaissanceDetail && anneeLegaleResultat?.stable
      ? dateAnniversaireLegal(dateNaissanceDetail, anneeLegaleResultat.age).getUTCFullYear()
      : null;
  const anneeCourante = new Date().getUTCFullYear();
  const anneesManquantesListe = useMemo(
    () => (anneeRetraite !== null ? anneesManquantes(anneeCourante, anneeRetraite) : []),
    [anneeCourante, anneeRetraite]
  );

  const resultatTrimestresPourHypothese = useMemo(
    () => trimestresCotisesEtAssimilesDepuisCarriere(detailCarriereSansId),
    [detailCarriereSansId]
  );
  const modeHypothese = data.mode_hypothese_revenu_futur ?? 'derniere_annee_connue';
  const revenuHypothese =
    modeHypothese === 'derniere_annee_connue'
      ? revenuAnnuelHypotheseDerniereAnneeConnue(resultatTrimestresPourHypothese.parAnnee)
      : data.revenu_hypothese_manuel ?? null;

  const projectionApplicable =
    revenuHypothese !== null && revenuHypothese > 0 && anneesManquantesListe.length > 0 && dateNaissanceDetail !== null;

  const trimestresProjetes = projectionApplicable ? trimestresProjetesAnneesManquantes(anneesManquantesListe) : 0;
  const salaireAnnuelMoyenProjete = useMemo(() => {
    if (!projectionApplicable || !dateNaissanceDetail) return salaireAnnuelMoyen;
    const periodesSynthetiques = periodesSynthetiquesAnneesManquantes(anneesManquantesListe, revenuHypothese!);
    return calculerSAM(
      [...detailCarriereSansId, ...periodesSynthetiques],
      dateNaissanceDetail.annee,
      undefined,
      anneeRetraite!
    ).sam;
  }, [projectionApplicable, dateNaissanceDetail, detailCarriereSansId, anneesManquantesListe, revenuHypothese, anneeRetraite, salaireAnnuelMoyen]);

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
    autresPensionsMensuelles: 0,
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
