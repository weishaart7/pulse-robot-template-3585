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
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';

export const PatrimoineActifs = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets();
  const navigate = useNavigate();

  const syncSocieteFromAsset = async (savedAsset: Asset) => {
    if (!savedAsset?.id) return;
    if (!isSocieteEligibleNature(savedAsset.nature)) return;
    if (!savedAsset.transfert_societe) return;
    if (savedAsset.societe_id) return; // déjà lié

    try {
      const created = await societeService.create({
        denomination: savedAsset.denomination || savedAsset.nature,
        type_societe: natureToTypeSociete(savedAsset.nature),
        valeur_estimee: savedAsset.valeur_estimee ?? undefined,
        pourcentage_utilisateur: savedAsset.pourcentage_utilisateur ?? undefined,
        pourcentage_conjoint: savedAsset.pourcentage_conjoint ?? undefined,
      } as any);
      await assetService.updateAsset(savedAsset.id, { societe_id: created.id } as any);
      toast.success(`Une société ${created.denomination} a été créée automatiquement`, {
        action: {
          label: 'Voir la fiche société',
          onClick: () => navigate(`/societes/form?id=${created.id}`),
        },
      });
    } catch (err) {
      console.error('Auto-création société depuis actif échouée:', err);
    }
  };

  const syncValorisationFromAsset = async (savedAsset: Asset, previousValeurEstimee: number | undefined) => {
    if (savedAsset.valeur_estimee === undefined || savedAsset.valeur_estimee === null) return;
    if (previousValeurEstimee === savedAsset.valeur_estimee) return; // pas de changement, pas de ligne

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await assetValorisationService.upsertForDate(savedAsset.id!, today, savedAsset.valeur_estimee);
    } catch (err) {
      console.error('Alimentation historique de valorisation échouée:', err);
    }
  };

  const handleAssetSubmit = async (assetData: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[]) => {
    try {
      const previousValeurEstimee = editingAsset?.valeur_estimee;
      let savedAsset;
      if (editingAsset) {
        savedAsset = await updateAsset(editingAsset.id!, assetData);
      } else {
        savedAsset = await createAsset(assetData);
      }

      // Alimentation automatique de l'historique de valorisation si la valeur a changé
      await syncValorisationFromAsset(savedAsset as Asset, previousValeurEstimee);

      // Save charges for the asset
      if (charges.length > 0) {
        await Promise.all(
          charges.map(charge => {
            const chargeData = {
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
      }

      // Sauvegarde des co-indivisaires (remplace l'ensemble existant pour cet actif)
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

      // Création/lien automatique d'une société si applicable
      await syncSocieteFromAsset(savedAsset as Asset);

      setShowAssetForm(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error saving asset:', error);
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