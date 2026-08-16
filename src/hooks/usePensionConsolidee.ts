import { useEffect, useState } from 'react';
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
} from '@/lib/retraite/calcul';

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

  const resultat = calculerPensionConsolidee({
    salaireAnnuelMoyen,
    trimestresValides,
    trimestresRequis,
    dateNaissance: dateNaissanceDetail,
    ageActuel,
    regimesPoints: data.regimes_points ?? [],
    detailCarriere: detailCarriere.map(({ id: _id, ...periode }) => periode),
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
