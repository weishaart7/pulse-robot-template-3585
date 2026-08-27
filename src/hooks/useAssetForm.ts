import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { assetSchema, AssetFormValues, getDefaultAssetValues } from '@/schemas/assetSchema';
import { Asset, AssetCharge } from '@/services/assetService';
import { familyService } from '@/services/familyService';
import { mapDetenteurToDisplay, mapDetenteurToDb, getPartUtilisateurIndivisionTiers, FamilyInfo } from '@/lib/patrimoine/utils';
import { ASSET_CATEGORIES } from '@/constants/assetTypes';
import { qualifierBien } from '@/lib/patrimoine/qualification';
import { assetIndivisaireService, AssetIndivisaire } from '@/services/assetIndivisaireService';
import { IndivisaireDraft, draftsFromIndivisaires } from '@/components/assets/IndivisairesSection';
import { assetDemembrementService } from '@/services/assetDemembrementService';
import { DemembrementDraft, draftsFromDemembrements } from '@/components/assets/DemembrementSection';

// Types d'actifs qui nécessitent le champ "Établissement"
export const NATURES_WITH_ETABLISSEMENT = [
  'Objets numériques (NFT, etc.)',
  ...ASSET_CATEGORIES['épargne retraite et prévoyance'],
  ...ASSET_CATEGORIES['épargne et assurance-vie'],
  ...ASSET_CATEGORIES['épargne salariale'],
  ...ASSET_CATEGORIES['épargne bancaire / liquidités'],
  ...ASSET_CATEGORIES['valeurs mobilières et placements financiers']
];

