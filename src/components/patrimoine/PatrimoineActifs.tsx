import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PatrimoineTreeView } from './PatrimoineTreeView';
import { AssetForm } from '@/components/assets/AssetForm';
import { Plus } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge, assetService } from '@/services/assetService';
import { societeService } from '@/services/societeService';
import { isSocieteEligibleNature, natureToTypeSociete } from '@/lib/patrimoine/societeTransfer';
import { assetIndivisaireService } from '@/services/assetIndivisaireService';
import { assetValorisationService } from '@/services/assetValorisationService';
import { assetDemembrementService } from '@/services/assetDemembrementService';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';

export const PatrimoineActifs = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets();
  const navigate = useNavigate();

  // Retourne true en cas de succès (ou si l'étape ne s'applique pas), false en cas d'échec.
  const syncSocieteFromAsset = async (savedAsset: Asset): Promise<boolean> => {
    if (!savedAsset?.id) return true;
    if (!isSocieteEligibleNature(savedAsset.nature)) return true;
    if (!savedAsset.transfert_societe) return true;
    if (savedAsset.societe_id) return true; // déjà lié

    try {
      const created = await societeService.create({
        denomination: savedAsset.denomination || savedAsset.nature,
        type_societe: natureToTypeSociete(savedAsset.nature),
        valeur_estimee: savedAsset.valeur_estimee ?? undefined,
        pourcentage_utilisateur: savedAsset.pourcentage_utilisateur ?? undefined,
        pourcentage_conjoint: savedAsset.pourcentage_conjoint ?? undefined,
      });
      await assetService.updateAsset(savedAsset.id, { societe_id: created.id });
      toast.success(`Une société ${created.denomination} a été créée automatiquement`, {
        action: {
          label: 'Voir la fiche société',
          onClick: () => navigate(`/societes/form?id=${created.id}`),
        },
      });
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Auto-création société depuis actif échouée:', err);
      return false;
    }
  };

  // Retourne true en cas de succès (ou si l'étape ne s'applique pas), false en cas d'échec.
  const syncValorisationFromAsset = async (savedAsset: Asset, previousValeurEstimee: number | undefined): Promise<boolean> => {
    if (savedAsset.valeur_estimee === undefined || savedAsset.valeur_estimee === null) return true;
    if (previousValeurEstimee === savedAsset.valeur_estimee) return true; // pas de changement, pas de ligne

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await assetValorisationService.upsertForDate(savedAsset.id!, today, savedAsset.valeur_estimee);
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.error('Alimentation historique de valorisation échouée:', err);
      return false;
    }
  };

  const handleAssetSubmit = async (assetData: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => {
    const previousValeurEstimee = editingAsset?.valeur_estimee;
    let savedAsset: Asset;

    // L'actif principal est la seule étape bloquante : si elle échoue, rien
    // n'a été enregistré et useAssets a déjà affiché un message d'erreur.
    try {
      savedAsset = editingAsset
        ? await updateAsset(editingAsset.id!, assetData, { silent: true })
        : await createAsset(assetData, { silent: true });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving asset:', error);
      return;
    }

    // Les étapes suivantes sont annexes : l'actif est déjà enregistré, donc
    // en cas d'échec on le conserve et on informe précisément l'utilisateur
    // de la ou des parties à vérifier, plutôt que de tout annuler.
    const stepErrors: string[] = [];

    const valorisationOk = await syncValorisationFromAsset(savedAsset, previousValeurEstimee);
    if (!valorisationOk) stepErrors.push("l'historique de valorisation n'a pas pu être mis à jour");

    if (charges.length > 0) {
      const results = await Promise.allSettled(
        charges.map(charge => {
          const chargeData: any = {
            ...charge,
            asset_id: savedAsset.id
          };

          // Remove temporary id for new charges
          if (charge.id?.startsWith('temp-')) {
            delete chargeData.id;
          }

          return charge.id?.startsWith('temp-')
            ? assetService.createAssetCharge(chargeData)
            : assetService.updateAssetCharge(charge.id!, chargeData);
        })
      );
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failed.length > 0) {
        if (import.meta.env.DEV) failed.forEach(f => console.error('Charge non enregistrée:', f.reason));
        stepErrors.push(
          failed.length > 1
            ? `${failed.length} charges n'ont pas pu être enregistrées`
            : "une charge n'a pas pu être enregistrée"
        );
      }
    }

    // Sauvegarde des co-indivisaires (remplace l'ensemble existant pour cet actif)
    try {
      await assetIndivisaireService.replaceForAsset(
        savedAsset.id!,
        indivisaires.map((i) => ({
          asset_id: savedAsset.id!,
          type_indivisaire: i.type_indivisaire,
          family_link_id: i.type_indivisaire === 'famille' ? i.family_link_id : null,
          nom_libre: i.type_indivisaire === 'tiers' ? i.nom_libre : null,
          pourcentage: i.pourcentage,
        }))
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error('Sauvegarde des co-indivisaires échouée:', error);
      stepErrors.push(
        error instanceof Error && error.message.includes('co-indivisaires')
          ? error.message
          : "la répartition des co-indivisaires n'a pas pu être enregistrée"
      );
    }

    // Sauvegarde de la contrepartie du démembrement (remplace l'ensemble existant pour cet actif)
    try {
      const demembrementRole: 'Usufruitier' | 'Nu-propriétaire' =
        savedAsset.mode_detention === 'Usufruit' ? 'Nu-propriétaire' : 'Usufruitier';
      await assetDemembrementService.replaceForAsset(
        savedAsset.id!,
        demembrements.map((d) => ({
          asset_id: savedAsset.id!,
          role: demembrementRole,
          type_partie: d.type_partie,
          family_link_id: d.type_partie === 'famille' ? d.family_link_id : null,
          nom_libre: d.type_partie === 'tiers' ? d.nom_libre : null,
          date_naissance_tiers: d.type_partie === 'tiers' ? d.date_naissance_tiers : null,
        }))
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error('Sauvegarde du démembrement échouée:', error);
      stepErrors.push("la contrepartie de démembrement n'a pas pu être enregistrée");
    }

    // Création/lien automatique d'une société si applicable
    const societeOk = await syncSocieteFromAsset(savedAsset);
    if (!societeOk) stepErrors.push("la société liée n'a pas pu être créée automatiquement");

    setShowAssetForm(false);
    setEditingAsset(null);

    if (stepErrors.length === 0) {
      toast.success(editingAsset ? 'Actif mis à jour avec succès' : 'Actif créé avec succès');
    } else {
      toast.error(
        `L'actif a bien été enregistré, mais : ${stepErrors.join(' ; ')}. Merci de rouvrir la fiche pour vérifier.`
      );
    }
  };

  if (showAssetForm) {
    return (
      <div className="space-y-6">
        <AssetForm
          asset={editingAsset || undefined}
          onSubmit={handleAssetSubmit}
          onCancel={() => {
            setShowAssetForm(false);
            setEditingAsset(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des actifs</h3>
        <Button onClick={() => setShowAssetForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un actif
        </Button>
      </div>
      
      <PatrimoineTreeView 
        assets={assets}
        onAssetEdit={(asset) => {
          setEditingAsset(asset);
          setShowAssetForm(true);
        }}
        onAssetDelete={(asset) => {
          if (asset.id) {
            deleteAsset(asset.id);
          }
        }}
      />
    </div>
  );
};