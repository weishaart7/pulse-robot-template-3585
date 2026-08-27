import { useMemo } from 'react';
import { useMaritalStatus, useFamilyLinks, useFamilyProfile } from '@/hooks/useFamilyData';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useLiberalites } from '@/hooks/useLiberalites';
import { useScenariosRegime } from '@/hooks/useScenariosRegime';
import { useAVContracts } from '@/hooks/useAVContracts';
import { useSocietes } from '@/hooks/useSocietes';
import { usePatrimoineOriginaire } from '@/hooks/usePatrimoineOriginaire';
import { evaluerAlertes, AlerteContext } from '@/lib/alertes';
import { hasNonCommonChildren, hasDDV } from '@/utils/transmissionHelpers';

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
  const { scenariosRegime, loading: scenariosRegimeLoading } = useScenariosRegime();
  const { avContractsRaw, loading: avLoading } = useAVContracts(assets);
  const { societes, isLoading: societesLoading } = useSocietes();
  const { data: patrimoineOriginaire, loading: patrimoineOriginaireLoading } = usePatrimoineOriginaire();

  const loading =
    maritalLoading || profileLoading || familyLoading || assetsLoading || passifsLoading || empruntsLoading ||
    liberalitesLoading || avLoading || societesLoading || patrimoineOriginaireLoading || scenariosRegimeLoading;

  const alertes = useMemo(() => {
    if (loading) return [];

    // Estimation simple (pas le calcul fiscal-grade de src/lib/transmission),
    // suffisante pour un rappel de vigilance plutôt qu'un calcul exact.
    const patrimoineNet =
      assets.reduce((sum, a) => sum + (a.valeur_estimee || 0), 0) -
      passifs.reduce((sum, p) => sum + (p.montant_du || 0), 0) -
      emprunts.filter(e => !e.societe_id).reduce((sum, e) => sum + (e.capital_restant_du || 0), 0);

    // regime_matrimonial / loi_applicable_regime / pays_premier_domicile_matrimonial
    // n'ont de sens que sous Marié(e) : ces champs ne sont jamais effacés en
    // changeant de statut (cf. RelationInfoForm.tsx), donc un ex-marié devenu
    // Pacsé/Concubin peut garder des valeurs périmées qui déclencheraient à
    // tort des alertes réservées au mariage.
    const estMarie = maritalStatus?.statut_couple === 'Marié(e)';

    const ctx: AlerteContext = {
      statutCouple: maritalStatus?.statut_couple,
      regimeMatrimonial: estMarie ? maritalStatus?.regime_matrimonial : undefined,
      dateMariage: maritalStatus?.date_mariage,
      datePacs: maritalStatus?.date_pacs,
      conventionPacs: maritalStatus?.convention_pacs,
      pasDeContratMariage: maritalStatus?.pas_de_contrat_mariage,
      clausesContrat: maritalStatus?.clauses_contrat,
      clientResidenceFiscaleEtranger: familyProfile?.residence_fiscale_etranger,
      conjointResidenceFiscaleEtranger: maritalStatus?.residence_fiscale_etranger_conjoint,
      loiApplicableRegime: estMarie ? maritalStatus?.loi_applicable_regime : undefined,
      paysPremierDomicileMatrimonial: estMarie ? maritalStatus?.pays_premier_domicile_matrimonial : undefined,
      liberalites,
      scenariosRegime: scenariosRegime.map((s) => ({
        id: s.id || '',
        type: s.type,
        regimeCible: s.regime_cible,
        date: s.date,
        motivationCivile: s.motivation_civile || undefined,
      })),
      avContracts: avContractsRaw,
      familyLinks,
      hasNonCommonChildren: hasNonCommonChildren(familyLinks),
      hasDDV: hasDDV(maritalStatus),
      assets,
      emprunts,
      societes,
      patrimoineOriginaire,
      patrimoineNet,
    };

    return evaluerAlertes(ctx);
  }, [loading, maritalStatus, familyProfile, liberalites, scenariosRegime, avContractsRaw, familyLinks, assets, passifs, emprunts, societes, patrimoineOriginaire]);

  return { alertes, loading };
}
