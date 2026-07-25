import { useMemo } from 'react';
import { useMaritalStatus, useFamilyLinks, useFamilyProfile } from '@/hooks/useFamilyData';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useLiberalites } from '@/hooks/useLiberalites';
import { useAVContracts } from '@/hooks/useAVContracts';
import { useSocietes } from '@/hooks/useSocietes';
import { usePatrimoineOriginaire } from '@/hooks/usePatrimoineOriginaire';
import { evaluerAlertes, AlerteContext } from '@/lib/alertes';

// Compose les hooks atomiques déjà utilisés ailleurs dans l'app (pas de
// nouvel appel Supabase, pas de réutilisation de TransmissionContext — trop
// lourd et scopé au calcul fiscal, cf. Chantier 4 Vague 0).
export function useAlertesConseil() {
  const { data: maritalStatus, loading: maritalLoading } = useMaritalStatus();
  const { data: familyProfile, loading: profileLoading } = useFamilyProfile();
  const { data: familyLinks, loading: familyLoading } = useFamilyLinks();
  const { assets, loading: assetsLoading } = useAssets();
  const { passifs, loading: passifsLoading } = usePassifs();
  const { emprunts, loading: empruntsLoading } = useEmprunts();
  const { liberalites, loading: liberalitesLoading } = useLiberalites();
  const { avContractsRaw, loading: avLoading } = useAVContracts(assets);
  const { societes, isLoading: societesLoading } = useSocietes();
  const { data: patrimoineOriginaire, loading: patrimoineOriginaireLoading } = usePatrimoineOriginaire();

  const loading =
    maritalLoading || profileLoading || familyLoading || assetsLoading || passifsLoading || empruntsLoading ||
    liberalitesLoading || avLoading || societesLoading || patrimoineOriginaireLoading;

  const alertes = useMemo(() => {
    if (loading) return [];

    // Estimation simple (pas le calcul fiscal-grade de src/lib/transmission),
    // suffisante pour un rappel de vigilance plutôt qu'un calcul exact.
    const patrimoineNet =
      assets.reduce((sum, a) => sum + (a.valeur_estimee || 0), 0) -
      passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0) -
      emprunts.reduce((sum, e) => sum + (e.capital_restant_du || 0), 0);

    const ctx: AlerteContext = {
      statutCouple: maritalStatus?.statut_couple,
      regimeMatrimonial: maritalStatus?.regime_matrimonial,
      dateMariage: maritalStatus?.date_mariage,
      datePacs: maritalStatus?.date_pacs,
      conventionPacs: maritalStatus?.convention_pacs,
      pasDeContratMariage: maritalStatus?.pas_de_contrat_mariage,
      clausesContrat: maritalStatus?.clauses_contrat,
      clientEstDirigeant: familyProfile?.est_dirigeant,
      conjointEstDirigeant: maritalStatus?.est_dirigeant_conjoint,
      clientResidenceFiscaleEtranger: familyProfile?.residence_fiscale_etranger,
      conjointResidenceFiscaleEtranger: maritalStatus?.residence_fiscale_etranger_conjoint,
      liberalites,
      avContracts: avContractsRaw,
      familyLinks,
      assets,
      emprunts,
      societes,
      patrimoineOriginaire,
      patrimoineNet,
    };

    return evaluerAlertes(ctx);
  }, [loading, maritalStatus, familyProfile, liberalites, avContractsRaw, familyLinks, assets, passifs, emprunts, societes, patrimoineOriginaire]);

  return { alertes, loading };
}
