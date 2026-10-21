import React, { useState, useCallback } from 'react';
import { useModuleSubNav } from '@/hooks/useModuleSubNav';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';
import { Building2 } from 'lucide-react';
import { useImmobilierAssets } from '@/hooks/useImmobilierAssets';
import { ImmobilierPropertyDetailView } from '@/components/immobilier/ImmobilierPropertyDetailView';
import { ImmobilierGestionDialog } from '@/components/immobilier/ImmobilierGestionDialog';
import { ImmobilierOverview } from '@/components/immobilier/ImmobilierOverview';
import { FoncierFoyerSection } from '@/components/immobilier/FoncierFoyerSection';
import { GestionBiensSection } from '@/components/immobilier/GestionBiensSection';
import { MesBiensList } from '@/components/immobilier/MesBiensList';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LMNPDetailView } from '@/components/immobilier/lmnp/LMNPDetailView';
import { PartsFoncieresDetailView } from '@/components/immobilier/parts/PartsFoncieresDetailView';
import { isPartsFoncieres } from '@/lib/immobilier/partsFoncieres';
import { Asset } from '@/services/assetService';

const MEUBLE_NATURES = ['Immeubles locatifs (meublés)'];

export const ImmobilierSection = () => {
  const [activeTab, setActiveTab] = useState('biens');
  const { assets, biensSocietes, emprunts, isLoading, refetch } = useImmobilierAssets();
  const tousLesBiens = [...assets, ...biensSocietes];
  // Biens ouverts mémorisés par identifiant et relus dans `assets` : après une sauvegarde, la fiche
  // reçoit la version rechargée par refetch() (et non une copie figée au moment du clic).
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [gestionDialogOpen, setGestionDialogOpen] = useState(false);
  const [selectedAssetForGestion, setSelectedAssetForGestion] = useState<Asset | null>(null);
  const [lmnpAssetId, setLmnpAssetId] = useState<string | null>(null);
  // Fiche ouverte par « Revenus et charges » : positionnée sur cette section.
  const [focusRevenusCharges, setFocusRevenusCharges] = useState(false);
  const selectedAsset = selectedAssetId ? tousLesBiens.find(a => a.id === selectedAssetId) ?? null : null;
  const lmnpAsset = lmnpAssetId ? tousLesBiens.find(a => a.id === lmnpAssetId) ?? null : null;

  const isMeuble = (asset: Asset) => MEUBLE_NATURES.includes(asset.nature || '');

  const handleManageInfo = useCallback((asset: Asset) => {
    if (isMeuble(asset)) {
      setLmnpAssetId(asset.id ?? null);
    } else {
      setFocusRevenusCharges(false);
      setSelectedAssetId(asset.id ?? null);
    }
  }, []);

  const handleDialogClose = useCallback(() => {
    setSelectedAssetId(null);
  }, []);

  const handleUpdate = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleGestion = useCallback((asset: Asset) => {
    if (isMeuble(asset)) {
      setLmnpAssetId(asset.id ?? null);
    } else if (isPartsFoncieres(asset.nature)) {
      // Pas de fiche détaillée pour les parts foncières : la fenêtre reste.
      setSelectedAssetForGestion(asset);
      setGestionDialogOpen(true);
    } else {
      setFocusRevenusCharges(true);
      setSelectedAssetId(asset.id ?? null);
    }
  }, []);

  const TABS = [
    { id: 'biens', label: 'Vue d\'ensemble' },
    { id: 'valorisation', label: 'Mes biens' },
    { id: 'revenus', label: 'Gestion des biens' }
  ];

  // Changer d'onglet referme la fiche ouverte : sinon elle reste affichée par-dessus l'onglet choisi.
  const handleTabChange = useCallback((tab: string) => {
    setSelectedAssetId(null);
    setLmnpAssetId(null);
    setActiveTab(tab);
  }, []);

  useModuleSubNav(TABS, activeTab, handleTabChange);

  // If LMNP detail view is active, show it
  if (lmnpAsset) {
    return (
      <div>
        <LMNPDetailView
          asset={lmnpAsset}
          emprunts={emprunts}
          onBack={() => setLmnpAssetId(null)}
          onUpdate={handleUpdate}
        />
      </div>
    );
  }

  if (selectedAsset && isPartsFoncieres(selectedAsset.nature)) {
    return (
      <div>
        <PartsFoncieresDetailView asset={selectedAsset} emprunts={emprunts} onBack={handleDialogClose} onUpdate={handleUpdate} />
      </div>
    );
  }

  if (selectedAsset) {
    return (
      <div>
        <ImmobilierPropertyDetailView
          asset={selectedAsset}
          emprunts={emprunts}
          onBack={handleDialogClose}
          onUpdate={handleUpdate}
          focusRevenusCharges={focusRevenusCharges}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'biens':
        // Attendre la liste avant de monter la Vue d'ensemble : sinon elle affiche « Aucun bien
        // immobilier » le temps du premier chargement.
        return isLoading && assets.length === 0
          ? <div className="px-8 py-6"><LoadingSpinner text="Chargement des biens..." /></div>
          : (
            <>
              <ImmobilierOverview assets={assets} emprunts={emprunts} />
              <FoncierFoyerSection emprunts={emprunts} />
            </>
          );
      case 'valorisation':
        return isLoading
          ? <div className="px-8 py-6"><LoadingSpinner text="Chargement des biens..." /></div>
          : (
            <>
              <MesBiensList assets={assets} emprunts={emprunts} isMeuble={isMeuble} onOpen={handleManageInfo} onGestion={handleGestion} />
              {/* Biens détenus par une société du foyer : hors totaux du foyer, qui n'en détient que des parts. */}
              {[...new Set(biensSocietes.map((b) => b.societeDenomination))].map((societe) => (
                <div key={societe} className="border-t border-border">
                  <p className="px-8 pt-6 text-[13px] font-medium">
                    Détenus via {societe} <span className="font-normal text-muted-foreground">· hors totaux du foyer</span>
                  </p>
                  <MesBiensList
                    assets={biensSocietes.filter((b) => b.societeDenomination === societe)}
                    emprunts={emprunts}
                    isMeuble={isMeuble}
                    onOpen={handleManageInfo}
                    onGestion={handleGestion}
                  />
                </div>
              ))}
            </>
          );
      case 'revenus':
        return isLoading
          ? <div className="px-8 py-6"><LoadingSpinner text="Chargement..." /></div>
          : <GestionBiensSection assets={assets} />;
      default:
        return null;
    }
  };

  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? "Vue d'ensemble";
  const summary = isLoading
    ? 'Chargement…'
    : `${assets.length} bien${assets.length > 1 ? 's' : ''} transféré${assets.length > 1 ? 's' : ''} depuis Patrimoine`;

  // Cadre « panneau de travail », sur le modèle de Budget, Patrimoine et Famille : barre d'en-tête
  // (fil d'Ariane), titre 24 px et rappel, puis le contenu bord à bord sous un filet.
  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<Building2 strokeWidth={1.75} />} trail={['Immobilier', tabLabel]} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{tabLabel}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{summary}</p>
      </div>

      <div className="border-t border-border">
        {renderContent()}
      </div>


      <ImmobilierGestionDialog
        asset={selectedAssetForGestion}
        open={gestionDialogOpen}
        onOpenChange={setGestionDialogOpen}
      />
    </div>
  );
};