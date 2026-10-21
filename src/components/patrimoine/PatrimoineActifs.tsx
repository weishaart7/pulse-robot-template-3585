import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { societeService } from '@/services/societeService';
import { PatrimoinePanel } from './PatrimoinePanel';
import { AddButton } from '@/components/layout/workspace-panel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PatrimoineTreeView } from './PatrimoineTreeView';
import { AssetForm } from '@/components/assets/AssetForm';
import { AssetCreationWizard } from '@/components/assets/wizard/AssetCreationWizard';
import { Search } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { Asset, AssetCharge, assetService } from '@/services/assetService';
import { assetIndivisaireService } from '@/services/assetIndivisaireService';
import { assetValorisationService } from '@/services/assetValorisationService';
import { assetDemembrementService } from '@/services/assetDemembrementService';
import { IndivisaireDraft } from '@/components/assets/IndivisairesSection';
import { DemembrementDraft } from '@/components/assets/DemembrementSection';
import { AssetSaisieExtras } from '@/hooks/useAssetForm';
import { PassifEmpruntForm } from './PassifEmpruntForm';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { useEmprunts, usePassifs } from '@/hooks/usePassifs';

// Nature d'emprunt proposée pour le crédit d'un bien créé avec « Bien financé par un crédit ».
const natureEmpruntPour = (natureBien: string): string => {
  if (natureBien === 'Résidence principale') return 'Prêt immobilier (résidence principale)';
  if (natureBien === 'Résidences secondaires') return 'Prêt immobilier (résidences secondaires)';
  return 'Prêt immobilier locatif (investissement locatif)';
};

export const PatrimoineActifs = () => {
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets();
  const { emprunts, createEmprunt, updateEmprunt } = useEmprunts();
  const { createPassif, updatePassif } = usePassifs();
  // Bien créé avec « Bien financé par un crédit » : proposition, puis saisie de l'emprunt relié.
  const [creditAProposer, setCreditAProposer] = useState<Asset | null>(null);
  const [creditEnSaisie, setCreditEnSaisie] = useState<Asset | null>(null);
  // `?societe=<id>` (« Ajouter un bien » de la fiche société) : le bien créé est rattaché à cette
  // société (hors patrimoine direct), puis retour à sa fiche.
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const societeProprietaireId = searchParams.get('societe');
  const [societeProprietaire, setSocieteProprietaire] = useState<string | null>(null);
  useEffect(() => {
    if (!societeProprietaireId) return;
    setShowAssetForm(true);
    societeService.getById(societeProprietaireId).then((s) => setSocieteProprietaire(s.denomination)).catch(() => undefined);
  }, [societeProprietaireId]);
  const retourFicheSociete = () => navigate(`/dashboard/societes?fiche=${societeProprietaireId}&onglet=biens`);

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

  const handleAssetSubmit = async (assetData: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[], extras?: AssetSaisieExtras) => {
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
      return false;
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
      stepErrors.push(
        error instanceof Error && error.message.includes('membre de la famille')
          ? error.message
          : "la contrepartie de démembrement n'a pas pu être enregistrée"
      );
    }

    // Loyer saisi à la création : revenu du bien, mensuel, à partir d'aujourd'hui.
    if (!editingAsset && extras?.loyerMensuel) {
      try {
        await assetService.createAssetRevenu({
          asset_id: savedAsset.id!,
          nature: 'Loyers hors charges',
          montant: extras.loyerMensuel,
          periodicite: 'Mensuelle',
          date_debut: format(new Date(), 'yyyy-MM-dd'),
          impact_budget: !!extras.loyerBudget,
        });
      } catch (error) {
        if (import.meta.env.DEV) console.error('Loyer non enregistré:', error);
        stepErrors.push("le loyer n'a pas pu être enregistré");
      }
    }

    if (!editingAsset && societeProprietaireId) {
      try {
        await societeService.rattacherBien(societeProprietaireId, savedAsset.id!);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Rattachement à la société échoué:', error);
        stepErrors.push("le bien n'a pas pu être rattaché à la société");
      }
      if (extras?.financeParCredit) {
        toast.info("Crédit de la société : saisissez-le dans Passifs, puis liez-le dans l'onglet Finances de la société.");
      }
    } else if (!editingAsset && extras?.financeParCredit) setCreditAProposer(savedAsset);

    setShowAssetForm(false);
    setEditingAsset(null);

    if (stepErrors.length === 0) {
      toast.success(editingAsset ? 'Actif mis à jour avec succès' : societeProprietaireId ? 'Bien ajouté à la société' : 'Actif créé avec succès');
    } else {
      toast.error(
        `L'actif a bien été enregistré, mais : ${stepErrors.join(' ; ')}. Merci de rouvrir la fiche pour vérifier.`
      );
    }
    if (!editingAsset && societeProprietaireId) retourFicheSociete();
  };

  if (creditEnSaisie) {
    const fermer = () => setCreditEnSaisie(null);
    return (
      <PassifEmpruntForm
        preset={{ nature: natureEmpruntPour(creditEnSaisie.nature), asset_id: creditEnSaisie.id! }}
        onCancel={fermer}
        onSubmit={fermer}
        createEmprunt={createEmprunt}
        updateEmprunt={updateEmprunt}
        createPassif={createPassif}
        updatePassif={updatePassif}
      />
    );
  }

  const propositionCredit = (
    <WizardConfirmDialog
      open={creditAProposer !== null}
      title="Ajouter le crédit de ce bien ?"
      description="Le crédit se saisit dans Passifs, relié à ce bien : il alimente le cashflow, les simulateurs et la transmission. Vous pourrez aussi l'ajouter plus tard depuis Patrimoine → Passifs."
      confirmLabel="Ajouter le crédit"
      cancelLabel="Plus tard"
      onConfirm={() => { setCreditEnSaisie(creditAProposer); setCreditAProposer(null); }}
      onCancel={() => setCreditAProposer(null)}
    />
  );

  if (showAssetForm) {
    const handleCancel = () => {
      setShowAssetForm(false);
      setEditingAsset(null);
      if (societeProprietaireId) retourFicheSociete();
    };

    return (
      <div>
        {editingAsset ? (
          <AssetForm
            asset={editingAsset}
            onSubmit={handleAssetSubmit}
            onCancel={handleCancel}
            empruntsRelies={emprunts.filter((e) => e.asset_id === editingAsset.id)}
            onAjouterCredit={() => setCreditEnSaisie(editingAsset)}
          />
        ) : (
          <AssetCreationWizard
            onSubmit={handleAssetSubmit}
            onCancel={handleCancel}
            societeProprietaire={societeProprietaireId ? societeProprietaire || 'la société' : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <>
    {propositionCredit}
    <PatrimoinePanel
      trail="Actifs"
      title="Actifs"
      summary={assets.length === 0 ? 'Aucun actif renseigné' : `${assets.length} actif${assets.length > 1 ? 's' : ''}`}
      actions={
        <>
          <label className="flex h-8 w-36 cursor-text items-center gap-2 rounded-[2px] border border-border bg-background px-2.5 text-[12.5px] text-muted-foreground transition-colors focus-within:border-foreground hover:border-foreground/40 sm:w-64">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              placeholder="Rechercher un actif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
            />
          </label>
          <AddButton onClick={() => setShowAssetForm(true)}>Ajouter un actif</AddButton>
        </>
      }
    >
      <div className="space-y-6">
      
      <PatrimoineTreeView 
        assets={assets}
        searchQuery={searchQuery}
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
    </PatrimoinePanel>
    </>
  );
};