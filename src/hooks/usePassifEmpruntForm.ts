import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passifEmpruntSchema, PassifEmpruntFormValues, getDefaultPassifEmpruntValues } from '@/schemas/passifEmpruntSchema';
import { Emprunt, Passif } from '@/services/passifService';
import { Asset, assetService } from '@/services/assetService';
import { familyService } from '@/services/familyService';
import { mapDetenteurToDisplay, mapDetenteurToDb, FamilyInfo } from '@/lib/patrimoine/utils';
import { EMPRUNT_NATURES } from '@/constants/assetTypes';
import { useEmprunts, usePassifs } from '@/hooks/usePassifs';
import { qualifierBien, QualificationContext } from '@/lib/patrimoine/qualification';

export const isEmpruntRecord = (item: Emprunt | Passif): item is Emprunt => 'libelle' in item;

interface UsePassifEmpruntFormProps {
  item?: Emprunt | Passif;
  onSuccess: () => void;
}

export const usePassifEmpruntForm = ({ item, onSuccess }: UsePassifEmpruntFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [detenteurOptions, setDetenteurOptions] = useState<string[]>([]);
  const [familyData, setFamilyData] = useState<FamilyInfo>({ hasPartner: false });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maritalContext, setMaritalContext] = useState<Pick<QualificationContext, 'statutCouple' | 'regimeMatrimonial' | 'dateMariage' | 'conventionPacs'>>({});
  const [qualificationRaison, setQualificationRaison] = useState<string>('');
  const { createEmprunt, updateEmprunt } = useEmprunts();
  const { createPassif, updatePassif } = usePassifs();

  // Catégorie d'origine (pour restreindre le choix de nature en édition) ;
  // undefined en création, où la liste complète des natures est proposée.
  const originalIsEmprunt = item ? isEmpruntRecord(item) : undefined;

  const form = useForm<PassifEmpruntFormValues>({
    resolver: zodResolver(passifEmpruntSchema),
    defaultValues: getDefaultPassifEmpruntValues(),
  });

  // Load family data + assets list (pour le lien actif <-> emprunt)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [familyProfile, maritalStatus, assetsList] = await Promise.all([
          familyService.getFamilyProfile(),
          familyService.getMaritalStatus(),
          assetService.getAssets(),
        ]);

        const options: string[] = [];
        const familyInfo: FamilyInfo = { hasPartner: false, userFirstName: '', partnerFirstName: '' };

        if (familyProfile?.prenom) {
          options.push(familyProfile.prenom);
          familyInfo.userFirstName = familyProfile.prenom;
        }

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

        setDetenteurOptions(options);
        setFamilyData(familyInfo);
        setAssets(assetsList || []);
        setMaritalContext({
          statutCouple: maritalStatus?.statut_couple,
          regimeMatrimonial: maritalStatus?.regime_matrimonial,
          dateMariage: maritalStatus?.date_mariage,
          conventionPacs: maritalStatus?.convention_pacs,
        });
      } catch (error) {
        setDetenteurOptions(['Utilisateur']);
      }
    };

    loadData();
  }, []);

  // Update form when item or family data changes
  useEffect(() => {
    if (!familyData.userFirstName) return;

    if (item) {
      const isEmpruntItem = isEmpruntRecord(item);
      const displayDetenteur = mapDetenteurToDisplay(item.detenteur || '', familyData);

      form.reset({
        nature: item.nature,
        libelle: isEmpruntItem ? item.libelle : '',
        montant_du: !isEmpruntItem ? (item as Passif).montant_du : undefined,
        capital_restant_du: isEmpruntItem ? item.capital_restant_du : undefined,
        taux_interet: isEmpruntItem ? item.taux_interet : undefined,
        mensualite: isEmpruntItem ? item.mensualite : undefined,
        duree_restante: isEmpruntItem ? item.duree_restante : undefined,
        reporter_budget: isEmpruntItem ? (item.reporter_budget ?? false) : false,
        detenteur: displayDetenteur,
        pourcentage_utilisateur: item.pourcentage_utilisateur ?? 50,
        pourcentage_conjoint: item.pourcentage_conjoint ?? 50,
        qualification_bien: item.qualification_bien || undefined,
        qualification_auto: item.qualification_auto !== false,
        asset_id: isEmpruntItem ? (item.asset_id || undefined) : undefined,
        type_garantie: isEmpruntItem ? ((item.type_garantie as 'Aucune' | 'Caution' | 'Hypothèque' | 'Nantissement') || 'Aucune') : 'Aucune',
        assure: isEmpruntItem ? (item.assure || false) : false,
        quotite_assuree_utilisateur: isEmpruntItem ? item.quotite_assuree_utilisateur : undefined,
        quotite_assuree_conjoint: isEmpruntItem ? item.quotite_assuree_conjoint : undefined,
        capital_garanti_deces: isEmpruntItem ? item.capital_garanti_deces : undefined,
      });
    }
  }, [item, familyData, form]);

  // Préremplissage détenteur/quote-part depuis l'actif lié (point 2) — reste
  // modifiable ensuite, pas de verrouillage.
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name !== 'asset_id') return;
      const asset = assets.find((a) => a.id === value.asset_id);
      if (!asset) return;

      const displayDetenteur = mapDetenteurToDisplay(asset.detenteur || '', familyData);
      form.setValue('detenteur', displayDetenteur);
      form.setValue('pourcentage_utilisateur', asset.pourcentage_utilisateur ?? 50);
      form.setValue('pourcentage_conjoint', asset.pourcentage_conjoint ?? 50);
    });
    return () => subscription.unsubscribe();
  }, [form, assets, familyData]);

  // Auto-adjust percentages when detenteur changes
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
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, familyData]);

  // Auto-qualification propre/commun (même modèle que useAssetForm.ts) : une
  // dette n'a pas d'origine/date d'acquisition dans ce formulaire, donc
  // qualifierBien() ne s'appuie ici que sur le régime matrimonial et le
  // détenteur — reste correct pour une dette contractée pendant l'union
  // (présumée commune sous régime légal, propre sous séparation de biens).
  useEffect(() => {
    const watchedFields = ['detenteur', 'qualification_auto'];
    const recompute = (value: any) => {
      const { qualification, raison } = qualifierBien({
        statutCouple: maritalContext.statutCouple,
        regimeMatrimonial: maritalContext.regimeMatrimonial,
        dateMariage: maritalContext.dateMariage,
        conventionPacs: maritalContext.conventionPacs,
        detenteur: value.detenteur,
      });
      form.setValue('qualification_bien', qualification);
      setQualificationRaison(raison);
    };

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
  }, [form, maritalContext]);

  // "Le couple" (commun, 50/50 fixé par la loi) n'a de sens que si la
  // qualification n'est pas "Bien propre"/"Bien personnel" — même garde-fou
  // que useAssetForm.ts (cf. incident du 2026-07-18).
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

  const handleSubmit = async (values: PassifEmpruntFormValues) => {
    setIsLoading(true);
    try {
      const isEmpruntSubmit = EMPRUNT_NATURES.includes(values.nature);
      const dbDetenteur = values.detenteur ? mapDetenteurToDb(values.detenteur, familyData) : undefined;

      let finalUserPercentage = values.pourcentage_utilisateur;
      let finalSpousePercentage = values.pourcentage_conjoint;
      if (dbDetenteur === 'user') {
        finalUserPercentage = 100;
        finalSpousePercentage = 0;
      } else if (dbDetenteur === 'spouse') {
        finalUserPercentage = 0;
        finalSpousePercentage = 100;
      }

      if (isEmpruntSubmit) {
        const empruntData: any = {
          nature: values.nature,
          libelle: values.libelle || '',
          capital_restant_du: values.capital_restant_du,
          taux_interet: values.taux_interet,
          mensualite: values.mensualite,
          duree_restante: values.duree_restante,
          reporter_budget: values.reporter_budget ?? false,
          detenteur: dbDetenteur,
          pourcentage_utilisateur: finalUserPercentage,
          pourcentage_conjoint: finalSpousePercentage,
          qualification_bien: values.qualification_bien || null,
          qualification_auto: values.qualification_auto !== false,
          asset_id: values.asset_id || null,
          type_garantie: values.type_garantie || null,
          assure: values.assure ?? false,
          quotite_assuree_utilisateur: values.assure ? values.quotite_assuree_utilisateur : undefined,
          quotite_assuree_conjoint: values.assure ? values.quotite_assuree_conjoint : undefined,
          capital_garanti_deces: values.assure ? values.capital_garanti_deces : undefined,
        };

        if (item && isEmpruntRecord(item)) {
          await updateEmprunt(item.id, empruntData);
        } else {
          await createEmprunt(empruntData);
        }
      } else {
        const passifData: any = {
          nature: values.nature,
          montant_du: values.montant_du ?? 0,
          detenteur: dbDetenteur,
          pourcentage_utilisateur: finalUserPercentage,
          pourcentage_conjoint: finalSpousePercentage,
          qualification_bien: values.qualification_bien || null,
          qualification_auto: values.qualification_auto !== false,
        };

        if (item && !isEmpruntRecord(item)) {
          await updatePassif(item.id, passifData);
        } else {
          await createPassif(passifData);
        }
      }

      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    isLoading,
    detenteurOptions,
    familyData,
    assets,
    originalIsEmprunt,
    qualificationRaison,
    handleSubmit,
  };
};