interface UseAssetFormProps {
  asset?: Asset;
  onSubmit: (asset: AssetFormValues, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<any>;
}

export const useAssetForm = ({ asset, onSubmit }: UseAssetFormProps) => {
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<AssetCharge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detenteurOptions, setDetenteurOptions] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Array<{ id?: string; nom: string; prenom?: string; date_naissance?: string }>>([]);
  const [familyData, setFamilyData] = useState<FamilyInfo>({ hasPartner: false });
  const [maritalContext, setMaritalContext] = useState<{
    statutCouple?: string;
    regimeMatrimonial?: string;
    dateMariage?: string;
    conventionPacs?: string;
    datePacs?: string;
    societeAcquetsAssetIds?: string[];
    societeAcquetsResidencePrincipale?: boolean;
    extensionProprsParNature?: boolean;
  }>({});
  const [indivisaires, setIndivisaires] = useState<IndivisaireDraft[]>([]);
  const [demembrements, setDemembrements] = useState<DemembrementDraft[]>([]);
  const [qualificationRaison, setQualificationRaison] = useState<string | undefined>(undefined);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: getDefaultAssetValues()
  });

  // Load family data
  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const [familyProfile, maritalStatus, familyLinks] = await Promise.all([
          familyService.getFamilyProfile(),
          familyService.getMaritalStatus(),
          familyService.getFamilyLinks()
        ]);

        const options: string[] = [];
        const familyInfo: FamilyInfo = { hasPartner: false, userFirstName: '', partnerFirstName: '' };

        if (familyProfile?.prenom) {
          options.push(familyProfile.prenom);
          familyInfo.userFirstName = familyProfile.prenom;
        }
        familyInfo.userDateNaissance = familyProfile?.date_naissance;
        familyInfo.partnerDateNaissance = maritalStatus?.date_naissance_conjoint;

        const hasPartner = maritalStatus?.statut_couple &&
          ['Marié(e)', 'Pacsé(e)', 'Concubinage', 'MARIE', 'PACS', 'PACSE', 'CONCUBINAGE'].includes(maritalStatus.statut_couple) &&
          maritalStatus.prenom_conjoint;

        if (hasPartner) {
          options.push(maritalStatus.prenom_conjoint);
          familyInfo.hasPartner = true;
          familyInfo.partnerFirstName = maritalStatus.prenom_conjoint;
        }

        if (familyInfo.hasPartner) {
          options.push('Le couple');
        }

        // Toujours proposer "Indivision" comme option
        options.push('Indivision');

        setDetenteurOptions(options);
        setFamilyData(familyInfo);
        setFamilyMembers(familyLinks || []);
        const clausesContrat = maritalStatus?.clauses_contrat;
        const societeAcquets = clausesContrat?.societe_acquets;
        setMaritalContext({
          statutCouple: maritalStatus?.statut_couple,
          regimeMatrimonial: maritalStatus?.regime_matrimonial,
          dateMariage: maritalStatus?.date_mariage,
          conventionPacs: maritalStatus?.convention_pacs,
          datePacs: maritalStatus?.date_pacs,
          societeAcquetsAssetIds: societeAcquets?.selectedAssets,
          societeAcquetsResidencePrincipale: societeAcquets?.options?.residencePrincipale,
          extensionProprsParNature: clausesContrat?.extension_propres_par_nature?.enabled,
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Erreur lors du chargement des données familiales:', error);
        setDetenteurOptions(['Utilisateur']);
        toast.error('Impossible de charger les informations familiales, options limitées');
      }
    };

    loadFamilyData();
  }, []);

  // Load indivisaires when editing existing asset
  useEffect(() => {
    if (asset?.id) {
      assetIndivisaireService.getByAsset(asset.id)
        .then((rows) => setIndivisaires(draftsFromIndivisaires(rows)))
        .catch(() => {
          setIndivisaires([]);
          toast.error('Impossible de charger les co-indivisaires de cet actif');
        });
    }
  }, [asset?.id]);

  // Load démembrement (contrepartie usufruit/nue-propriété) when editing existing asset
  useEffect(() => {
    if (asset?.id) {
      assetDemembrementService.getByAsset(asset.id)
        .then((rows) => setDemembrements(draftsFromDemembrements(rows)))
        .catch(() => {
          setDemembrements([]);
          toast.error('Impossible de charger le démembrement de cet actif');
        });
    }
  }, [asset?.id]);

  // Update form when asset or family data changes
  useEffect(() => {
    if (asset && familyData.userFirstName) {
      const displayDetenteur = mapDetenteurToDisplay(asset.detenteur || '', familyData);

      let userPercentage = 50;
      let spousePercentage = 50;

      if (displayDetenteur === familyData.userFirstName || displayDetenteur === 'Vous') {
        userPercentage = 100;
        spousePercentage = 0;
      } else if (displayDetenteur === familyData.partnerFirstName || displayDetenteur === 'Conjoint') {
        userPercentage = 0;
        spousePercentage = 100;
      } else if (displayDetenteur === 'Le couple') {
        userPercentage = asset.pourcentage_utilisateur || 50;
        spousePercentage = asset.pourcentage_conjoint || 50;
      } else if (displayDetenteur === 'Indivision') {
        userPercentage = getPartUtilisateurIndivisionTiers(indivisaires);
        spousePercentage = 0;
      }

      form.reset({
        nature: asset.nature,
        denomination: asset.denomination || '',
        etablissement: asset.etablissement || '',
        mode_detention: asset.mode_detention || '',
        valeur_estimee: asset.valeur_estimee || undefined,
        date_estimation: asset.date_estimation ? new Date(asset.date_estimation) : undefined,
        detenteur: displayDetenteur,
        pourcentage_utilisateur: userPercentage,
        pourcentage_conjoint: spousePercentage,
        valeur_acquisition: asset.valeur_acquisition || undefined,
        frais_acquisition: asset.frais_acquisition || undefined,
        date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined,
        origine_actif: asset.origine_actif || ['Acquisition à titre onéreux'],
        situation_particuliere: asset.situation_particuliere || ['Non'],
        attachement_emotionnel: asset.attachement_emotionnel || 0,
        transfert_immobilier: asset.transfert_immobilier || false,
        transfert_societe: asset.transfert_societe ?? true,
        bien_etranger: asset.bien_etranger || false,
        qualification_bien: asset.qualification_bien || undefined,
        qualification_auto: asset.qualification_auto !== false,
        sous_type_per: asset.sous_type_per as AssetFormValues['sous_type_per'] || undefined,
        cto_multi_actifs: asset.cto_multi_actifs || false,
        cto_nature_sous_jacent: asset.cto_nature_sous_jacent || undefined,
        clause_entree_communaute: asset.clause_entree_communaute || false,
        clause_remploi: asset.clause_remploi || false,
        est_propre_par_nature: asset.est_propre_par_nature || false,
        financement_mixte_apport_propre: asset.financement_mixte_apport_propre ?? undefined,
        part_licitation_personnelle: asset.part_licitation_personnelle ?? undefined,
        licitation_acquereur: asset.licitation_acquereur ?? undefined,
      });
    }
    // `indivisaires` est chargé de façon asynchrone par l'effet précédent
    // (assetIndivisaireService.getByAsset) : cet effet doit se redéclencher
    // une fois cette liste disponible pour ne pas figer la part utilisateur
    // à sa valeur par défaut (100%, liste encore vide) le temps du chargement.
  }, [asset, familyData, form, indivisaires]);

  // Auto-qualification : recalcule la qualification quand auto et que les inputs changent
  useEffect(() => {
    const watchedFields = [
      'origine_actif', 'date_acquisition', 'detenteur', 'mode_detention', 'qualification_auto',
      'clause_entree_communaute', 'clause_remploi', 'est_propre_par_nature', 'nature',
      'financement_mixte_apport_propre', 'valeur_acquisition',
    ];
    const recompute = (value: any) => {
      const { qualification, raison } = qualifierBien({
        statutCouple: maritalContext.statutCouple,
        regimeMatrimonial: maritalContext.regimeMatrimonial,
        dateMariage: maritalContext.dateMariage,
        conventionPacs: maritalContext.conventionPacs,
        datePacs: maritalContext.datePacs,
        dateAcquisition: value.date_acquisition ? new Date(value.date_acquisition).toISOString() : undefined,
        origineActif: value.origine_actif as string[] | undefined,
        modeDetention: value.mode_detention,
        detenteur: value.detenteur,
        clauseEntreeCommunaute: value.clause_entree_communaute,
        clauseRemploi: value.clause_remploi,
        natureActif: value.nature,
        assetId: asset?.id,
        societeAcquetsAssetIds: maritalContext.societeAcquetsAssetIds,
        societeAcquetsResidencePrincipale: maritalContext.societeAcquetsResidencePrincipale,
        estPropreParNature: value.est_propre_par_nature,
        extensionProprsParNature: maritalContext.extensionProprsParNature,
        valeurAcquisition: value.valeur_acquisition,
        apportFondsPropres: value.financement_mixte_apport_propre,
      });
      form.setValue('qualification_bien', qualification);
      setQualificationRaison(raison);
    };

    // Calcule la raison dès le chargement initial (pas seulement au changement),
    // sans écraser une qualification définie manuellement.
    const initialValues = form.getValues();
    if (initialValues.qualification_auto !== false) {
      recompute(initialValues);
    }

    const subscription = form.watch((value, { name }) => {
      const autoOn = value.qualification_auto !== false;
      if (!autoOn) return;
      if (!watchedFields.includes(name || '')) return;
      recompute(value);
    });
    return () => subscription.unsubscribe();
  }, [form, maritalContext, asset?.id]);

  // Auto-adjust percentages when detenteur changes, and auto-set origine for NP
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'detenteur' && value.detenteur) {
        const detenteur = value.detenteur;

        if (detenteur === familyData.userFirstName || detenteur === 'Vous') {
          form.setValue('pourcentage_utilisateur', 100);
          form.setValue('pourcentage_conjoint', 0);
        } else if (detenteur === familyData.partnerFirstName || detenteur === 'Conjoint') {
          form.setValue('pourcentage_utilisateur', 0);
          form.setValue('pourcentage_conjoint', 100);
        } else if (detenteur === 'Le couple') {
          const currentUser = form.getValues('pourcentage_utilisateur');
          const currentSpouse = form.getValues('pourcentage_conjoint');
          if ((currentUser === 100 && currentSpouse === 0) || (currentUser === 0 && currentSpouse === 100)) {
            form.setValue('pourcentage_utilisateur', 50);
            form.setValue('pourcentage_conjoint', 50);
          }
        } else if (detenteur === 'Indivision') {
          form.setValue('pourcentage_utilisateur', getPartUtilisateurIndivisionTiers(indivisaires));
          form.setValue('pourcentage_conjoint', 0);
        }
      }

      // Auto-set origine to "Acquisition à titre gratuit" when NP is selected
      if (name === 'mode_detention' && value.mode_detention === 'Nue-propriété') {
        form.setValue('origine_actif', ['Acquisition à titre gratuit']);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, familyData, indivisaires]);

  // "Le couple" comme détenteur n'a de sens que pour un bien commun (50/50
  // fixé par la loi) — jamais pour "Bien propre"/"Bien personnel" (100/0
  // binaire, cf. getPartSuccessorale). La qualification peut basculer vers
  // "Bien propre" après coup (changement de régime matrimonial, origine
  // gratuite...) alors que "Le couple" était déjà sélectionné : on force
  // alors une resélection plutôt que de laisser cette combinaison invalide
  // en base (cf. incident du 2026-07-18 — pourcentages saisis mais
  // silencieusement ignorés par le calcul de succession).
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name !== 'qualification_bien') return;
      const invalidPourCouple = value.qualification_bien === 'Bien propre' || value.qualification_bien === 'Bien personnel';
      if (invalidPourCouple && value.detenteur === 'Le couple') {
        form.setValue('detenteur', '');
        form.setValue('pourcentage_utilisateur', undefined);
        form.setValue('pourcentage_conjoint', undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSubmit = async (values: AssetFormValues) => {
    setIsLoading(true);
    try {
      const dbDetenteur = mapDetenteurToDb(values.detenteur || '', familyData);

      let finalUserPercentage = values.pourcentage_utilisateur;
      let finalSpousePercentage = values.pourcentage_conjoint;

      if (dbDetenteur === 'user') {
        finalUserPercentage = 100;
        finalSpousePercentage = 0;
      } else if (dbDetenteur === 'spouse') {
        finalUserPercentage = 0;
        finalSpousePercentage = 100;
      } else if (dbDetenteur === 'common') {
        // Détention par le couple : la quote-part du conjoint est toujours le
        // complément à 100 de celle de l'utilisateur, jamais une valeur
        // indépendante — les deux colonnes ne peuvent donc pas diverger en
        // base (cf. getPourcentagesRepartition). En "Bien commun", la saisie
        // n'est pas proposée et le couple reste à 50/50, part de droit.
        const saisi = values.pourcentage_utilisateur;
        finalUserPercentage = saisi === undefined ? 50 : Math.min(100, Math.max(0, saisi));
        finalSpousePercentage = 100 - finalUserPercentage;
      } else if (dbDetenteur === 'Indivision') {
        // Source de vérité = la liste des co-indivisaires (asset_indivisaires),
        // pas la valeur du champ de formulaire (jamais éditable pour ce cas,
        // cf. AssetForm.tsx — aucun input rendu pour `detenteur === 'Indivision'`).
        finalUserPercentage = getPartUtilisateurIndivisionTiers(indivisaires);
        finalSpousePercentage = 0;
      }

      const dbValues = {
        ...values,
        detenteur: dbDetenteur,
        pourcentage_utilisateur: finalUserPercentage,
        pourcentage_conjoint: finalSpousePercentage,
        date_estimation: values.date_estimation ? format(values.date_estimation, 'yyyy-MM-dd') : null,
        date_acquisition: values.date_acquisition ? format(values.date_acquisition, 'yyyy-MM-dd') : null,
        // Convert empty strings to null for optional fields
        denomination: values.denomination || null,
        etablissement: values.etablissement || null,
        mode_detention: values.mode_detention || null,
      };

      const formattedValues = dbValues;

      const finalIndivisaires = dbDetenteur === 'Indivision' ? indivisaires : [];
      const finalDemembrements = ['Usufruit', 'Nue-propriété'].includes(values.mode_detention || '') ? demembrements : [];

      await onSubmit(formattedValues as any, charges, finalIndivisaires, finalDemembrements);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChargeSubmit = (chargeData: any) => {
    if (editingCharge) {
      setCharges(prev => prev.map(c => c.id === editingCharge.id ? { ...editingCharge, ...chargeData } : c));
      setEditingCharge(null);
    } else {
      const newCharge: AssetCharge = {
        id: `temp-${Date.now()}`,
        asset_id: asset?.id || '',
        ...chargeData
      };
      setCharges(prev => [...prev, newCharge]);
    }
    setShowChargeForm(false);
  };

  const handleChargeDelete = (chargeId: string) => {
    setCharges(prev => prev.filter(c => c.id !== chargeId));
  };

  const handleChargeEdit = (charge: AssetCharge) => {
    setEditingCharge(charge);
    setShowChargeForm(true);
  };

  return {
    form,
    charges,
    showChargeForm,
    setShowChargeForm,
    editingCharge,
    setEditingCharge,
    isLoading,
    detenteurOptions,
    familyMembers,
    familyData,
    maritalContext,
    indivisaires,
    setIndivisaires,
    demembrements,
    setDemembrements,
    qualificationRaison,
    handleSubmit,
    handleChargeSubmit,
    handleChargeDelete,
    handleChargeEdit
  };
};
